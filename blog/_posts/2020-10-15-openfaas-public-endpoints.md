---
layout: post
title: Expose your local OpenFaaS functions to the Internet
description: Learn how to expose your local OpenFaaS Functions to the Internet for development & testing
author: Alex Ellis
tags: inlets-pro kubernetes ingresscontroller
author_img: alex
date: 15-10-2020
---

Learn how to expose your local OpenFaaS functions to the Internet for development & testing.

## Introduction

With [OpenFaaS](https://www.openfaas.com/) you can build functions, APIs, and microservices in a short period of time and host them on Kubernetes. You'll also get built-in monitoring, metrics, auto-scaling, and a REST API for management.

![OpenFaaS Logo](/images/2020-10-openfaas-ingress/openfaas-logo.png)

> OpenFaaS has over 23k GitHub stars.

In this post we'll deploy the [inlets-operator](https://github.com/inlets/inlets-operator) to your local Kubernetes cluster to enable your OpenFaaS gateway and functions to be exposed on the Internet. Why would you want to do this?

![Conceptual architecture](/images/2020-10-openfaas-ingress/openfaas-inlets-pro.png)

> The inlets-operator takes over the role of a cloud LoadBalancer, and provisions an exit-server on public cloud to tunnel traffic to the IngressController.

For Hybrid Cloud:

* For hosting services on-premises
* For hybrid cloud whether part of your offering is still on a private network
* Receive webhook events or data feeds from third parties

For faster testing and development loops:

* Expose a webhook via a function
* Integrate with OAuth and SSO solutions
* Integrate with payment gateways

Once you've completed this tutorial, you will be able to share your functions and APIs hosted on OpenFaaS with colleagues, friends, and third-parties for integrations. You'll also be able to deploy to your local OpenFaaS cluster from CI systems like GitHub Actions.

## Tutorial

> You will need an inlets Pro license, [start a 14-day free trial](https://inlets.dev/).

You'll need:
* [Docker](https://docker.com/) on your local machine.
* arkade (CLI) installed below
* A domain and access to your DNS admin panel to create a sub-domain for OpenFaaS
* A cloud account on DigitalOcean or another cloud, to provision an exit-server with a public IP

The main pre-requisite for the tutorial is the arkade CLI, which can be used to download CLI tools and to install Helm Charts.

```bash
# You can also run without sudo, but you'll need to move the arkade binary
# to /usr/local/bin yourself
curl -sLS https://get.arkade.dev | sudo sh
```

inlets &reg; is a network tunnel that can be used to connect services between private and public clusters. The open source version comes with support for HTTP and the commercial edition (inlets Pro) adds support for TCP and has built-in TLS. The [inletsctl](https://github.com/inlets/inletsctl) and [inlets-operator](https://github.com/inlets/inlets-operator) projects can set up exit-server VMs for you on public cloud, which are used to gain access to your private services.

> Did you know? You can also create your own exit servers with Terraform, or host them as Kubernetes Pods.

One of the drawbacks of SaaS tunnels is that they often lack a [Kubernetes](https://kubernetes.io) integration for LoadBalancers or Ingress. Those which have limited support tend to force you to also use the rest of their product suite like their DNS and edge solution. In this tutorial you'll be able ot use your own domain and pick which cloud you use for hosting your tunnel server for inlets.

### Create a cluster

Download KinD (Kubernetes in Docker) and kubectl, the CLI for Kubernetes:

```bash
arkade get kind --version v0.9.0
arkade get kubectl --version v1.19.2

export PATH=$PATH:$HOME/.arkade/bin/
```

Create a Kubernetes cluster using KinD (Kubernetes in Docker):

```bash
kind create cluster
```

### Install OpenFaaS

Get the OpenFaaS CLI:

```bash
arkade get faas-cli
```

You can install OpenFaaS with a single command:

```bash
arkade install openfaas
```

Follow the post-installation instructions to log into OpenFaaS.

### Install the inlets-operator

Around half a dozen cloud providers are supported by the inlets-operator including AWS EC2, Equinix Metal, Hetzner, Civo, Linode and GCE. It's open source and you can contribute on GitHub.

Save an access token for your cloud provider as `$HOME/access-token`, in this example I'm using DigitalOcean. You can create a token from your dashboard.

Make sure you set `LICENSE` with the value of your license.

```bash
export LICENSE="INLETS_PRO_LICENSE_JWT"

arkade install inlets-operator \
 --provider digitalocean \
 --region lon1 \
 --token-file $HOME/access-token \
 --license-file $HOME/.inlets/LICENSE
```

> You can run `arkade install inlets-operator --help` to see a list of other cloud providers.

* Set the `--region` flag as required, it's best to have low latency between your current location and where the exit-servers will be provisioned.

### Configure your DNS records

Now create a DNS A record in your admin panel example: `openfaas.example.com`, set the TTL to the lowest possible value of around 1 minute or 60 seconds.

Sometimes DNS records can take a few minutes to propagate throughout the Internet.

### Install an IngressController and cert-manager

An IngressController allows you to serve a TLS certificate for the OpenFaaS gateway and functions, cert-manager allows you to obtain a TLS certificate for free from [LetsEncrypt](https://letsencrypt.org).

```bash
arkade install cert-manager
arkade install ingress-nginx
```

Find out the IP address of the LoadBalancer created for ingress-nginx, it will be listed under EXTERNAL-IP:

```bash
kubectl get svc ingress-nginx-controller
```

On DigitalOcean the IP address will appear in less than 30 seconds, which is much quicker than the typical cloud LoadBalancer that can take 5-10 minutes.

### Create an Ingress record

arkade has a built-in way to generate Ingress records for OpenFaaS:

```bash
export TOP_DOMAIN=example.com
export DOMAIN=openfaas.$TOP_DOMAIN

export EMAIL=webmaster@$TOP_DOMAIN
arkade install openfaas-ingress \
 --domain $DOMAIN \
 --email $EMAIL
```

You now need to wait for your DNS entry to propagate and for cert-manager to obtain a certificate.

### Log into OpenFaaS

Log-in to OpenFaaS with TLS

```bash
export OPENFAAS_URL=https://$DOMAIN

PASSWORD=$(kubectl get secret -n openfaas basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode; echo)
echo $PASSWORD | faas-cli login -s

faas-cli store deploy nodeinfo
faas-cli list -v

faas-cli invoke figlet
```

You can also open the OpenFaaS UI over an encrypted connection:

```bash
echo Open a browser at https://$DOMAIN
```

![OpenFaaS Portal](/images/2020-10-openfaas-ingress/portal-ui.png)

### Learn more about OpenFaaS

From here you can now share your URL for your various functions by running `faas-cli describe FUNCTION`, this will give you a synchronous and asynchronous URL that you can enter into a third-party's webhook settings page.

You can also host websites and APIs with OpenFaaS, as long as your Dockerfile follows the [OpenFaaS workloads convention](https://docs.openfaas.com/reference/workloads/) of having a health endpoint and listening to HTTP traffic on port 8080.

Learn more:

* [OpenFaaS blog](https://www.openfaas.com/blog) - find more tutorials
* [OpenFaaS docs](https://docs.openfaas.com/) - additional resources and reference information
* [Introduction to Serverless training course from LinuxFoundation](https://www.edx.org/course/introduction-to-serverless-on-kubernetes)

Now that you have a public endpoint for OpenFaaS, you'll also be able to deploy to your local OpenFaaS cluster from CI systems: [Build and deploy OpenFaaS functions with GitHub Actions](https://www.openfaas.com/blog/openfaas-functions-with-github-actions/)

## Why should you try inlets then?

Here's a few reasons to try inlets today:

* You want to connect services in your private cloud to your public cloud or public Kubernetes cluster
* You need a public IP for your homelab, or want to leverage a LoadBalancer service from your development environment
* You run a SaaS product and want to connect client networks

Further resources:

* [Buy now, or kick the tires with free 14-day trial of inlets Pro](https://inlets.dev)
* [Follow @inletsdev on Twitter](https://twitter.com/inletsdev/)
* [Read tutorials and documentation for inlets](https://docs.inlets.dev/)
