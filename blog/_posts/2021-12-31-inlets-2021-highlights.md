---
layout: post
title: My Highlights of Inlets from 2021
description: Learn my top five highlights of inlets in 2021, from features to use-cases to a new subscription business model.
author: Alex Ellis
tags: review inlets secure private tunnels
author_img: alex
image: /images/2021-highlights/background.jpg
date: 2021-12-31
---

Did you know that Inlets was first released in January 2019? That means it's coming up for its third birthday. 

> Happy 3rd Birthday Inlets! 🎂😀💻

In this short article, I'll cover the use-case and origin story for inlets before going on to cover highlights *of the past year*. These include a new business model, Prometheus monitoring and automated TLS with Let's Encrypt for HTTPS tunnels.

## Who needs a tunnel anyway?

For a very long time, I was able to get by with the limitations of SaaS-based tunnels, which were largely free or very low cost. You just can't beat the convenience of typing in one command and having someone else do everything for you.

A SaaS business model often has a low price point, but comes with trade-offs:

* Aggressive rate-limiting
* Shared, non-private infrastructure
* Limited documentation, lack of support or community
* Limited integration and options for automation

For me, in late 2018, I just needed a tunnel that would work on a corporate VPN and the best known developer tunnel was blocked by domain. That's the problem with a SaaS - because it uses a well-known domain, IT can just block it entirely. But my team needed webhooks, and more than that - they needed webhooks to a Kubernetes service, that they were developing locally.

* A VPN wouldn't work because of the corporate VPN's restrictions. 
* Outgoing SSH was blocked
* Common tunnels were blanket banned

And even if they would have worked, there were no container images available for them, and no Kubernetes integration.

Inlets is written in Go, which makes it easy to cross compile to various Operating Systems, CPUs and to package it in containers. It doesn't need any elevated privileges and is easy to automate because it runs in userspace and is self-contained within a single binary.

## Inlets top five

One of my top five was adding the status command and Prometheus metrics. I used the chapter from my [eBook Everyday Go](https://gumroad.com/l/everyday-golang) as a starting point.

![Adding metrics support to inlets](/images/2021-highlights/background.jpg)
> Adding metrics and observability support to inlets for customers to monitor their tunnels 

### 1. New docs and better positioning

Inlets was a project that evolved into a product and over the two years, as new features were added, I wrote blog posts to explain how to use them. Then [Nathan Peck](https://twitter.com/nathankpeck/) from AWS got in touch. He wanted to gain access to his Raspberry Pi cluster running ECS Anywhere, but he explained that performance was poor because the VPN software was locking up the CPU with interrupts. Around this time, he also explained how he felt the documentation was disjointed and the messaging wasn't clear about its unique selling points.

I spent a lot of time reading [1-Page Marketing Plan by Alan Dibb](https://amzn.to/3zrgfwB) and [Obviously Awesome: How to Nail Product Positioning so Customers Get It, Buy It, Love It by April Dunford](https://amzn.to/32NIDN8). So many developers fear and loathe the term marketing, often out of a lack of understanding. These two books help you understand what your product is about, who your customers are and how to position it to them.

> Inlets reinvents the concept of a tunnel for a Cloud Native world.

That's what I came up with. Inlets was always called a "Cloud Native tunnel", but I think it was lost on people.

A VPN often needs unwieldy `NET_CAP_ADMIN` privileges, or access to the Kernel in the case of Wireguard. They are rarely self-sufficient and need to rely on other tools like iptables or ipvs to get their jobs done, especially if you want to build a tunnel like we do.

Inlets on the other hand is a single binary, available as a binary for Windows, MacOS (including M1), Linux and as a container image. We've also got helm charts and an operator for you, so that you can expose a local LoadBalancer to the internet.

The advent of a new generation of VPN tooling has caused much confusion. A VPN is a different use-case, requires much broader permissions and at its core is about connecting entire networks at a low-level. Inlets is about connecting applications - TCP and HTTP endpoints to other networks, or exposing them on the Internet. It's lightweight and every easy to automate because it runs in user-space as a static binary.

The [new inlets FAQ](https://inlets.dev/blog/2021/07/22/riskfuel.html) sets out to address some of the questions that you may have if your first response to hearing about inlets is: "What about X VPN?"

* [Browse the docs](https://docs.inlets.dev/)
* [Read Nathan's blog post on inlets + ECS Anywhere](https://twitter.com/nathankpeck/status/1438554379355832322?s=20)

### 2. Automated TLS with Let's Encrypt

In the earliest versions of inlets, if you wanted TLS for the websites you were exposing, you needed to configure a reverse proxy like Nginx, Caddy or Traefik on your HTTP tunnel server, or direct ports 80 and 443 to a local instance of those tools running on your private network.

The automated TLS support meant that you could get even closer to the "SaaS-style" experience of just running one command to get a tunnel with HTTPs and a custom domain.

The tutorial [Setting up a HTTP tunnel server manually](https://docs.inlets.dev/tutorial/manual-http-server/) probably explains it best, and there's also an automated guide for it here: [Automated HTTP tunnel server](https://docs.inlets.dev/tutorial/automated-http-server/)

Inlets also supports TCP tunnels for exposing things like Ingress Controllers, Reverse Proxies, gRPC APIs, SSH and databases. Learn more with a tutorial: [Expose a private SSH server over a TCP tunnel¶](https://docs.inlets.dev/tutorial/ssh-tcp-tunnel/)

> A contractor in the US contacted me and told me that [Starlink](https://www.starlink.com/) does not offer static IP addresses. He wanted to remotely access security systems for customers. The "Automated HTTP tunnel server" tutorial can be used to get as many public IP addresses as you need, or to multiplex many different websites over a single tunnel.

### 3. Local port forwarding

The core use-case for inlets was to publish a local service on a remote network, i.e. the Internet. So that my team could receive webhooks into a Kubernetes service and test the CI/CD project we were working on. Or, if you were self-hosting a website with Nginx, to be able to expose that with a public domain name and TLS certificate from your private network.

Local port forwarding is the opposite use-case. There's one or more services on a remote network space that you want to bring back to localhost, to access it from your machine.

> A developer working on an API for the UK Government reached out to me and asked if he could use inlets to access a NATS message queue from within a Google Kubernetes Engine (GKE) cluster on his laptop. The answer was yes inlets Pro could do that, but we hadn’t documented it very well yet. My understanding was that getting access to the message queue from his laptop meant that he could watch things happening “live” and fix a bug that was blocking his progress at work.

Read more: [Reliable local port-forwarding from Kubernetes](/blog/2021/04/13/local-port-forwarding-kubernetes.html)

### 4. In-depth monitoring and metrics

One of the other pieces of feedback I got from Nathan was that he missed seeing a "status" command, to see how many clients were connected to his server and for how long. I worked on this feature in-tandem with Prometheus metrics, as a corporate customer had reached out asking how they could monitor their tunnels for reliability.

Here's an example of the status command with a TCP tunnel server:

```bash
$ inlets-pro status \
  --url wss://178.62.70.130:8123 \
  --token "$TOKEN" \
  --auto-tls

Querying server status. Version DEV - unknown
Hostname: unruffled-banzai4
Started: 49 minutes
Mode: tcp
Version:        0.8.9-rc1

Client ID                         Remote Address        Connected    Upstreams
730aa1bb96474cbc9f7e76c135e81da8  81.99.136.188:58102   15 minutes   localhost:443, localhost:80
22fbfe123c884e8284ee0da3680c1311  81.99.136.188:64018   6 minutes    localhost:443, localhost:80
```

The Prometheus metrics answer specific questions about reliability to help customers operate inlets as a service. How much is this tunnel being used? How many times has the client restarted? How much data was transferred?

Whenever you deploy a HTTP tunnel, you'll get automated Rate, Error and Duration (RED) metrics for your tunneled services, without having to do any further work. So inlets could be useful for troubleshooting.

* Read more: [Measure and monitor your inlets tunnels](https://inlets.dev/blog/2021/08/18/measure-and-monitor.html)

### 5. The subscription business model and personal licenses

A user from the community suggested looking at JetBrains' model for allowing individual customers to use their licenses at work, as long as they paid with their own money, so I made that change. I've noticed some people abusing this, but I want to trust users to do the right thing.

The subscription plans added in July increased adoption with individual developers. I kept hearing from developers that they wanted to pay on a monthly basis for their licenses instead of for a year up front. It's the same amount of money, or in some cases cheaper to pay for a year and also less to think about. It was relatively easy to integrate with Gumroad's membership feature and license server, and within a couple of weeks people were already signing up.

It's very hard to get developers to reach into their pockets, especially, if they think there is a free or low-cost alternative that works well enough. Oftentimes "good enough" ends up costing us more in the long run. As Zig Ziglar said: "You can always make another dollar, but you can't make more time."

Read more:

* [Introducing the inlets monthly subscription](https://inlets.dev/blog/2021/07/27/monthly-subscription.html)
* [When Your ISP Won't Give You A Static IP](https://inlets.dev/blog/2021/04/13/your-isp-wont-give-you-a-static-ip.html)

## Wrapping up

These are my top five highlights of inlets features and developments over the past year. If you're an inlets user, why not tweet to [@inletsdev](https://twitter.com/inletsdev) and let me know what yours have been?

There have been other features added throughout the year like support for [IP address ACLs](https://inlets.dev/blog/2021/10/15/allow-lists.html) and [deploying from GitHub Actions](https://inlets.dev/blog/2021/12/06/private-deploy-from-github-actions.html). There's also been customer testimonials on the website, live stream video demos and case-studies from customers like [How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html).

For 2022 - inlets will continue on this path of securely and privately connecting Cloud Native applications as simply as possible. If you have comments, questions or suggestions, don't hesitate to [get in touch with me directly](https://inlets.dev/contact) and follow [@inletsdev](https://twitter.com/inletsdev) on Twitter to keep up to date with news and features.

As we close out the year, let me leave you with a couple of demos of inlets so you can see inlets in action.

### A private HTTPS tunnel with Let's Encrypt in 10 minutes 

{% include youtube.html id="zPl9oC12BJM" %}

### Tunnels for Kubernetes - TLS certificates and public LoadBalancers

{% include youtube.html id="2gdqiH2j-Og" %}

