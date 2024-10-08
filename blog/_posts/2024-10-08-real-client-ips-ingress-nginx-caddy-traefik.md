---
layout: post
title: Get Real Client IPs with Ingress Nginx, Caddy or Traefik
description: Whether you're running a reverse proxy directly on a host, or an Ingress Controller in Kubernetes, you can get the real client IP with inlets.
author: Alex Ellis
tags: load-balancer ingress-controller reverse-proxy proxy-protocol
author_img: alex
image: /images/2024-10-real-ips/background.png
date: 2024-10-08
---

When you're running a reverse proxy directly on a host, or an Ingress Controller in Kubernetes, you can get the real client IP with inlets.

The real client IP address is required for rate-limiting, effective logging, understanding where your users are coming from geographically, and to prevent abuse. Just bear in mind that if you choose to store these addresses within a database, or server logs, you may need to comply with data protection laws like GDPR.

We've covered how Proxy Protocol works before in the original post [Get Real Client IPs with K3s and Traefik](https://inlets.dev/blog/2022/09/02/real-client-ips-with-proxy-protocol.html), so that's a good refresher if you'd like to cover the fundamentals again.

In this post we'll focus on the configuration you need, so you can come back here and copy/paste it when you need it.

## The Inlets Setup

Deploy a host and install the `inlets-pro tcp server`, you can [do this manually](https://docs.inlets.dev/tutorial/manual-tcp-server/) or via cloud-init.

The [inletsctl tool](https://docs.inlets.dev/reference/inletsctl/) can create a host using a cloud provider's API, and pre-install the inlets-pro server for you, with a randomly generated authentication token, and will print out all the details at the end.

Whichever method you take, log into the host, and edit the systemd unit file for inlets-pro, find it via `sudo systemctl cat inlets-pro`.

Add `--proxy-protocol=v2` to the `ExecStart` line, if it's already present with an empty value, update it instead.

The v2 protocol is widely supported and more efficient than v1, since it sends text in a binary format, not in a human-readable format.

This article assumes that you are running the `inlets-pro tcp server` process directly on an Internet-facing host. If you are running it behind a cloud load-balancer, you'll need to add the `--lb-proxy-protocol` flag to the inlets-pro server specifying the protocol version sent by the load-balancer. The rest of the article applies in the same way.

## Real IPs for Caddy

Caddy can be installed quickly, including its systemd unit file, special caddy user, and extra directories with the `arkade system install caddy` command. You can also use a custom build, or run through all the manual steps yourself from the [Caddy documentation](https://caddyserver.com/docs/getting-started).

I've included this section for when you want to run a reverse proxy in a VM, container, or directly on your machine. The other examples are focused on running a reverse proxy in Kubernetes, called an Ingress Controller. For instance, you may be running OpenFaaS via [faasd CE](https://github.com/openfaas/faasd). In that case, Caddy is a quick way to get TLS termination for your OpenFaaS functions, and anything else you are running in your setup like Grafana.

The following settings are for when you run Caddy directly on your own machine, and use an inlets TCP tunnel server to expose it to the Internet, pointing ports 80 and 443 to your Caddy instance.

```
{
    email "webmaster@example.com"

    acme_ca https://acme-v02.api.letsencrypt.org/directory
    http_port 80
    https_port 443

   servers {
     listener_wrappers {
       proxy_protocol {
         timeout 2s
         allow 0.0.0.0/0
       }
      tls
    }
 }
}

orders.example.com {
    reverse_proxy 127.0.0.1:8080
}

```

There are a number of extra settings over a basic Caddyfile for Let's Encrypt, but the main one we need is the `proxy_protocol` listener wrapper.

You'll see I've also included an upstream for `orders.example.com` which is a plain HTTP service running on port 8080. It will receive the real client IP from Caddy, and can read it from the `X-Real-IP` header.


## Real IPs for ingress-nginx

I sent to install ingress-nginx via arkade, with `arkade install ingress-nginx`. This is similar to applying the static YAML that is available in the [project's documentation](https://kubernetes.github.io/ingress-nginx/deploy/).

The [ingress-nginx documentation site](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/#use-proxy-protocol) explains the various settings that can be configured for an installation of ingress-nginx. One of those options is for Proxy Protocol. You don't need to set a version, just set it to `true` and either version will be accepted.

Edit the ConfigMap for ingress-nginx, when installed via arkade, it will be called `ingress-nginx-controller`, so:

```bash
kubectl edit configmap ingress-nginx-controller
```

Within the `data:` section, add:

```diff
data:
+  use-proxy-protocol: "true"
```

There are some additional related headers, which you can customise:

```diff
data:
+  compute-full-forwarded-for: "true"
+  enable-real-ip: "true"
+  proxy-protocol-header-timeout: 1s
+  set-real-ip-from: 0.0.0.0/0
+  use-forwarded-headers: "true"
```

Once updated, the controller will reload its settings and will only accept requests which have a Proxy Protocol header. If you send a request without the header, it will be rejected, so it must only be accessed via the inlets tunnel.

## Real IPs for Traefik

This section was taken [from the original blog post](https://inlets.dev/blog/2022/09/02/real-client-ips-with-proxy-protocol.html). You can refer there for more details.

[Traefik](https://traefik.io) ships with [K3s](https://k3s.io) by default, and is installed into the `kube-system` namespace.

When I create k3s clusters with [k3sup](https://k3sup.dev), I tend to turn off Traefik in order to add ingress-nginx which I find to be simpler, broadly used in production setups, and easier to operate. I just run: `k3sup install --no-extras` to make sure Traefik won't be installed.

If you want to use Traefik, you can do so by editing the deployment:

```bash
kubectl -n kube-system edit deployment traefik
```

Then add the following flags:

```diff
    spec:                             
      containers:                              
      - args:                                                         
+        - --entryPoints.web.proxyProtocol.insecure=true
+        - --entryPoints.web.proxyProtocol.trustedIPs=0.0.0.0/24
+        - --entryPoints.websecure.proxyProtocol.insecure=true
+        - --entrypoints.websecure.http.tls
+        - --entrypoints.web.address=:8000/tcp                
+        - --entrypoints.websecure.address=:8443/tcp
```

I also add `- --accesslog=true` to help find any potential issues with the configuration.

If Traefik doesn't detect the settings immediately, you can restart it with `kubectl rollout restart -n kube-system deployment traefik`.

If you wish to swap Traefik for ingress-nginx, you can run:

```bash
kubectl delete -n kube-system deployment traefik
kubectl delete -n kube-system service traefik
```

## Wrapping up

I wanted this article to be a short and sweet reference for you, on how to configure the most popular reverse proxies to accept the Proxy Protocol header, so that your applications can get the real client IP.

If you're running an alternative Kubernetes Ingress Controller, [Istio Gateway](https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/#proxy-protocol), or a stand-alone proxy, all you need to do after configuring the `inlets-pro tcp server` is to enable the Proxy Protocol support using the appropriate settings.

If you have any questions or suggestions, please feel free to reach out. Whenever you sign up for a subscription for inlets, you'll get an invite to our Discord community. If you signed up some time, ago reach out via the form on the website and we'll get you an invite.

See also:

* [K3sup - install K3s remotely via SSH](https://k3sup.dev)
* [inletsctl - automate cloud hosts for inlets-pro servers](https://inlets.dev/docs/inletsctl/)
* [arkade - Open Source Marketplace For Developer Tools](https://github.com/alexellis/arkade)
* [Caddy - the HTTP/2 web server with automatic HTTPS](https://caddyserver.com)
* [Ingress Nginx - Ingress controller for Kubernetes](https://kubernetes.github.io/ingress-nginx/)
* [Traefik - The Cloud Native Edge Router](https://traefik.io)
