---
layout: post
title: How to Get Ingress for Private Kubernetes Clusters
description: "By design, local Kubernetes clusters are inaccessible from the internet. So how can we fix that if we want to use Ingress?"
author: Alex Ellis
tags: kubernetes ingress istio
author_img: alex
image: /images/2023-02-operator/hotspot.jpg
date: 2023-02-24
---

By design, local Kubernetes clusters are inaccessible from the internet. So how can we fix that if we want to use Ingress?

## The use-cases for ingress to private clusters

First of all, why would you need Ingress into a Kubernetes cluster?

Kubernetes was built to host microservices on the Internet. So if you're building or hosting microservices, the chances are that they may need to receive traffic.

A "Local cluster" could refer to Minikube, KinD, K3d on your laptop, or K3s/Kubeadm running within a VM or on a server in your datacenter or homelab.

* Customer demos and conferences

    I just [wrote up an article](https://inlets.dev/blog/2023/02/22/tunnels-for-developer-advocates.html) explaining how developer advocates and customer success folks have been using network tunnels over the past three years in customer demos and at conferences.

* A web portal

    Perhaps you're developing a web portal that integrates with OAuth. It becomes trivial to test the flow when you have a URL that's accessible from the Internet.

* A blog or docs

    Most kinds of blogs and docs engines like jeykll, mkdocs, React and Hugo can be tested on your local machine. But if you deploy them to Kubernetes for production, you may want to get a live URL for them to get feedback from your colleagues before going live.

    Reviewing an article in markdown may work for developers, but often we want input from the marketing team or the business.

* Webhooks integration

    If you're integrating your REST API with webhooks from GitHub, PayPal, Stripe, AWS SNS, Discord, Slack or any other kind of service, you'll need a URL that's accessible from the Internet.

* Self-hosting in a homelab

    Of course, it wouldn't be right to leave out the homelabbers. If you're running Kubernetes in your homelab or on a [Raspberry Pi cluster](https://blog.alexellis.io/self-hosting-kubernetes-on-your-raspberry-pi/), you are very likely going to want to expose your services to the Internet.

This is not an exhaustive list, but if you want more examples, check out the examples in the conclusion.

## The options

### Port forwarding

The first option that many people think of is to use port forwarding on your ISP's router.

First of all, you log into the router's HTTP admin panel, find the port forwarding section and add a rule from the public port to the private port where the cluster is running, i.e. 192.168.0.100.

Pros:

* Cheap
* Pay with your time and effort

Cons:

* You can only expose one service on a given port
* You will need extra rules for every port you want to expose
* Lack of privacy - anyone can find out where you live, with varying levels of accuracy
* The IP must be accessible on your LAN, and if it's within a VM that may not be the case
* Not portable - you'll need to do this for every cluster you want to expose
* IPs are usually dynamic and change - so you'll need to run extra software to update a dynamic DNS record

### Ngrok

Ngrok doesn't actually have any integration for Kubernetes, but if you have enough time, you could try to bundle it into a container image and run it as a Deployment in the cluster. You would benefit from a paid account, as understandably, the free version of the tunnel has become more and more limited over time.

Pros:

* You can run a tunnel for free for 7 hours

Cons:

* Restrictive rate limits - paid accounts make these more reasonable
* Random domain name on the free plan
* Kubernetes is unsupported as a deployment option, so there's lots of manual work ahead
* No way to integrate with Ingress Controllers or Istio

## MetalLB and Kube-vip

Both of these projects are usually used in private networks to allocate IP addresses or to balance traffic between nodes with private IP addresses.

They're great at what they do, but neither MetalLB, nor Kube-vip can take a cluster running within a private network and make them accessible on the Internet. MetalLB can be used to make port-forwarding a bit easier to manage, and it's free, but you will run into similar downsides like the ones listed above.

## ZeroTier / Wireguard / Tailscale

ZeroTier, Wireguard, and Tailscale are all examples of VPNs, and are designed to connect machines or networks together over the Internet. They're great for those use-cases, and you may be able to use them to get private access to a local Kubernetes cluster, but they're unfortunately not going to help us serve traffic to the Internet.

See also: [inlets FAQ](https://inlets.dev/reference/faq/)

### Inlets Operator

The next option is to use the [Inlets Operator](https://github.com/inlets/inlets-operator/). We built it as a controller to get working, public TCP Load Balancers on any Kubernetes cluster.

Pros:

* Expose as many clusters as you like
* Static IPs for each service you want to expose
* Unlimited rate-limits and bandwidth transfer
* Expose Ingress or Istio and get unlimited domain names over one tunnel

Cons:

* A monthly subscription is required
* You'll need to generate a cloud API token to create VMs
* Inlets uses a cheap cloud VM for ~ 5 USD / mo to run a tunnel server for you

Whilst there is a 5 USD / mo cost to most cloud VMs, you can actually trade a little of your own time and convenience to [host your tunnels for free on Fly.io](https://inlets.dev/blog/2021/07/07/inlets-fly-tutorial.html).

![Take your IP with you](https://docs.inlets.dev/images/tethering-k3s.jpeg)
> Take your IP on the road with you

For my talk on inlets at Cloud Native Rejekts in 2019, I set up a Raspberry Pi 4 with cert-manager, ingress-nginx and K3s in my home town. Then I flew out to San Diego, bought a mobile plan and tethered it to a 4G hotspot on my phone.

The result? During the demo, the same Let's Encrypt TLS certs that had been served on the same domain, and IP address in the UK were accessed by conference attendees in the US.

Can port-forwarding rules do that?

## Checking out the Inlets Operator

The [Inlets Operator](https://github.com/inlets/inlets-operator/) is open source and licensed MIT, so you can browse the code on GitHub and contribute, if you like.

The operator runs an event loop:

* Watching for LoadBalancer services in the cluster
* Creating a cloud VM with the inlets server running on it
* Then it creates a Deployment inside your cluster to run the inlets client
* Finally it updates the LoadBalancer service with the public IP of the tunnel server

[Ivan Velichko wrote up a detailed explanation](https://iximiuz.com/en/posts/kubernetes-operator-pattern/) on how our operator works, including a great animation.

You'll need to decide which cloud account you want to use such as AWS, GCP, Azure, Linode, DigitalOcean, Scaleway, Vultr, Packet, etc.

Then you'll create a secret within the cluster with your cloud credentials.

After then you can deploy the operator.

You can simply expose a service, and wait a few seconds for your IP:

```bash
kubectl run nginx-1 --image=nginx --port=80 --restart=Always
kubectl expose pod/nginx-1 --port=80 --type=LoadBalancer

$ kubectl get services -w
NAME               TYPE        CLUSTER-IP        EXTERNAL-IP       PORT(S)   AGE
service/nginx-1    ClusterIP   192.168.226.216   <pending>         80/TCP    78s
service/nginx-1    ClusterIP   192.168.226.216   104.248.163.242   80/TCP    78s
```

You'll also find a Tunnel Custom Resource created for you:

```bash
$ kubectl get tunnels

NAMESPACE   NAME             SERVICE   HOSTSTATUS     HOSTIP         HOSTID
default     nginx-1-tunnel   nginx-1   provisioning                  342453649
default     nginx-1-tunnel   nginx-1   active         178.62.64.13   342453649
```

It's also possible to create the Tunnel Custom Resource yourself, for services which do not have a LoadBalancer type.

```yaml
apiVersion: operator.inlets.dev/v1alpha1
kind: Tunnel
metadata:
  name: openfaas-tunnel
  namespace: openfaas
spec:
  serviceRef:
    name: gateway
    namespace: openfaas
status: {}
```

Are you also wanting to run MetalLB or Kube-vip for local addressing?

It plays nicely with others like MetalLB and Kube-VIP, just set `annotatedOnly: true` in the Helm chart. Then for any service you want inlets to expose, run `kubectl annotate svc/name operator.inlets.dev/manage=1`.

Otherwise, any LoadBalancer service will be managed by the operator, and within a few seconds you'll have a public IP for any service you want to expose.

Personally, I recommend exposing an Ingress Controller or an Istio Ingress Gateway, this saves on costs and means you can tunnel all the microservices you need through a single tunnel server and client.

## Where next?

Not everyone needs to get public network ingress into a local cluster. So unless you have one of the use-cases we covered in the intro, you may not need to do anything at all.

Some of the time, you want to get private access to a cluster, without serving any public traffic. That use-case is served well by VPN solutions like ZeroTier, Wireguard, and Tailscale. Teleport's enterprise can also be useful here, if all you want is remote administrative access to a cluster, without exposing it publicly. Inlets can [also be used to make the Kubernetes API server accessible to the Internet](https://inlets.dev/blog/2022/07/07/access-kubernetes-api-server.html).

But what if you do need public network ingress?

If you want to use port-forwarding, that'll be cheap in cost, but it does come with limits and setup costs. With Ngrok, there's quite a lot of friction right now, so you may end up spending a lot of your own time trying to get something working. The Inlets Operator provides the most versatile and complete option, and it's actively used by individuals and commercial users from around the world.

* [Expose Ingress Nginx or another IngressController](https://docs.inlets.dev/tutorial/kubernetes-ingress/)
* [Expose an Istio Ingress Gateway](https://docs.inlets.dev/tutorial/istio-gateway/)
* [Expose Traefik with K3s to the Internet](https://inlets.dev/blog/2021/12/06/expose-traefik.html)

You can try out the inlets operator for free and we offer discounted personal licenses for hobbyists and individuals.

* [View the inlets operator readme](https://github.com/inlets/inlets-operator)
* [View the plans](https://inlets.dev/pricing)
* [Inlets FAQ](https://inlets.dev/reference/faq/)

See also:

* [Why do Developer Advocates like network tunnels?](https://inlets.dev/blog/2023/02/22/tunnels-for-developer-advocates.html)
* [Do your demos like a boss at KubeCon](https://blog.alexellis.io/kubecon-demos-like-a-boss/)
