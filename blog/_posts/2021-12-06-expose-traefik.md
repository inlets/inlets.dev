---
layout: post
title: Expose Traefik with K3s to the Internet
description: Learn how to expose self-hosted Kubernetes services from Traefik.
author: Alex Ellis
tags: private tunnel secure ingress self-hosting
author_img: alex
image: /images/2021-08-08-private-tunnel/background.jpg
date: 2021-12-06
---

Learn how to expose self-hosted Kubernetes services from Traefik.

## Introduction

If you run a cluster for development, the costs can add up very quickly - especially if you're not making profit to offset against your costs. By self-hosting, you can cap your monthly costs at a predictable price and whatever hardware you already have. That may be a server under your desk or a Raspberry Pi, or a homelab.

Costs may not be your focus, you may just want the convenience of hosting or testing applications on your local Kubernetes cluster. That's why I created [inlets](https://inlets.dev/) in 2019.

[Traefik](https://traefik.io) is a popular open-source Ingress Controller for [Kubernetes](https://kubernetes.io/). It gained even more visibility when [Darren Shepherd](https://twitter.com/ibuildthecloud) decided to package it with his [K3s](https://k3s.io) project.

Why would you want to expose Traefik?

* To save on your cloud bill by self-hosting your lab
* To get remote access away from home
* To self-host your side-hustle

Thanks to [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/), you'll be able to expose as many websites as you want over a single tunnel with unlimited custom domains. Just create an Ingress record for each one and a subdomain in your domain's control panel.

> What is Ingress? You can think of an Ingress record as like a "Virtual Host" from the old world of Apache web servers. It routes traffic from one IP address to a number of upstream servers.

In this tutorial, we will:

* Deploy a microservice written in Node.js, packaged as a container
* Deploy cert-manager to get a certificate for it from Let's Encrypt
* Deploy inlets to expose Traefik on the Internet and expose it to the outside world

## Pre-reqs

* A domain - so that you can create a sub-domain and get a TLS certificate later on
* A K3s cluster - these instructions will work with Kubernetes cluster
* `kubectl` - to manage your cluster
* `helm` - to install Kubernetes charts
* `docker` - if you want to modify the example repo
* `arkade` - install tools with `arkade get kubectl@v1.21.1` and apps with `arkade install cert-manager`

If you don't have Traefik or any other IngressController in your cluster, then you can install it with [arkade](https://arkade.dev/): `arkade install traefik2`.

Install arkade:

```bash
curl -sSLf https://dl.arkade.dev/ | sh

# If you don't use sudo, then move the binary to /usr/local/bin yourself
curl -sSLf https://dl.arkade.dev/ | sudo sh
```

Install the tools we will use:

```bash
arkade get kubectl@v1.21.1
arkade get helm
```

You'll also need a [valid inlets subscription](https://inlets.dev/) to install the inlets-operator that we'll use to expose your services. If you just want to kick the tires, you can pay month-by-month with no commitment.

## Tutorial

The example microservice is written in Node.js and has two endpoints:

* / - a HTML page
* /api/links - JSON set of links displayed on the homepage

You can view it here: [alexellis/expressjs-k8s](https://github.com/alexellis/expressjs-k8s/)

Install [cert-manager](https://cert-manager.io/docs/), which can obtain TLS certificates through Let's Encrypt.

```bash
arkade install cert-manager
```

Create an Issuer to obtain certificates for the example microservice:

```bash
export EMAIL="you@example.com"
export INGRESS="traefik"

cat > issuer-prod.yaml <<EOF
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-prod
  namespace: default
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: $EMAIL
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - selector: {}
      http01:
        ingress:
          class: $INGRESS
EOF
```

Notice the `http01.ingress.class` is set to "traefik"

Apply the file:

```bash
kubectl apply -f staging-prod.yaml
```

Now customise the `values.yaml` file for the Helm chart:

```yaml
ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/issuer: "letsencrypt-staging"
  hosts:
    - host: expressjs.inlets.dev
      paths: ["/"]
  tls:
   - secretName: expressjs-tls
     hosts:
       - expressjs.inlets.dev

# Uncomment if you are deploying to a Raspberry Pi
# image: alexellis2/service:0.3.6-armhf
```

Deploy the helm chart:

```bash
helm repo add expressjs-k8s https://alexellis.github.io/expressjs-k8s/

# Then they run an update
helm repo update

# And finally they install
helm upgrade --install express expressjs-k8s/expressjs-k8s \
  --values custom.yaml
```

Install the inlets-operator:

The [inlets-operator](https://github.com/inlets/inlets-operator) will create a public TCP tunnel for Traefik's LoadBalancer on ports 80 and 443 to allow incoming traffic. It does this by provisioning a cloud instance with the inlets server component preloaded. The operator then runs a client using a Pod and connects the two.

For your users, it'll be as if your K3s cluster was on the Internet for ports 80 and 443 only.

```bash
arkade install inlets-operator \
 --provider $PROVIDER \                     # 
 --region $REGION \                         # 
 --token-file $HOME/Downloads/key.json      # Token file/Service Account Key file with the access to the cloud provider.
```

* `--provider` - name of the cloud provider to provision the exit-node on.
* `--region` - select a region that's close to where you live
* `--token-file` - a token used to create VMs on your behalf

Some providers need additional fags such as `--zone` or a `--secret-key-file`, you can find [instructions for supported clouds here](https://docs.inlets.dev/reference/inlets-operator/).

If your cloud is not listed, you can create your own tunnel server and connect it with the [inlets helm chart](https://inlets.dev/blog/2021/07/08/short-lived-clusters.html).

If you're using [DigitalOcean](https://m.do.co/c/2962aa9e56a1) and their London region, then you'd type in:

```bash
arkade install inlets-operator \
  --provider digitalocean \
  --region lon1 \
  --token-file $HOME/Downloads/do.txt
```

Within approximately 30 seconds you'll have a public IP for your cluster.

```bash
kubectl get tunnel -n kube-system -o wide
kubectl get svc/traefik -n kube-system -o wide
```

The next step will be for you to create a DNS A or CNAME record for the IP above and your domain i.e. `expressjs.example.com`.

![HTTPS cert](https://docs.inlets.dev/images/operator-pro-webpage.png)
> The HTTPS certificate served from your cluster and your custom domain.

## How much does it cost?

Let's compare our setup to that of Linode managed Kubernetes pricing?

* 3x dedicated CPU 4GB node - 30 USD / mo each
* 1x Load balancer - 10 USD / mo

Total / mo: 100 USD

* inlets personal license: 19.99 USD
* The tunnel VM: 5 USD = 5 USD / mo
* 3x Raspberry Pi 4 with 4GB of RAM: = 13.75 / mo

> Based upon a one-time purchase of 55 USD / node.

Total / mo: 38 USD

If you already own some Raspberry Pis or servers:

* inlets personal license: 19.99 USD
* The tunnel VM: 5 USD = 5 USD / mo

Total / mo: 24.55

Now if your usual choice of cloud would be AWS, then the cost savings are going to be much more pronounced.

Amazon EKS comes at a fee of $0.10 per hour for each cluster that you create. This sums up to around $74 per month per cluster, before adding any worker nodes, a load balancer or bandwidth.

## Who uses inlets with Kubernetes?

Your costs will be capped to just your electricity (which you may already be paying for), the VM used for the tunnel and your inlets subscription. Inlets is offered for personal use at a discounted rate and on a monthly subscription.

What if costs were not a concern for you, but utility and ease of use were?

You'd be in good company. [Maël Valais](https://twitter.com/maelvls), Kubernetes at JetStack and maintainer of cert-manager uses inlets to test new versions of the project:

> "Thanks to the inlets-operator, I can now test cert-manager during development on my local Kubernetes cluster"

Are you wondering how it compares to MetalLB?

MetalLB is great at giving out local addresses from your local network range, but cannot connect your private cluster to the Internet. Inlets user [Zespre Schmidt](https://twitter.com/starbops) shows how he uses both in his blog post: [A Tour of Inlets - A Tunnel Built for the Cloud](https://blog.zespre.com/inlets-the-cloud-native-tunnel.html)

> Inlets PRO is a swiss army knife. Users can expose their private services efficiently like never before. Unlike SaaS tunneling solutions like Ngrok, you have total control over your infrastructure without traffic throttling. If you have a local K8s deployment, definitely give it a try!

## Wrapping up

With this solution, you can connect an existing environment or a local cluster to the Internet for self-hosting and faster testing. You won't have to worry about facing your boss about a large cloud bill, or wasting your money on resources that you were not really using.

In a short period of time we connected your Traefik ingress controller to the Internet with a public IP address.

For each website you want to expose, you'll just do two things:

* Create a valid Ingress record
* Create a subdomain for it

Whilst you're more likely to host less than a dozen APIs or websites, you could host hundreds or thousands through one price without having to worry about your cloud bill.

* [Explore the FAQ](https://docs.inlets.dev/reference/faq/)
* [Checkout the inlets-operator on GitHub](https://github.com/inlets/inlets-operator)
* [Free webinar: Crossing network boundaries with Kubernetes and inlets](https://www.youtube.com/watch?v=qbR4brn8o6U)
