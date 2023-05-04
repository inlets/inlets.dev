---
layout: post
title: Expose local TCP ports to the Internet with inlets
description: "Inlets can help you expose TCP ports where SaaS tunnels often just can't cut it."
author: Alex Ellis
tags: tcp expose tunnels ssh remoteaccess
author_img: alex
image: /images/2023-05-tcp/background.png
date: 2023-05-04
---

Inlets can help you expose TCP ports where SaaS tunnels often just can't cut it.

Learn how to expose your local TCP ports with inlets - directly from your own machine, from in a container or a Kubernetes Pod.

## Why do we want to expose TCP ports?

Recently I've had a few emails from new inlets users telling me that they bought a personal subscription for inlets to tunnel TCP traffic due to issues with low-cost or free SaaS solutions like Cloudflare and Ngrok.

Whilst there will always free alternatives - they often involve investing more of your time in the long run. Ultimately, for 10 USD / mo per tunnel, the people that got in touch with me realised that there was a lot of value in the personal license and just getting the job done.

The personal license comes with support for two tunnel clients - but unlike a SaaS tunnel, you get unlimited bandwidth, connections and TCP ports.

But why would you want to expose TCP?

One user told me that he was hosting MongoDB within Kubernetes inside WSL 2 and wanted to expose it to a number of hosted services like Grafana.com for monitoring and other tools for backup and management.

![Exposing mongodb via a GCP VM in the free tier](/images/2023-05-tcp/mongodb.png)
> Exposing mongodb via a GCP VM in the free tier

Another told me that he just wanted to expose port 443 and 80 from his machine so he could expose a reverse proxy like Nginx, Caddy or Traefik.

Then someone else told me they really wanted to expose SSH from a private Raspberry Pi, so that they could log in from anywhere.

The good news is that all of these use-cases are supported, and whilst some SaaS tunnel products have options for TCP, they're often very limited.

There may be some cross-over here with a VPN, however VPNs are made for connecting subnets or hosts together, for private access, not for making things available on the Internet.

Let's look at an example? [Han](https://github.com/welteki) who is one of the contributors to inlets told me that his ZeroTier VPN failed over a mobile hotspot, but inlets worked perfectly and allowed him to access his machines remotely via SSH.

## How to expose a TCP port

The first difference you'll find with inlets vs. a SaaS product is that you create the tunnel server in your own cloud account.

The benefits are - unlimited connections, unlimited rate-limit, unlimited domains, unlimited high-quality TCP ports - like 22, 80, 443, etc. There is no need to work around being allocated random TCP ports or random high port numbers. SaaS companies resort to these lengths because they are trying to maximise their profit margin.

It's very easy to land on a network or hotspot where Ngrok has been completely banned, but with inlets, the traffic goes over a websocket, to a tunnel server that you've created yourself. So it's unlikely it'll ever get banned by an overly cautious network administrator.

The inlets tunnel server is usually created via automation with a tool we'll mention below, then the client can be run however you like - on Windows, MacOS, Linux - or even in a container or Kubernetes Pod.

On a server, run the following:

```bash
inlets-pro tcp server \
    --auto-tls-san $IP \
    --token $TOKEN
```

On a client, provide the upstream host you want to expose and any ports - multiple can be specified:

```bash
inlets-pro tcp client \
    --url wss://$IP:8123 \
    --token $TOKEN \
    --upstream 192.168.2.100 \
    --ports 2222,80,443
```

Once the client is connected, the above ports will be opened on the server's network adapters, meaning any client that connects to port 22, 80, or 443 will have their traffic sent on to the client as if it were on the Internet.

## Free tier and low cost tunnel servers

There are several places where you can run a tunnel server entirely for free:

* Amazon EC2 - within the free tier
* Google GCE - within the free tier
* Oracle Cloud (OCI) - again - within the free tier
* [Fly.io](https://inlets.dev/blog/2021/07/07/inlets-fly-tutorial.html) - host up to three tunnel servers for free

But you may already have a preferred cloud like Hetzner, Linode or DigitalOcean. You only need to provision the smallest VM available at 5-6 USD / mo and you'll be all set.

## Automation for tunnel servers

For Kubernetes users, simply install the [inlets-operator](https://docs.inlets.dev/reference/inlets-operator/) and configure it with a cloud API token. Then, any LoadBalancer service will be exposed by creating a new tunnel VM. The most efficient way to expose services is to use an IngressController like Nginx.

By default - any LoadBalancer service will be exposed, but you can also change the mode during installation to only work on services which you've annotated. This is handy if you also use another product like MetalLB or kube-vip in the cluster.

If you're running a service directly on your machine or in a VM, then you can use the [inletsctl](https://docs.inlets.dev/reference/inletsctl/) CLI to create a tunnel server on your favourite cloud.

The VMs are created via API using a user-data script that installs and configures the inlets-pro server binary. After which, you'll have very little reason to ever log into the machine or to maintain it.

Examples:

* [Expose a private SSH server over a TCP tunnel](https://docs.inlets.dev/tutorial/ssh-tcp-tunnel/) - note that port 22 is usually taken on the remote server, so we add an extra port on our local server of 2222 and expose that
* [Custom reverse proxy with Caddy](https://docs.inlets.dev/tutorial/caddy-http-tunnel/) - this is identical for Nginx, Traefik or any other reverse proxy
* [Tutorial: Tunnel a private Postgresql database](https://docs.inlets.dev/tutorial/postgresql-tcp-tunnel/)

Kubernetes examples:

* [Expose an IngressController from Kubernetes](https://docs.inlets.dev/tutorial/kubernetes-ingress/)
* [Expose the Kubernetes API server](https://docs.inlets.dev/tutorial/kubernetes-api-server/) - in order to run kubectl from anywhere
* [inlets-operator on GitHub](https://github.com/inlets/inlets-operator) - open source controller for Kubernetes - contributions are welcome

Of course, you can also set up your tunnel server by hand and we [have a tutorial for that](https://docs.inlets.dev/tutorial/manual-http-server/). But we think that the automation provided by inletsctl and inlets-operator just makes life easier.

## What if you just want HTTPS?

So we've covered the TCP use-case, which SaaS tunnels don't do very well.

What if you have one or more HTTPS endpoints that you want to tunnel out to the Internet?

[Richard Case](https://github.com/richardcase), Principal Engineer at SUSE told me he bought a personal license for inlets because he wanted to see if inlets could help him with working on Rancher. He'd already given up on Ngrok, because whilst he was paying 10 USD / mo - he could only have one tunnel agent running!

Richard has two different private clusters running inside KinD - they need to connect back to his central cluster in order to be managed by Rancher, and he didn't have a good way to do that.

I told him to create a single HTTP tunnel server for two custom sub-domains and to then connect two different clients to it. He told me that it's been working really well for him and he picked Google Cloud for hosting the VM.

If you want to expose one or more sub-domains over a single tunnel server then I wrote a blog post on this recently that should give you everything you need to know.

[Automate a self-hosted HTTPS tunnel in less than 5 minutes without any limits](https://inlets.dev/blog/2022/11/16/automate-a-self-hosted-https-tunnel.html)

Since Richard wanted to run the inlets client inside Kubernetes, we added a new feature that can generate the YAML for a Kubernetes Pod.

Today you can already generate a systemd service for a TCP or HTTP client by adding the flag `--generate=systemd`, and now thanks to understanding this use-case better, we were able to add `--generate=k8s_yaml` to inlets too.

He ran this, and applied it to the first private cluster:

```bash
inlets-pro http client \
    --url wss://$URL \
    --upstream cluster1.example.com=http://kubernetes.svc.default:6443 \
    --token $TOKEN \
    --generate k8s_yaml

kubectx private-cluster-1
kubectl apply tunnel1.yaml
```

Then for the second cluster, just changed the `--upstream` flag to point to the second cluster.

```bash
inlets-pro http client \
    --url wss://$URL \
    --upstream cluster2.example.com=http://kubernetes.svc.default:6443 \
    --token $TOKEN \
    --generate k8s_yaml > tunnel2.yaml

kubectx private-cluster-2
kubectl apply tunnel2.yaml
```

He then set up Rancher to point to the two children clusters via their new subdomains: `cluster1.example.com` and `cluster2.example.com`.

We're always making inlets better and keen to get your feedback.

Whilst working with Richard, he told us that inletsctl was creating VMs with a public IP address that was ephemeral - so it could change during the lifetime of the tunnel. Within a couple of days, we'd merged a PR into the open source provisioning library that switches to using a reserved IP address instead. [view the patch on GitHub](https://github.com/inlets/cloud-provision/commit/5d460da00ba7a516b33fefbf669b615dba0eeaab).

## Need a hand getting started?

Unlike with a SaaS tunnel product - inlets is much more versatile, but that also means that you may benefit from being pointed at the right tutorial for your use-case.

You can browse the [docs](https://docs.inlets.dev/) and [blog](https://inlets.dev/blog), but feel free to reach out via our [contact form](https://inlets.dev/contact/)

Pricing is very competitive vs. SaaS solutions, with two tunnels included by default and the option to add more - hosted options only allow you to purchase one tunnel, or force you to upgrade to a higher tier. Bear in mind that our annual pricing has a saving of around 5 USD / mo vs paying monthly and you can switch at any time.

* [Get started with a free trial](https://inlets.dev/pricing/)
