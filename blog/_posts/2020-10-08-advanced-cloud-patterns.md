---
layout: post
title: Learn Advanced Cloud Networking Patterns with inlets
description: Learn a number of advanced cloud patterns you can apply with inlets for hybrid-cloud, multi-cluster and federation.
author: Alex Ellis
tags: sdn sdwan inlets-cloud
author_img: alex
date: 08-10-2020
---

Learn a number of advanced cloud patterns you can apply with inlets for hybrid-cloud, multi-cluster and federation.

inlets &reg; is a network tunnel that can be used to connect services between private and public clusters. The open source version comes with support for HTTP and the commercial edition (inlets Pro) adds support for TCP and has built-in TLS and [Kubernetes](https://kubernetes.io) support through the [inlets-operator](https://github.com/inlets/inlets-operator).

The best known use-case for a network tunnel is to take a service on a private network and to expose it on the Internet. This can be useful for sharing work with clients, integrating with third-party APIs, and for receiving webhooks behind a firewall. 

![Traditional tunnel usage](/images/2020-10-advanced-cloud/internet-webhooks.png)

> A well-known use-case for network tunnels - receiving webhooks from the Internet.

A newer use-case for network tunnels like inlets is as a Software Defined Network which can replace a VPN or costly SD-WAN, which is how [VSHN AG](https://vshn.ch/en/) were able to offer a management product for OpenShift users.

![SaaS use-case](/images/2020-10-advanced-cloud/use-case-1-vshn.jpg)

> Connect on-premises to your SaaS using application tunnels. Don't worry about opening ports or sending an engineer on-site to configure a VPN.

## What's the difference with inlets?

Most SaaS tunnels are subjected to severe limits and restrictions to make large enough margins for a hosted product, however inlets is self-hosted meaning you decide the limits that suit your needs. inlets also allows tunnels to remain private, and act like a Software Defined Network (SDN) or VPN where services are only made available within a remote network, but not to the world.

At cert-manager's community day, Alex gave an overview of inlets including:

* The traditional use-case for network tunnels
* The differences and usage for inlets OSS (since deprecated) and inlets Pro
* A case-study with hybrid cloud, to manage private OpenShift APIs from a central SaaS service
* Multi-cloud service federation with Prometheus

The talk finishes with a demo of inlets-cloud for managing hundreds of exit-servers in Kubernetes Pods and how to get started with the project.

inlets is available for Linux, Windows and MacOS.

## Watch the presentation

Alex joined the [JetStack](https://www.jetstack.io) team for their inaugural cert-manager community day. [cert-manager](https://cert-manager.io) is probably the most popular solution for bringing TLS to services on Kubernetes clusters.

{% include youtube.html id="5nfe4pNATYQ?start=5970" %}

### inlets-cloud

In the talk you'll also see a demo of inlets-cloud, which is a managed solution for managing inlets tunnel servers at scale.

![SaaS use-case](/images/2020-10-advanced-cloud/use-case-1-saas.png)

Pictured above is an architecture diagram from VSHN's usage of inlets, where a separate tunnel server is deployed for each customer tunnel. With inlets-cloud exit-servers are hosted as Kubernetes Pods and can scale-out to very large numbers.

The typical use-case for this is as a service provide offering a SaaS or IoT solution, but if you manage more than a few tunnels, then inlets-cloud would likely save you time over the long-run.

![inlets-cloud-conceptual](/images/2020-10-advanced-cloud/inlets-cloud-conceptual.png)

> Conceptual diagram: inlets-cloud can be installed by our team on your existing cloud infrastructure.

inlets-cloud includes:
* A REST API for managing tunnels and invoking tunnelled services - to be used from your applications
* A tunnel proxy for accessing the tunnelled services through inlets
* A CLI - for operators to manage and review tunnels
* A Kubernetes helm chart and automation for TLS certificates for each tunnel

We are offering extended free trials of inlets-cloud for development and testing. Whilst a team of Kubernetes experts could build this type of solution, it could take several months and would need to be maintained. We plan to add more features over time and to support customer deployments of inlets-cloud to scale with your needs.

Find out more about inlets-cloud and get a free trial by emailing us at [sales@openfaas.com](mailto:sales@openfaas.com)

## Get the slides

You can download a PDF export of the slides here:

* [Advanced cloud patterns with inlets and cert-manager](https://drive.google.com/file/d/1GIhU4igzowmTdVvau-NmzHGToBs2p_Dy/view?usp=sharing)

## Why should you try inlets then?

Here's a few reasons to try inlets today:

* You run a SaaS product and want to connect client networks
* You want to connect services in your private cloud to your public cloud or public Kubernetes cluster
* You need a public IP for your homelab, or want to leverage a LoadBalancer service from your development environment

Further resources:

* [Read tutorials and documentation for inlets](https://docs.inlets.dev/)
* [Follow @inletsdev on Twitter](https://twitter.com/inletsdev/)
