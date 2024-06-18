---
layout: post
title: Get Kubernetes Ingress like Magic
description: "Learn how to expose Ingress from your Kubernetes cluster like magic without having to setup any additional infrastructure."
author: Alex Ellis
tags: kubernetes ingress
author_img: alex
image: /images/2024-06-saas-inlets/background.png
date: 2024-06-18
---

Learn how to expose Ingress from your Kubernetes cluster like magic without having to setup any additional infrastructure.

This post will start with a bit of background information on inlets, why we think now is the right time to offer hosted tunnels, how it works, and then we'll give you a walk-through so you can see if it's for you.

## Introduction to inlets

**Why did we need inlets in 2019?**

I started [Inlets](https://inlets.dev/) in early 2019 as an antidote to the frustrating restrictions of the SaaS-style tunnels of the day like Ngrok and Cloudflare tunnels, and manual port-forwarding that exposed your home address to users.

* So rather than having very poor integration with containers, inlets was born at the height of Cloud Native - with a Kubernetes operator, Helm chart, container image, and multi-arch binary for MacOS, Windows and Linux.
* Rather than having stringent and impractical rate-limits, inlets was designed to be self-hosted meaning you were free of limits.
* Rather than exposing where you lived via your ISP's IP address, you got to mask it with a public IP address from a cloud provider.

**What were the trade-offs?**

So what was the trade-off? You would need to set up a VM somewhere and start the tunnel server on it. To make that as easy as possible, two open-source utilities were created, with support for various cloud platforms:

* [inletsctl](https://github.com/inlets/inletsctl) creates a cloud VM with a public IP address, and the inlets server pre-installed, the command line for the inlets client is printed out after
* [inlets-operator](https://github.com/inlets/inlets-operator) runs inside a Kubernetes cluster, and creates a cloud VM for Kubernetes clusters whenever it detects a service of type LoadBalancer

**Why are you making a SaaS now?**

Making a SaaS for inlets always seemed counter-intuitive, why not use one of the established products? But increasingly, we saw users drawn to the user experience, quality of integration and versatility of inlets. Our team even started to find creative ways to make inlets feel like a SaaS - by using a single VM for multiple different websites, or by setting up inlets tunnel servers on a Kubernetes cluster.

So we've built an extension for inlets that makes it into a SaaS, and have already started using it ourselves. Now we're looking for early users to try it out and provide feedback.

<blockquote class="twitter-tweet" data-conversation="none"><p lang="en" dir="ltr">Just gave this a try to get ingress for my OpenFaaS development gateway running in a private k3d cluster. <a href="https://t.co/05WMFwiPvP">pic.twitter.com/05WMFwiPvP</a></p>&mdash; Han Verstraete (@welteki) <a href="https://twitter.com/welteki/status/1803002720602751210?ref_src=twsrc%5Etfw">June 18, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

## How hosted tunnels (the SaaS) works

The inlets client is run inside your Kubernetes cluster as a Deployment just like self-hosted inlets, the magic comes in with how the tunnel server is managed for you.

![Conceptual architecture for the SaaS](/images/2024-06-saas-inlets/conceptual.jpeg)
> Conceptual architecture for the SaaS

For the initial version of the SaaS, we're offering what we're calling an *Ingress Tunnel*.

An Ingress Tunnel:

* Exposes an Ingress Controller or Istio Gateway to the public internet
* Uses ports 80 and 443
* Supports ACME HTTP01 and DNS01 challenges for Let's Encrypt
* Supports WebSockets, HTTP/2 and gRPC

Each tenant's Ingress Tunnel gets its own dedicated deployment of an inlets tunnel server, which at idle takes up about 3MB of RAM. The tunnel server is a single binary written in Go, and is designed to be very efficient.

You'll need the following:

* A domain under your control
* The ability to create a DNS CNAME entry to our SaaS cluster's public IP address
* A Kubernetes cluster with an Ingress Controller or Istio Gateway

You can use any Ingress Controller, such as ingress-nginx, Traefik, Kong, or an Istio Gateway.

Once you tell us the domain names you want to expose via your *Ingress Tunnel*, we'll provide you with YAML for the tunnel client, which runs inside your cluster.

From there, you can go ahead and use Ingress as if your cluster was being provided by AWS or a similar managed service.

## A quick walk-through

Here's a quick walk-through so you can try out the service. We'll use OpenFaaS Community Edition (CE), along with ingress-nginx and Let's Encrypt. [arkade.dev](https://arkade.dev) will be used to keep the commands simple, but you can use Helm or kubectl if you like to make work for yourself.

We'd suggest going end to end with these instructions before switching over to one of your own services like a Grafana dashboard, or blog, etc.

* Create a Kubernetes cluster, some options:
    * Start one inside Docker with kind or k3d on your machine
    * Setup a VM in your homelab and install k3s with [k3sup](https://k3sup.dev)
    * Flash an SD card with Ubuntu 22.04 or Raspberry Pi OS lite and install k3s with [k3sup](https://k3sup.dev)
* Install the [ingress-nginx](https://github.com/kubernetes/ingress-nginx) via `arkade install ingress-nginx`
* Install cert-manager to obtain certificates via Let's Encrypt with `arkade install cert-manager`

Then, provide us with the list of domains you want to expose i.e. `openfaas.example.com` (replace "example.com" with your own domain).

For each domain name, create a DNS CNAME record to `saas.inlets.dev`.

Check that `nslookup openfaas.example.com` resolves to `saas.inlets.dev`.

We'll then provide you with YAML for the inlets tunnel client, which creates a Deployment, apply it and then check its logs to see if it's connected properly:

```bash
$ kubectl get deploy/alexellis-inlets-client
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
alexellis-inlets-client   1/1     1            1           21h

$ kubectl logs deploy/alexellis-inlets-client
               ___       __  
  __  ______  / (_)___  / /__
 / / / / __ \/ / / __ \/ //_/
/ /_/ / /_/ / / / / / / ,<   
\__,_/ .___/_/_/_/ /_/_/|_|  
    /_/                      

inlets (tm) uplink client: 0.9.21 - b0c7ed2beeb6f244ecac149e3b72eaeb3fb00d23
All rights reserved OpenFaaS Ltd (2023)
time="2024/06/18 10:18:55" level=info msg="Connecting to proxy"
time="2024/06/18 10:18:56" level=info msg="Connection established" client_id=4458bf47cf7a4022834ad42f67307e0d
```

To install OpenFaaS CE, you can use the Helm chart with TLS and Ingress enabled [by following these instructions](https://docs.openfaas.com/reference/tls-openfaas/).

You should see your ingress entry, along with the domain you provided us with:

```sh
kubectl get ingress -n openfaas
NAME               CLASS   HOSTS                 ADDRESS   PORTS     AGE
openfaas-ingress   nginx   openfaas.example.com            80, 443   19h
```

Then, watch for the certificates to be obtained by cert-manger:

```sh
kubectl get certificates -A --watch

NAMESPACE   NAME                    READY   SECRET                  AGE
openfaas    openfaas-gateway-cert   True    openfaas-gateway-cert   19h
```

You can then access OpenFaaS via its UI or CLI, use `arkade info openfaas` for more instructions.

Use `https://openfaas.example.com` for the address for the OpenFaaS gateway, replacing the domain with your own.

## Wrapping up

In a matter of seconds, you can start routing traffic to your Ingress Controller or Istio Gateway without having to set up any additional infrastructure, firewall rules, NAT, or cloud VMs. Just provide us with the DNS names for each website you want to host, create a DNS CNAME record to our public IP address, and our SaaS will take care of the rest.

OpenFaaS CE was chosen for a test application because its chart has built-in options for Ingress and TLS, and it's relatively quick and easy to install. Of course you will have your own applications that you want to expose, and whilst we used one particular option for Ingress, there are many others and they'll all work.

If you'd like to try out an *Ingress Tunnel* that's hosted by the inlets team, then please get in [touch with us via the website](https://inlets.dev/contact) or [reach out to me on X](https://x.com/alexellisuk/status/1802970100791665104).

### Q&A

Q. What does it cost for each *Ingress Tunnel*?

A. The hosted *Ingress Tunnel* will be free during our testing period. You can set up your own self-managed tunnel server at any time, either manually, with [inletsctl](https://github.com/inlets/inletsctl/) or the [inlets-operator](https://github.com/inlets/inlets-operator).

Q. Who gets priority access to Ingress Tunnels?

A. We'll try to keep up with demand, but anyone who is an [existing inlets subscriber](https://inlets.dev/pricing) or who [sponsors me via GitHub](https://github.com/sponsors/alexellis) will get priority access.

Q. What if I want to expose more than one domain?

A. Just tell us the names of each, and we'll configure the Ingress Tunnel for you.

Q. What if I want to expose more than one cluster?

A. That's not a problem, each cluster will get its own tunnel client connection information.

Q. Can I expose a TCP port for a database or another service?

A. Services like MongoDB, Postgresql and NATS can be exposed via a self-managed inlets TCP tunnel server.

Q. How does this compare to Wireguard?

A. Wireguard is a VPN for connecting hosts privately, not for exposing services to the public Internet. Some inlets users use both - for different things.

Q. Can I expose my Raspberry Pi cluster?

A. Yes.

Q. If I run a cluster with KinD or K3d on my laptop, what happens when I go to a cafe?

A. When you shut down Docker, the tunnel will disconnect. It will reconnect when you restart Docker Desktop, whichever network you happen to be using your laptop on.

Q. If I'm already hosting a tunnel server, should I switch to an *Ingress Tunnel*?

A. If you're content with your current setup, feel free to carry on as you are. But you're welcome to test out the SaaS and see if it's a better fit for you.

