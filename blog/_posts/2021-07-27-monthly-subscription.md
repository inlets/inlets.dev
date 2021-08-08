---
layout: post
title: Introducing the inlets monthly subscription
description: You can now pay for inlets PRO on a monthly basis - learn the use-cases and how it compares to other solutions.
author: Alex Ellis
tags: inlets-pro secure private loadbalancer comparison announcement
author_img: alex
image: /images/2020-11-ipv6-proxy/top.jpg
date: 2021-07-27
---

## Introduction

You asked for a monthly subscription for inlets, we listened. Learn what you can use it for and how it compares to other solutions like managed tunnels from Ngrok.

Now, if you're operating a business and using inlets, it's likely that this is something that will be part of your core infrastructure, for some time. It's also less likely that paying up front for a static license is going to be a problem.

You can read a case-study from a business customer here: [How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html)

Businesses tend to use inlets PRO as a replacement for a VPN like OpenVPN or Wireguard, they also find it works well deployed within a Kubernetes cluster.

So why would an individual developer want a tunnel and how does it differ from the alternatives? As a personal user, you're either using inlets PRO at home, or you're using at at work which is [allowed within the terms of a personal license](https://inlets.dev/pricing).

## Why would I want a tunnel?

![Webhook example with Inlets](https://blog.alexellis.io/content/images/2019/09/inletsio--2-.png)

* Receiving webhooks during development
* Hosting personal projects and websites.
* Remote access to services like RDP, VNC, SSH - i.e. a Raspberry Pi or home server
* Sharing work or a blog post draft with a client or colleague.
* To get a static IP when you're behind NAT, have a dynamic IP, or when ports are blocked.
* Exposing a self-hosted service from a Kubernetes cluster for development and testing.
* Exposing dashboards or services from your Raspberry Pi.

## Differences vs. Ngrok

ngrok was founded by Alan Shreve in 2015, and since then many similar services have appeared. The concept is simple, but powerful: you have service running on your laptop and want a public address for it. Why? For remote access or for testing.

I was an Ngrok user myself, but in 2019 after running into various limitations and frustrations, decided to create a new self-hosted option. The main differences are that Ngrok is a SaaS service and inlets is self-hosted. Ngrok is mainly about exposing a local service on the Internet, but inlets can also act like a VPN or site-to-site uplink.

If you just want to receive a few webhooks and the rate limits don't get in your way, then Ngrok may be the fastest solution. However, a SaaS is a shared environment and does not provide a completely private or isolated path for your confidential data. Ngrok was built in a a different time and for a different community, so there isn't a Kubernetes or Docker integration either. Most of the time it is blocked when connected to a corporate VPN, or working at the office on the corporate network.

inlets can also be used to expose local endpoints during development and for self-hosting, but what are its main differences?

### Never banned

Ngrok tends to be blanket-banned on all corporate VPNs. The domain `*.ngrok.io` gets added to a blacklist and it's game over.

inlets PRO tunnels are self-hosted, either on a cloud's free tier, on a service like Fly.io or on a VM that will only cost you 5 USD / month.

* [Provision a tunnel whenever you need it with inletsctl](https://github.com/inlets/inletsctl)
* [Host three tunnels on fly.io](https://inlets.dev/blog/2021/07/07/inlets-fly-tutorial.html)

Oracle and GCP also offer a free tier for VMs, so you can run your exit-server there if you want to save on costs.

You can run the client or server on MacOS, Windows or Linux - even on a Raspberry Pi, as a Docker container and as a Kubernetes Pod. Did you get disconnected? Don't worry, it will reconnect as soon as it can.

### Never rate-limited

You can push your HTTP or TCP tunnel as hard as you want. You can share the URL for your self-hosted blog on Hacker News and nobody will notice the difference.

Try that with Ngrok, and after your first 40 connections, you'll hit the rate limits. Even when you pay for the product, you're still limited to 60-120 connections per minute depending on the plan.

This was an important problem to solve when I first set out to build inlets in 2019 and remains a reason why inlets PRO is something *that you can self-host*.

### Best in class Kubernetes integration

Ngrok has no Kubernetes integration

inlets PRO has a built-in integration for Kubernetes LoadBalancers, so you get the same experience as when you're on a public Kubernetes engine like AWS EKS or GKE.

* [Check out the inlets-operator](https://github.com/inlets/inlets-operator)

Having a tunnel created automatically may not suit your needs, so we also have a helm chart: [Fixing Ingress for short-lived local Kubernetes clusters](https://inlets.dev/blog/2021/07/08/short-lived-clusters.html)

Tunnels can also be used for multi-cluster monitoring and deployment:

* [How to monitor multi-cloud Kubernetes with Prometheus and Grafana](https://inlets.dev/blog/2020/12/15/multi-cluster-monitoring.html)
* [Learn how to manage apps across private Kubernetes clusters](https://inlets.dev/blog/2021/06/02/argocd-private-clusters.html)

If you run a SaaS, this approach can be used to connect each of your clients back to your control plane for billing, metering or support.

Unlike Ngrok, we are not just dealing with exposing services on the Internet. inlets PRO can be used for local tunnels too, so that you can debug problems within your Kubernetes cluster.

Learn how a developer at the UK Government bought a license to help him debug an issue in staging with a NATS queue: [Reliable local port-forwarding from Kubernetes](https://inlets.dev/blog/2021/04/13/local-port-forwarding-kubernetes.html)

How do you know it's been done right? This is all maintained by a CNCF Ambassador and the maintainer of [OpenFaaS](https://www.openfaas.com/), a complex distributed system for running serverless functions on Kubernetes.

### Whatever ports you want

When you expose a TCP port with Ngrok like SSH, you'll get allocated a random TCP port on one of their servers.

With inlets PRO you can get an unlimited number of TCP ports, and whichever ones you like including: 80, 443 which means you can run a reverse proxy at home or on your laptop.

* [Remote access to SSH](https://docs.inlets.dev/#/get-started/quickstart-tcp-ssh)
* [Host multiple sites with Caddy v2](https://docs.inlets.dev/#/get-started/quickstart-http)
* [Expose Your IngressController and get TLS from LetsEncrypt and cert-manager](https://docs.inlets.dev/#/get-started/quickstart-ingresscontroller-cert-manager?id=quick-start-expose-your-ingresscontroller-and-get-tls-from-letsencrypt-and-cert-manager)

### Your DNS

Cloudflare's Argo tunnel product can also get you a tunnel, but you will be locked into their DNS plan and bandwidth charges.

By self-hosting a tunnel with inlets PRO instead of using a SaaS service, you can run that wherever you like and use your own DNS. Developer clouds like DigitalOcean/Linode offer around 1TB of transfer for free each month for each VM, and Hetzner Cloud offers around double that.

You can expose unlimited domains and unlimited websites all over a single tunnel with inlets PRO.

### Always private

Finally, whenever you use a SaaS tunnel, you are putting your data in the hands of another company. Self-hosting means that you do not need to worry about whether your data is being kept private, whether that company will be hacked and have their server logs or user database published on an Internet forum.

### Contribute and make it better

The tooling, tutorials and blog posts for inlets PRO are all open-source and contributions are encouraged.

* [inlets/inletsctl](https://github.com/inlets/inletsctl) - provision one-off tunnel servers to various clouds
* [inlets/inlets-operator](https://github.com/inlets/inlets-operator) - automated LoadBalancers for Kubernetes using tunnels
* [Helm charts](https://github.com/inlets/inlets-pro/tree/master/chart) - Kubernetes helm charts for inlets-pro

I'd like to thanks [Johan Siebens](https://twitter.com/nosceon) for his guest blog posts and [Engin Diri](https://twitter.com/_ediri) for his help adding new cloud provisioners.

## Wrapping up

So do individuals like you or me actually buy and pay for inlets PRO? Yes, you can find individual stories on the [inlets homepage](https://inlets.dev/).

Going forward you'll hear us use the term inlets and inlets PRO interchangeably, inlets is a paid, commercial solution for individuals and businesses. The inlets subscription can be paid for on a monthly or yearly basis, the yearly options come with a discount that increases with the amount of licenses you need.

If you have comments, questions or suggestions, you can chat with me and other users on the [OpenFaaS Slack](https://slack.openfaas.io/) in the `#inlets` channel.

Our monthly subscription gives you the ability to try things out before moving to a yearly plan to enjoy a discount. Check out [the plans on Gumroad](https://openfaas.gumroad.com/l/inlets-subscription).

[Miles Kane](https://twitter.com/milsman2) uses inlets PRO to get access to his own services running on a HA K3s cluster built with Raspberry Pis.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr"><a href="https://twitter.com/alexellisuk?ref_src=twsrc%5Etfw">@alexellisuk</a> 3 nodes <a href="https://twitter.com/Raspberry_Pi?ref_src=twsrc%5Etfw">@Raspberry_Pi</a> <a href="https://twitter.com/HAProxy?ref_src=twsrc%5Etfw">@HAProxy</a> <a href="https://twitter.com/keepalived?ref_src=twsrc%5Etfw">@keepalived</a> 3 nodes <a href="https://twitter.com/kubernetesio?ref_src=twsrc%5Etfw">@kubernetesio</a> <a href="https://twitter.com/hashtag/k3sup?src=hash&amp;ref_src=twsrc%5Etfw">#k3sup</a> <a href="https://twitter.com/hashtag/master?src=hash&amp;ref_src=twsrc%5Etfw">#master</a> <a href="https://twitter.com/hashtag/embedded?src=hash&amp;ref_src=twsrc%5Etfw">#embedded</a> <a href="https://twitter.com/hashtag/etcd?src=hash&amp;ref_src=twsrc%5Etfw">#etcd</a> 3 nodes workers. <a href="https://twitter.com/nginx?ref_src=twsrc%5Etfw">@nginx</a> <a href="https://twitter.com/hashtag/Kubernetes?src=hash&amp;ref_src=twsrc%5Etfw">#Kubernetes</a> <a href="https://twitter.com/hashtag/ingress?src=hash&amp;ref_src=twsrc%5Etfw">#ingress</a> and <a href="https://twitter.com/inletsdev?ref_src=twsrc%5Etfw">@inletsdev</a> <a href="https://twitter.com/hashtag/pro?src=hash&amp;ref_src=twsrc%5Etfw">#pro</a> <a href="https://twitter.com/hashtag/operator?src=hash&amp;ref_src=twsrc%5Etfw">#operator</a> <a href="https://t.co/FNTMIDClpC">pic.twitter.com/FNTMIDClpC</a></p>&mdash; milsman2 (@milsman2) <a href="https://twitter.com/milsman2/status/1417672558183333893?ref_src=twsrc%5Etfw">July 21, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

