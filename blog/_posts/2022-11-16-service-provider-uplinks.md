---
layout: post
title: Inlets Uplink for SaaS & Service Providers
description: Inlets was born in the cloud, as a secure and portable tunnel for developers, now we're bringing it to Service Providers and SaaS companies.
author: Alex Ellis
tags: saas uplink connect vpn
author_img: alex
date: 2022-11-16
image: /images/2022-uplink/connections.jpg
---

We're excited to announce Inlets (tm) Uplink, a tunnel solution built with our SaaS and Service Provider customers.

I'll give a quick recap of where we've come from, building a community with developer advocates and personal users, then what we're doing with our new product to help service providers and SaaS companies.

## Part one - developers like me

[Inlets](https://inlets.dev/) began its journey on the cusp of 2019 over the holiday season as a Proof of Concept (PoC), with the simple idea of making a first-class tunnel service for Cloud Native use-cases.

I built it for myself. I wanted a tunnel that was born for the cloud, built for Kubernetes, built for containers, without rate-limits and that followed the same principles of [OpenFaaS - simplicity, security and portability](https://openfaas.com).

The incumbent solutions like Ngrok and Cloudflare Argo were not a good fit for several reasons:

* They were tied to a SaaS, meaning all your data had to pass through the vendor's servers
* In the case of Ngrok, they were heavily rate-limited, even on paid plans, with stingy bandwidth limits
* Ngrok was and possibly still is banned by many corporate networks, by simply blocking the domain name "*.ngrok.com"
* Neither had container images, Kubernetes integrations or Helm charts

They just were not built for the needs of Cloud Native practitioners or companies.

So inlets was a response to these issues, and quickly gained popularity with its intended audience. Two of the maintainers of cert-manager started using the inlets-operator to get public IPs for KinD clusters, to test Let's Encrypt integrations.

And it was really popular with personal users and developer advocates who used it to run demos with customers, on live-streams and at events like KubeCon.

Nathan Peck at AWS [built out an AWS ECS Anywhere lab](https://nathanpeck.com/ingress-to-ecs-anywhere-from-anywhere-using-inlets/) and told me that traditional VPNs did not work well, and that he'd used inlets TCP tunnels to load balance instead:

<blockquote class="twitter-tweet" data-conversation="none"><p lang="en" dir="ltr">You can try it out by sending traffic to <a href="https://t.co/s4h7DweKMF">https://t.co/s4h7DweKMF</a><br><br>Your request goes to an AWS Fargate hosted Inlets exit server, and then down to a Raspberry Pi sitting on my desk!<br><br>Refresh a few times to reach all of my Raspberry Pi&#39;s! <a href="https://t.co/xslB7Gz4NL">pic.twitter.com/xslB7Gz4NL</a></p>&mdash; Nathan Peck (@nathankpeck) <a href="https://twitter.com/nathankpeck/status/1438554384238006276?ref_src=twsrc%5Etfw">September 16, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

The infamous CNCF parody account "Memenetes" noticed us and even added inlets to his Cloud Native Puzzle "Now with inlets and K3s":

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Kid: I want a really difficult puzzle for my birthday<br>Me: <a href="https://t.co/y5dzjL6mIv">pic.twitter.com/y5dzjL6mIv</a></p>&mdash; memenetes (@memenetes) <a href="https://twitter.com/memenetes/status/1247630361242279936?ref_src=twsrc%5Etfw">April 7, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

And inlets was presented at various conferences like the OSSummit and [Cloud Native Rejekts](https://cloud-native.rejekts.io/) by the community:

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">At <a href="https://twitter.com/hashtag/OSSummit?src=hash&amp;ref_src=twsrc%5Etfw">#OSSummit</a> <a href="https://twitter.com/ellenkorbes?ref_src=twsrc%5Etfw">@ellenkorbes</a> is providing a great overview of the many dev, debug, build, deploy, etc. tools available to developers in the Kubernetes ecosystem. Shout-out to <a href="https://twitter.com/inletsdev?ref_src=twsrc%5Etfw">@inletsdev</a> by my friend <a href="https://twitter.com/alexellisuk?ref_src=twsrc%5Etfw">@alexellisuk</a>! <a href="https://t.co/UblhwesF2i">pic.twitter.com/UblhwesF2i</a></p>&mdash; Phil Estes (@estesp) <a href="https://twitter.com/estesp/status/1189506674392031233?ref_src=twsrc%5Etfw">October 30, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Over the years since 2019, there have been too many users to mention individually, but here are a few:

* Connor Hicks, then at 1Password, now founder at Suborbital [used inlets with his WebAssembly project to get Ingress directly to his Raspberry Pi](https://twitter.com/cohix/status/1359885962407518210?ref_src=twsrc%5Etfw) during development
* Carlos Santana, Staff Developer Advocate at IBM, now at AWS [used inlets to get webhooks to Tekton Pipelines, for development](https://twitter.com/csantanapr/status/1223759215816257536?ref_src=twsrc%5Etfw)
* Kat, a developer advocate at Kong [used inlets to run a demo of Kong's API Gateway with live traffic](https://twitter.com/usrbinkat/status/1557430745332781057?ref_src=twsrc%5Etfw).
* [Marino Wijay](https://twitter.com/virtualized6ix) of Solo.io signed up to inlets to demo the new [Ambient Mesh changes](https://istio.io/latest/blog/2022/introducing-ambient-mesh/) in the Istio project.
* [Zespre Schmidt](https://twitter.com/starbops) spontaneously wrote up a really comprehensive guide to inlets for personal use: [A Tour of Inlets - A Tunnel Built for the Cloud](https://blog.zespre.com/inlets-the-cloud-native-tunnel.html)
* [Mark Sharpley connected his solar-powered boat to the Internet with inlets](https://inlets.dev/blog/2021/07/13/inlets-narrowboat.html)
* A developer in the UK Government kept banging his head against the wall with the flakiness of "kubectl port-forward", so we wrote a feature to help him: [Fixing the Developer Experience of Kubernetes Port Forwarding](https://inlets.dev/blog/2022/06/24/fixing-kubectl-port-forward.html)

Over the three years, we've had a lot of love from the community.

I want to say thank you from me. We're still building inlets for developers and would love to hear from you on how you're using it for personal use or at work.

The core of inlets is a single binary, but there are dozens of Open Source tools built around it like our [inlets-operator](https://github.com/inlets/inlets-operator), [cloud provisioning library](https://github.com/inlets) and [tiny TCP load balancer as an alternative to HAProxy](https://github.com/inlets/mixctl).

[Ivan Velichko](https://twitter.com/iximiuz), then SRE at Booking.com, now developer at Docker Slim wrote a detailed review and explanation of the inlets-operator, that created tunnel servers for LoadBalancers for private clusters: [Exploring Kubernetes Operator Pattern](https://iximiuz.com/en/posts/kubernetes-operator-pattern/).

## Part two - SaaS and Service Providers

Then we started to see interest from two types of customers, who had very different needs (and budgets) vs. personal users, like you and me who are more cost sensitive.

Over time, listening to both customers and prospects, we wrote up various blog posts to show them how to achieve their goals:

* [How To Manage Customer Services From Within Your Product](https://inlets.dev/blog/2022/08/03/accessing-customer-services.html)
* [Managing remote hosts at the edge with Kubernetes and SSH](https://inlets.dev/blog/2022/04/14/ssh-k8s-fleet-management.html)
* [Deploy to a private cluster from GitHub Actions without exposing it to the Internet](https://inlets.dev/blog/2021/12/06/private-deploy-from-github-actions.html)
* [Connecting services to Kubernetes clusters with inlets, VPC Peering and direct uplinks.](https://inlets.dev/blog/2021/10/14/kubernetes-peering.html)
* [Case study: How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html)

### SaaS companies that needed to access private customer services in a remote VPC

The first category was SaaS companies, those like [VSHN](https://www.vshn.ch/) who used inlets to access the OpenShift API hidden behind private VPCs in Swiss banks as part of their Kubernetes support service.

We often hear from teams like NetApp, once they've ruled out SSH tunnels, VPNs and unsupported open source tunnels. NetApp spent a long time with us evaluating whether they wanted to use inlets tunnels or a queue-based approach for connecting to their on-premises customers.

We heard from Atlassian, that they scale inlets to huge numbers of tunnels for customers using their on-premises editions of their software like BitBucket. Inlets gives them a convenient way to connect those customers to their cloud services, some of which may never migrate fully to cloud-hosted products. The last we heard from them, they have potentially 200,000 customers that could benefit from inlets technology.

### Companies with a hybrid cloud solution, where they needed to access private services on-premises

Early on, we onboarded a large legal company in the UK, they run the tunnel client as a Windows Service, and the tunnel server as Pods in Kubernetes, meaning it can scale to thousands of tunnels quite simply. They use it to federate on-premises identity servers for SSO flows in one of their applications for lawyers.

A large Swiss medical company providing diagnostic imaging evaluated inlets TCP tunnels as a way of providing remote access to DiCom imagery data, using inlet's built in encryption to harden the legacy protocol.

[Riskfuel](https://riskfuel.com/), a machine learning company with clients like Nvidia, Allianz, Microsoft and HSBC needed to train models on customer data, without extracting it to their own cloud or hosts. They used inlets and wrote about it on our blog: [How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html)

A small business based out of the US buys several dozen tunnels from us and uses them to provide remote technical support to smaller businesses.

## Part three - Inlets Uplink

In [Monetizing Innovation](https://www.amazon.co.uk/Monetizing-Innovation-Companies-Design-Product/dp/1119240867) Madhavan Ramanujam speaks of how no product fits just one size, and quite often, you'll need to segment your customers into different groups, and potentially offer different products to each.

We took feedback from the above customers and prospects and built a new product that is just for their use-case.

The new product is called Inlets Uplink, because it's used to build uplinks between your customers and your own platform.

### Private access only

![Example - securely connecting a customer's Identity Server to your cloud](/images/2022-uplink/inlets-uplink-1.png)
> Example: securely connecting a customer's Identity Server to your cloud

The original use-case of inlets, and what makes it so popular with developers is being being to expose services from private networks to the public Internet.

For inlets-uplink, we've completely removed this feature.

Any services tunneled over an inlets-uplink tunnel are only accessible from the Kubernetes cluster where inlets-uplink is running.

Imagine that you'd forwarded Postgres database from a customer site `acmeco` to your cloud Kubernetes cluster, here's how you'd access it:

```bash
psql -U postgres -h prod.acmeco -p 25060 -d finance --set=sslmode=require
```

### Multiple TCP hosts and port remapping

You can now tunnel multiple TCP upstream hosts over one tunnel, publishing different ports:

```bash
inlets-pro uplink client \
    --upstream 192.168.1.10:8080 \
    --upstream 192.168.1.11:8080 \
    --upstream 192.168.1.12:22
```

Here, port 80 will be load-balanced between `192.168.1.11` and `192.168.1.10`

And port `22` will be directed to `192.168.1.12`.

If the tunnel server is going to forward port 22 for multiple hosts, you can remap the port:

```bash
inlets-pro uplink client \
    --upstream 2222=192.168.1.10:22 \
    --upstream 2221=192.168.1.11:22
```

Previously, this was unsupported, but was a frequent ask.

### Mixed HTTP and TCP tunnels in the same tunnel

You can now mix HTTP and TCP services over the same tunnel:

```bash
inlets-pro uplink client \
    --upstream identity1.local=https://192.168.1.10:443 \
    --upstream identity2.local=https://192.168.1.10:443 \
    --upstream 192.168.1.1:22
```

In the above example, two HTTP services are forwarded for two different identity servers, and one TCP service is forwarded for SSH access.

### Licensing the server, instead of the client

For personal use, or use within a business it often makes sense to license the client, since you'll rarely touch the server.

For service providers, we are licensing the tunnel server instead, so that you don't need to co-ordinate any license renewals or keys with your customers.

### One way to scale

We are often asked whether inlets can scale. On average, tunnels tend to use < 5 MB of RAM, run as isolated processes and can be deployed to Kubernetes, so they can scale massively without impacting each other.

inlets-pro could be used for personal use or businesses use, with helm charts, plain YAML, Windows, Linux, MacOS binaries, Terraform, Docker or a custom operator. Developers like Johan Siebens told us that this was what he loved about inlets, it could be configured however he needed depending on the use-case.

But for a service provider, it was confusing to have so many options on hand.

So inlets-uplink is designed to be hosted on your own Kubernetes cluster, with a single Helm chart, with a single license key, and configuration.

Each tunnel for your customers can then be created with:

* A Custom Resource Definition (CRD) for technical teams using GitOps
* A REST API for companies which have existing provisioning systems
* A CLI for teams that are just starting out

Your customers can deploy the inlets-uplink client via a binary for Windows, MacOS or Linux, a container image, or a Kubernetes YAML file.

We kept hearing that more experienced Kubernetes customers wanted to use Istio, so we've added support for both into the inlets-uplink chart, and make it as simple as possible to configure with a HTTP01 challenge, so you won't need to mess around with complicated service accounts.

Example Custom Resource to deploy a tunnel for acmeco's production Postgres database:

```yaml
apiVersion: uplink.inlets.dev/v1alpha1
kind: Tunnel
metadata:
  name: postgres-prod
  namespace: acmeco
spec:
  tcpPorts:
  - 25060
status: {}
```

On the customer end, they'd type in:

```bash
inlets-pro uplink client \
    --token-file token.txt \
    --upstream postgres-prod:25060 \
    --url wss://uplink.example.com/acmeco/postgres-prod
```

## Use-cases

* [Case-study: How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html)
* [How To Manage Customer Services From Within Your Product](https://inlets.dev/blog/2022/08/03/accessing-customer-services.html)
* [Managing remote hosts at the edge with Kubernetes and SSH](https://inlets.dev/blog/2022/04/14/ssh-k8s-fleet-management.html)
* [Deploy to a private cluster from GitHub Actions without exposing it to the Internet](https://inlets.dev/blog/2021/12/06/private-deploy-from-github-actions.html)
* [Connecting services to Kubernetes clusters with inlets, VPC Peering and direct uplinks.](https://inlets.dev/blog/2021/10/14/kubernetes-peering.html)

## Summing up

inlets started in 2019 and has a strong community following with personal users, and with developer advocates in the Cloud Native space.

There are a range of commercial users at different scales, and we're now releasing inlets-uplink, built just for Service Providers and SaaS companies.

inlets-uplink makes inlets more suitable for use at scale by companies that need to reach into private customer networks as part of their product or service.

It's stable, and available for pilot now, so we'd love to hear from you if you'd like to try it out.

### Want to talk to us?

If you'd like to talk to us about inlets, feel free to reach out to us:

[Contact us now](https://inlets.dev/contact)
