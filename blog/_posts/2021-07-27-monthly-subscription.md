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

SaaS-based tunnels like Ngrok and later clones are incredibly cheap to run as a service, and the pricing is a race to the bottom. If you just want a few webhooks, and don't care about privacy, integration, self-hosting and the rate-limits don't get in your way, then it's easy to see why the price is attractive.

inlets PRO was created help developers expose endpoints during development and for self-hosting. Its main difference? It can be self-hosted which means that rate-limits and corporate banning of SaaS tunnels does not affect your productivity. It also works well as a replacement for SSH tunnels and was built with the cloud and containers in mind.

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

Going forward you'll hear us use the term inlets and inlets PRO interchangeably, inlets is a paid, commercial solution for individuals and businesses.

If you have comments, questions or suggestions, you can chat with me and other users on the [OpenFaaS Slack](https://slack.openfaas.io/) in the `#inlets` channel.

You can [try it for free today for 14 days](https://docs.inlets.dev/#/get-started/free-trial?id=get-started-with-your-free-trial), or you can go ahead and [pay month-by-month on Gumroad](https://openfaas.gumroad.com/l/inlets-subscription).

[Maartje](https://twitter.com/MaartjeME) uses inlets PRO to host dozens of side-projects and told me that she saved hundreds of dollars per year. Apparently the savings went on to fund her Raspberry Pi cluster!

<blockquote class="twitter-tweet" data-conversation="none"><p lang="en" dir="ltr">Tunnel starts here <a href="https://t.co/snzQ4dXXlS">pic.twitter.com/snzQ4dXXlS</a></p>&mdash; Maartje Eyskens 😷 (@MaartjeME) <a href="https://twitter.com/MaartjeME/status/1352548143330717696?ref_src=twsrc%5Etfw">January 22, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

