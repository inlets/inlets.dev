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

Inlets started in the community, helping developers and developers advocates to develop on their projects and customer demos, but we kept hearing from teams who needed to connect customers into their SaaS, without dealing with the complexity and reliability issues associated with VPNs.

Over time, we saw growing interest in connecting to services, and wrote up how to achieve this with the existing inlets, solution.

* [How To Manage Customer Services From Within Your Product](https://inlets.dev/blog/2022/08/03/accessing-customer-services.html)
* [Managing remote hosts at the edge with Kubernetes and SSH](https://inlets.dev/blog/2022/04/14/ssh-k8s-fleet-management.html)
* [Deploy to a private cluster from GitHub Actions without exposing it to the Internet](https://inlets.dev/blog/2021/12/06/private-deploy-from-github-actions.html)
* [Connecting services to Kubernetes clusters with inlets, VPC Peering and direct uplinks.](https://inlets.dev/blog/2021/10/14/kubernetes-peering.html)
* [Case study: How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html)

But there was more that they needed, which was hard to retrofit into the existing product.

We heard from two types of teams.

### SaaS companies that needed to access private customer services in a remote VPC

The first category was SaaS companies, those like [VSHN](https://www.vshn.ch/) who used inlets to access the OpenShift API hidden behind private VPCs in Swiss banks as part of their Kubernetes support service.

We often hear from teams like NetApp, once they've ruled out SSH tunnels, VPNs and unsupported open source tunnels. NetApp spent a long time with us evaluating whether they wanted to use inlets tunnels or a queue-based approach for connecting to their on-premises customers.

We heard from Atlassian, that they scale inlets to huge numbers of tunnels for customers using their on-premises editions of their software like BitBucket. Inlets gives them a convenient way to connect those customers to their cloud services, some of which may never migrate fully to cloud-hosted products. The last we heard from them, they have potentially 200,000 customers that could benefit from inlets technology.

### Companies with a hybrid cloud solution, where they needed to access private services on-premises

Early on, we onboarded a large legal company in the UK, they run the tunnel client as a Windows Service, and the tunnel server as Pods in Kubernetes, meaning it can scale to thousands of tunnels quite simply. They use it to federate on-premises identity servers for SSO flows in one of their applications for lawyers.

A large Swiss medical company providing diagnostic imaging evaluated inlets TCP tunnels as a way of providing remote access to DiCom imagery data, using inlet's built in encryption to harden the legacy protocol.

[Riskfuel](https://riskfuel.com/), a machine learning company with clients like Nvidia, Allianz, Microsoft and HSBC needed to train models on customer data, without extracting it to their own cloud or hosts. They used inlets and wrote about it on our blog: [How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html)

A small business based out of the US buys several dozen tunnels from us and uses them to provide remote technical support to smaller businesses.

## Introducing Inlets Uplink

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

## Customer feedback

[Kubiya.ai](https://kubiya.ai/) have developed a DevOps virtual assistant with conversational AI. Tell it what you need to happen, and it'll go and do it for you, without manual steps.

The team were using NATS JetStream, but ran into issues with managing keys and certificates for customers, reliability issues with the servers, and having to use pub/sub over direct access to OpenFaaS functions.

We met with Kubiya's team, and after a few days of testing the new solution they wrote to us:

> "Just wanted to let you know that the Inlets-pro works amazing! Thank you for your help!
"For tunnel creation, I tried both the inlets-pro cli and yaml files. It's brilliant, I don't know what to say!"
> 
> Constantin Paigin - Head of DevOps & IT

We have other use-cases and blog posts showing what can be done with the existing inlets-pro solution, all of these can now be adapted for Uplink too. 

* [Case-study: How Riskfuel is using Inlets to build machine learning models at scale](https://inlets.dev/blog/2021/07/22/riskfuel.html)
* [How To Manage Customer Services From Within Your Product](https://inlets.dev/blog/2022/08/03/accessing-customer-services.html)
* [Managing remote hosts at the edge with Kubernetes and SSH](https://inlets.dev/blog/2022/04/14/ssh-k8s-fleet-management.html)
* [Deploy to a private cluster from GitHub Actions without exposing it to the Internet](https://inlets.dev/blog/2021/12/06/private-deploy-from-github-actions.html)
* [Connecting services to Kubernetes clusters with inlets, VPC Peering and direct uplinks.](https://inlets.dev/blog/2021/10/14/kubernetes-peering.html)

## Summing up

inlets started in 2019 and has a strong community following with personal users, and with developer advocates in the Cloud Native space.

There are a range of commercial users at different scales, and we're now releasing inlets-uplink, built just for Service Providers and SaaS companies.

inlets-uplink makes inlets more suitable for use at scale by companies that need to reach into private customer networks as part of their product or service.

It's stable, and available now, so we'd love to hear from you if you'd like to try it out.

Read the docs: [Become an inlets uplink provider](https://docs.inlets.dev/uplink/become-a-provider/)

### Want to talk to us about tunnels and remote access?

Feel free to reach out to us below:

[Contact us now](https://inlets.dev/contact)
