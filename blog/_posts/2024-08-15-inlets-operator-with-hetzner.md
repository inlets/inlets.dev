---
layout: post
title: Expose your local Kubernetes Ingress Controller via Hetzner Cloud
description: "Learn how to configure the inlets-operator to expose local Kubernetes Ingress resources with Hetzner Cloud"
author: Alex Ellis
tags: kubernetes ingress tunnels private vpc hetzner
author_img: alex
image: /images/2024-08-15-kubernetes-ingress-hetzner/background.png
date: 2024-08-15
---

There are two ways to configure inlets to expose an Ingress Controller or Istio Gateway to the public Internet, both are very similar, only the lifecycle of the tunnel differs.

For teams that are new to inlets, and set up most of their configuration with clicking buttons, installing Helm charts and applying YAML from their workstation or a CI pipeline, then the inlets-operator keeps things simple. Whenever you install the inlets-operator, it searches for LoadBalancer resources and provisions VMs for them with the inlets-pro TCP server preinstalled. It then creates a Deployment in the same namespace with an inlets TCP client pointing to the remote VM, and everything just works.

The down-side to the inlets-operator is that if you delete the exposed resource, i.e. ingress-nginx, then the tunnel will be deleted too, and when recreated it will have a different IP address. That means you will need to update your DNS records accordingly.

What if you're heavily invested in GitOps, and regularly delete and re-create your cluster's configuration? Then you may want a more stable IP address and set of DNS records, in that case, you can create the VM for the inlets tunnel server manually or semi-automatically with Terraform, Pulumi or our own provisioning CLI called [inletsctl](https://docs.inlets.dev/reference/inletsctl/).

With the inlets-operator, you need to pick a region and supported provider such as AWS EC2, DigitalOcean, or Hetzner Cloud and input those options via the Helm chart. For a manual tunnel server, you can use any tooling or cloud/VPS provider you wish. We'll be using Hetzner Cloud in this example, which is particularly good value and fast to provision.  

## A quick video demo of the operator

In this animation by [Ivan Velichko](https://iximiuz.com/en/posts/kubernetes-operator-pattern), you see the operator in action. As it detects a new Service of type LoadBalancer, provisions a VM in the cloud, and then updates the Service with the IP address of the VM.

[![Demo GIF](https://iximiuz.com/kubernetes-operator-pattern/kube-operator-example-opt.gif)](https://iximiuz.com/en/posts/kubernetes-operator-pattern)

## Getting an LB in about 30 seconds with Hetzner Cloud

<blockquote class="twitter-tweet" data-conversation="none"><p lang="en" dir="ltr">About 30s from creating a Service with type LoadBalancer, to a fully working endpoint. And I&#39;m sat in a cafe running KinD with WiFi. <a href="https://t.co/zUV9US7OM0">pic.twitter.com/zUV9US7OM0</a></p>&mdash; Alex Ellis (@alexellisuk) <a href="https://twitter.com/alexellisuk/status/1800863973581136340?ref_src=twsrc%5Etfw">June 12, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

I work from home, and once per week, if work allows, I try to get out to a coffee shop and to work on a blog post there, in different surroundings. On this occasion I decided to update the inlets-operator's support for Hetzner Cloud, and to give it a quick test. You can see from the screenshot that a KinD cluster running on my MacBook Air M2 was able to get a public IP address in about 30 seconds flat.

So what's needed? First you'll need an account with Hetzner Cloud, bear in mind Hetzner Robot is the dedicated server offering and needs a different login and account.

* [Log into Hetzner Cloud](https://accounts.hetzner.com/login) and enter your Default project.
* Click "Security" then the "API tokens" tab
* Click "Generate API token" and name it "inlets-operator" and grant Read/Write access.
* Click "Click to show" then copy the text and save it as `~/.hetzner-cloud-token`
* Now determine the available regions by clicking Add Server, don't actually add a server but use the screen to copy the code of the region you want i.e. Helsinki (eu-central) or Ashburn, VA (us-east).

If you don't have an inlets license yet, obtain one at [inlets.dev](https://inlets.dev/pricing) and save it as `~/.inlets/LICENSE`.

Formulate the Helm install command

```bash
# Create a namespace for inlets-operator
kubectl create namespace inlets

# Create a secret to store the service account key file
kubectl create secret generic inlets-access-key \
  --namespace inlets \
  --from-file inlets-access-key=$HOME/.hetzner-cloud-token

# Create a secret to store the inlets-pro license
kubectl create secret generic \
  --namespace inlets \
  inlets-license --from-file license=$HOME/.inlets/LICENSE

# Add and update the inlets-operator helm repo
# You only need to do this once.
helm repo add inlets https://inlets.github.io/inlets-operator/

export REGION=eu-central
export PROVIDER=hetzner

# Update the Helm repository and perform an installation
helm repo update && \
  helm upgrade inlets-operator --install inlets/inlets-operator \
  --namespace inlets \
  --set provider=$PROVIDER \
  --set region=$REGION
```

If you don't have an Ingress Controller already installed and configured in your cluster, then you can add one with arkade:

```bash
curl -sLS https://get.arkade.dev | sudo sh

arkade install ingress-nginx
```

That will create a service of type LoadBalancer in the default namespace, watch it and you'll see an IP appear for it:

```bash
kubectl get service --watch
```

How quick was your public IP displayed here?

There's also a Custom Resource Definition (CRD) for the inlets-operator, you can view it with:

```bash
kubectl get tunnels -o wide
```

Access your ingress-nginx service with the IP address shown in the `EXTERNAL-IP` column, and you'll see the default Nginx welcome page.

```bash
curl -i http://<EXTERNAL-IP>
```

If you delete the tunnel CR, you'll see it re-created with a new IP in a short period of time:
    
```bash 
kubectl delete tunnel ingress-nginx
```

Then watch either the service or tunnel object again:

```bash
kubectl get tunnels -o wide --watch
```

## Wrapping up

Using a single tunnel and a single license, you can expose dozens, if not hundreds of different websites through your Ingress Controller, all running within your private or on-premises Kubernetes cluster. The inlets-operator is a great way to get started with inlets, and it's also a great way to expose your Ingress Controller to the public Internet.

The inlets-operator works with [different clouds](https://docs.inlets.dev/reference/inlets-operator) and can expose any TCP LoadBalancer, not just Ingress Controllers and Istio.

Bear in mind that the tunnel IP and DNS records will be tied to the lifecycle of your LoadBalancer services, so if you delete them, the VMs will be deleted too, and if you re-create them, then they'll be re-created with a new IP addresses. For that reason, you may want to [create the tunnel servers manually](https://docs.inlets.dev/tutorial/manual-tcp-server/), or separately from the inlets-operator.

The `inlets-pro tcp server --generate=systemd` and `inlets-pro tcp client --generate=k8s_yaml` are two utility commands to make it easier to set up both parts of the tunnel without needing the operator.

The operator will also need credentials to provision and clean-up VMs, that's another thing to consider when deciding which approach to use.

The code for the inlets-operator is open source under the MIT license and available on GitHub: [inlets/inlets-operator](https://github.com/inlets/inlets-operator/).

### Watch a video walk-through

I recorded a video walk-through of the blog post, so you can watch it back and see the steps in action.

{% include youtube.html id="Bk98zZixJL0" %}

When you [sign up for a subscription](https://inlets.dev/pricing), you'll get complimentary access to a Discord community to talk with other users and the inlets team.
