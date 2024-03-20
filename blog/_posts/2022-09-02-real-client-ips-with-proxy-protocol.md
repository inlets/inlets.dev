---
layout: post
title: How To Access Real Client IP Addresses With Proxy Protocol
description: Alex explains the role of Proxy Protocol in tunnels and reverse proxies, with a demo with K3s and inlets TCP tunnels.
author: Alex Ellis
tags: proxy proxyprotocol reverseproxy k3s
author_img: alex
image: /images/2022-traefik/background.png
date: 2022-09-02
---

If you've ever run a reverse proxy, tunnel or load balancer (LB) and wondered why you saw internal IP addresses in your logs, then you're not alone. The plaintext HTTP protocol has a number of "X-Forwarded-*" headers that covers this for proxies which decrypt traffic. But what if you're using TLS, or TCP which works at a lower level in the Open Systems Interconnection model (OSI model)?

That's where Proxy Protocol comes in.

In this article I want to demystify "Proxy Protocol" and show you that you can even implement it yourself with a few lines of Go. I'll show you how to enable it for your inlets TCP tunnel servers and how to configure [K3s](https://k3s.io) with [Traefik](https://traefik.io/traefik/) v2 to publish the real IP address of clients.

![Traefik with inlets Pro](/images/2022-traefik/background.png)

## Introduction

You may have seen Proxy Protocol in the dashboard of your cloud provider, it's an option that many of us can gloss over. That's until we need the source IP address of any clients that connect to our services for rate-limiting, billing, logging and access control.

The [spec for the PROXY protocol](https://www.haproxy.org/download/1.8/doc/proxy-protocol.txt) was written by Willy Tarreau whilst working at HA Proxy.

There are two versions:

1) Version 1 is a plaintext sent before any other data goes over the connection

    `PROXY TCP4 192.168.1.100 237.224.56.164 24712 80`

    The format is: `PROXY, PROTOCOL, CLIENT_IP, NODEBALANCER_IP, CLIENT ORIGIN PORT, NODEBALANCER PORT`

2) Version 2 uses a binary format

    ```
    \r\n\r\n\x00\r\nQUIT\n!\x11\x00\x0c\xach\x11\x05\xcf\xc0D8\xfe\x1e\x04\xd2
    ```

The primary difference is that processing a binary header is more performant and doesn't require manual string parsing.

Here's an example of what it may look like to perform a HTTP request with a Proxy Protocol header in v1 format:

```golang
package main

import (
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
)

func main() {

	upstreamAddr := "127.0.0.1"
	upstreamPort := 3000

	c := http.Client{
		Transport: &http.Transport{
			Dial: func(network, addr string) (net.Conn, error) {

				c, err := net.Dial(network, addr)
				if err != nil {
					return c, err
				}

				local := c.LocalAddr().(*net.TCPAddr)

				_, err = io.WriteString(c, fmt.Sprintf("PROXY TCP4 %s %s %d %d\r\n", local.IP, upstreamAddr, local.Port, upstreamPort))
				if err != nil {
					return c, fmt.Errorf("error writing header: %s", err)
				}
				return c, nil
			},
		},
	}

	req, _ := http.NewRequest(http.MethodGet, "http://192.168.1.14:8888", nil)
	res, err := c.Do(req)
	if err != nil {
		panic(err)
	}
	log.Printf("Status: %d", res.StatusCode)
	if req.Body != nil {
		io.Copy(os.Stdout, req.Body)
		req.Body.Close()
	}
	log.Printf("Headers: %v", res.Header)
}
```

## Tutorial
A user reached out to me asking how he could get real client IP addresses in his K3s cluster with Traefik acting as his ingress controller. It turns out that Traefik is probably one of the hardest reverse proxies to configure, especially when cert-manager is being used.

First I'll show you how to setup a tunnel server and enable Proxy Protocol V2, then we'll continue with K3s and Traefik. If you're using another tool then you can stop before we get that far and look up its specific settings to enable Proxy Protocol since it's not usually on by default.

Set yourself up with the latest version of inletsctl:

```bash
curl -sLS https://get.arkade.dev | sudo sh

arkade get inletsctl
```

## Enable Proxy Protocol V2 for inlets-pro

HTTP tunnel servers can already send "X-Forwarded-" headers, so let's focus on TCP tunnel servers that can be used for a TLS terminating proxy running inside our local network.

We need to create an exit tunnel server in TCP mode.

When I need to customise a tunnel server then I prefer using [DigitalOcean](https://m.do.co/c/8d4e75e9886f) because they send a convenient email with the root password immediately after the tunnel is created. We'll need the password to SSH into the box and customise the settings for the `inlets-pro tcp server` command.

There is a newer, cheaper instance available for 4 USD / mo in certain regions, I'm going to use that by setting `--region` and `--plan`. I learned about the plan from the [DigitalOcean release notes](https://docs.digitalocean.com/release-notes/droplets/).

```
doctl compute size list

Slug                  Memory    VCPUs    Disk    Price Monthly    Price Hourly
s-1vcpu-512mb-10gb    512       1        10      4.00             0.005950
s-1vcpu-1gb           1024      1        25      6.00             0.008930
512mb                 512       1        20      6.00             0.008930
s-1vcpu-1gb-amd       1024      1        25      7.00             0.010420
s-1vcpu-1gb-intel     1024      1        25      7.00             0.010420
```

inletsctl uses a cloud SDK to create a tunnel server pre-configured with inlets-pro as a systemd service, but you can also install inlets-pro manually, if you prefer.

You'll need to pass the latest version of inlets-pro (0.9.8) as a flag to `inletsctl create`.

```bash
inletsctl create --provider digitalocean \
  --access-token-file $HOME/do-access \
  --region ams3 \
  --plan s-1vcpu-512mb-10gb \
  --tcp \
  --inlets-pro-version 0.9.8
```

I've also passed the `--tcp` flag to tell inletsctl to provision a tunnel server running in TCP mode.

Once the server's been created, log in with SSH:

```bash
export IP=""
ssh root@IP
```

Edit `/etc/systemd/system/inlets-pro.service` and add `--proxy-protocol=v2` to the end of the line.

Then restart inlets-pro:

```bash
sudo systemctl daemon-reload
sudo systemctl restart inlets-pro
```

Your inlets TCP tunnel server will now pass long a Proxy Protocol V2 header with the source address of any clients that connect. 

## Install K3sup with Traefik v2

You'll need a few additional tools for this stage:

```bash
arkade get \
    inlets-pro \
    kubectl \ 
    k3sup
```

Now create a single node K3s server on a VM or bare-metal host of your choice. This could be a local multipass VM, a [Linode VM](https://www.linode.com/openfaas?utm_source=openfaas&utm_medium=web&utm_campaign=sponsorship) or [DigitalOcean Droplet](https://m.do.co/c/8d4e75e9886f), or a Raspberry Pi.

We'll use K3sup (installed earlier) to bootstrap K3s over SSH

```bash
export IP=""
export USER=""

ssh-copy-id $USER@$IP

k3sup install \
    --host $IP \
    --user $IP
    --no-extras \
    --context real-k3s \
    --local-path $HOME/.kube/config \
    --merge
```

Since [K3sup](https://k3sup.dev) works over SSH, we'll copy over our SSH key to prevent an interactive password prompt, then we set "no-extras" to prevent K3s from installing the legacy version of Traefik v1.

The `local-path` and `merge` flags create a new context for us to switch into in our existing KUBECONFIG file called `real-k3s`

Install Traefik v2 and cert-manager:

```bash
arkade install traefik
arkade install cert-manager
```

Edit the Traefik deployment:

```bash
kubectl edit -n kube-system deploy/traefik
```

This is what I used under `spec` to make things work (it's a partial snippet, for you to copy/paste):

```yaml
    spec:                             
      containers:                              
      - args:                                                         
        - --global.checknewversion         
        - --entryPoints.web.proxyProtocol.insecure=true
        - --entryPoints.web.proxyProtocol.trustedIPs=0.0.0.0/24
        - --entryPoints.websecure.proxyProtocol.insecure=true
        - --entrypoints.websecure.http.tls
        - --accesslog=true                                            
        - --entrypoints.metrics.address=:9100/tcp
        - --entrypoints.traefik.address=:9000/tcp      
        - --entrypoints.web.address=:8000/tcp                
        - --entrypoints.websecure.address=:8443/tcp
        - --api.dashboard=true                                 
        - --ping=true                                                 
        - --metrics.prometheus=true              
        - --metrics.prometheus.entrypoint=metrics      
        - --providers.kubernetescrd                          
        - --providers.kubernetesingress            
```

Then I created an Issuer for cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-prod
  namespace: default
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: YOU@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - selector: {}
      http01:
        ingress:
          class: traefik
```

Edit the `email` field then apply this configuration to your cluster.

Then I created a sub-domain to map my tunnel server's public IP to the exit-tunnel for the TLS certificate.

* `PUBLIC IP = printip.example.com`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/issuer: letsencrypt-prod
    kubernetes.io/ingress.class: traefik
    service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"
    traefik.ingress.kubernetes.io/frontend-entry-points: https
    traefik.ingress.kubernetes.io/router.entrypoints: web, websecure
    use-proxy-protocol: "true"
  name: printip
spec:
  rules:
  - host: printip.example.com
    http:
      paths:
      - backend:
          service:
            name: printip
            port:
              number: 8080
        path: /
        pathType: Prefix
  tls:
  - hosts:
    - printip.example.com
    secretName: printip-tls
status:
  loadBalancer: {}
```

There's a bit more to do, now edit the Traefik service:

```bash
kubectl edit -n kube-system svc/traefik
```

Change `externalTrafficPolicy: Cluster` to `externalTrafficPolicy: Local`

This instructs [Kubernetes](https://kubernetes.io) to maintain the original source IP address of the traffic.

Finally, create a Kubernetes service and deployment for my printip sample application.

The sample is technically [an OpenFaaS function](https://github.com/openfaas/golang-http-template), but we're going to run it on its own without [OpenFaaS](https://openfaas.com/). OpenFaaS guards you from having to write and maintain all this YAML, which I personally find to be a burden.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    prometheus.io.scrape: "false"
  labels:
    faas_function: printip
  name: printip
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      faas_function: printip
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
    type: RollingUpdate
  template:
    metadata:
      annotations:
        prometheus.io.scrape: "false"
      creationTimestamp: null
      labels:
        faas_function: printip
      name: printip
    spec:
      containers:
      - image: alexellis2/printip:0.0.1
        imagePullPolicy: Always
        livenessProbe:
          failureThreshold: 3
          httpGet:
            path: /_/health
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 2
          periodSeconds: 2
          successThreshold: 1
          timeoutSeconds: 1
        name: printip
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        readinessProbe:
          failureThreshold: 3
          httpGet:
            path: /_/health
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 2
          periodSeconds: 2
          successThreshold: 1
          timeoutSeconds: 1
        resources: {}
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: false
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      enableServiceLinks: false
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status: {}
```

Here's the service:

```yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    prometheus.io.scrape: "false"
  name: printip
  namespace: openfaas-fn
spec:
  internalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - name: http
    port: 8080
    protocol: TCP
    targetPort: 8080
  selector:
    faas_function: printip
  sessionAffinity: None
  type: ClusterIP
status:
  loadBalancer: {}
```

You can find the source code for the function plus the Kubernetes YAML manifests on GitHub: [inlets/printip](https://github.com/inlets/printip)

## Deploy the inlets client

There are various ways to deploy an inlets client through a [Helm chart or Kubernetes operator](https://docs.inlets.dev/), but since there is a container image, it's relatively simple to write YAML for this purpose.

The [inlets-operator](https://github.com/inlets/inlets-operator) would normally forward traffic to the hostname of the service in Kubernetes such as `traefik.kube-system:443`, however Proxy Protocol requires an IP address, instead of a hostname for the destination for the traffic.

Save the following file and edit the `args` section with your TUNNEL_SERVER_PUBLIC_IP, TUNNEL_SERVER_TOKEN, `TRAEFIK_SERVICE_IP` and LICENSE. Keep the ports the same, since we'll need port 80 to server the [HTTP01 ACME challenge](https://letsencrypt.org/docs/challenge-types/) and 443 to serve traffic over TLS to our users.

Replace `TRAEFIK_SERVICE_IP` with the IP address show via: `kubectl get svc -n kube-system`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
  name: inlets-client
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: inlets-client
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: inlets-client
    spec:
      containers:
      - args:
        - tcp
        - client
        - --url=wss://TUNNEL_SERVER_PUBLIC_IP:8123
        - --ports=80,443
        - --token=TUNNEL_SERVER_TOKEN
        - --license=LICENSE
        - --upstream=TRAEFIK_SERVICE_IP
        command:
        - inlets-pro
        image: ghcr.io/inlets/inlets-pro:0.9.8
        imagePullPolicy: IfNotPresent
        name: inlets-client
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
status: {}
```

## Test it out

I used a domain of `printip.o6s.io` (o6s stands for OpenFaaS, like k8s stands for Kubernetes)

Try to visit the website with HTTP, then with HTTPS:

```bash
$ curl -i -sLS http://printip.o6s.io ; echo

HTTP/1.1 200 OK
Content-Length: 13
Content-Type: text/plain; charset=utf-8
Date: Fri, 02 Sep 2022 11:53:00 GMT
X-Duration-Seconds: 0.001763

237.224.56.164

$ curl -i -sLS https://printip.o6s.io ; echo

HTTP/2 200 
content-type: text/plain; charset=utf-8
date: Fri, 02 Sep 2022 11:52:25 GMT
x-duration-seconds: 0.003149
content-length: 13

237.224.56.164
```

As you can see, the Pod running inside Kubernetes returned the correct IP address of my home internet connection, which I've redacted in this post to `237.224.56.164`.

The settings we used for Traefik also show the two connections in the logs, one with HTTP/1.1 (port 80) and then with an upgrade to HTTP/2.0 (port 443).

```bash
kubectl logs -n kube-system deploy/traefik -f

237.224.56.164 - - [02/Sep/2022:11:53:00 +0000] "GET / HTTP/1.1" 200 13 "-" "-" 2121 "printip-openfaas-fn-printip-o6s-io@kubernetes" "http://10.42.0.36:8080" 6ms

237.224.56.164 - - [02/Sep/2022:11:52:25 +0000] "GET / HTTP/2.0" 200 13 "-" "-" 2104 "websecure-printip-openfaas-fn-printip-o6s-io@kubernetes" "http://10.42.0.36:8080" 8ms
```

## Wrapping up

I wrote this article because a user reached out to me asking for source IPs for his K3s cluster. Initially, I didn't think it would be possible, but once I'd demystified Proxy Protocol and did some testing, I figured out how to bring it to inlets.

So I wanted to show you that Proxy Protocol isn't complicated to understand, and whilst it may be convenient, you don't even need a third party library to write a header out when using a language like Go.

Then we set up a TCP tunnel server, logged in and enabled the Proxy Protocol V2 through the `--proxy-protocol=v2` flag.

Finally, we went through the various steps required to set up Traefik to use Proxy Protocol on K3s.

I suspect that configuring ingress-nginx may be a lot simpler, see also: [Ingress Nginx ConfigMaps](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/#use-proxy-protocol)

Before setting up K3s, I also tested Nginx running on my local machine, and with some additional configuration in the `http` and `server` block, managed to get it to print out the real source IP address for tunneled HTTP calls. You can find out how here: [Nginx: Accepting the PROXY Protocol](https://docs.nginx.com/nginx/admin-guide/load-balancer/using-proxy-protocol/)

Would you like to talk to us about Cloud Native tunnels? [Contact us here](/contact)
