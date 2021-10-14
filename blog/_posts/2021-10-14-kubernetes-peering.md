---
layout: post
title: Connecting services to Kubernetes clusters with inlets, VPC Peering and direct uplinks.
description: Find out how Inlets, VPC Peering and direct uplinks can be used to connect services into your clusters.
author: Alex Ellis
tags: containers hybridcloud
author_img: alex
image: /images/2021-09-compose/writing.jpg
date: 2021-10-14
---

Find out how Inlets, VPC Peering and direct uplinks can be used to connect services into your [Kubernetes](https://kubernetes.io/) clusters.

We'll take a quick look at how SaaS vendors offer VPC peering to give you private, fast access to their managed services within your cluster, then at some of the limitations and how we might overcome them.

Common use-cases for connecting services to your cluster may include: customer support, monitoring, remote deployments and accessing services from SaaS vendors.

## Connecting things to your cluster

What is VPC Peering and when might you use it? You may have heard of some SaaS vendors aka. Independent Service Providers (ISVs) services like [Datastax](https://datastax.com), [Aiven](https://aiven.io) and [Atlas](https://www.mongodb.com/cloud/atlas).

They provide highly available, secure, and managed databases and message queues for their customers in a particular AWS or GCP region. They use their own cloud accounts, and pay the bills for the infrastructure themselves, passing on the costs to the customer in the form of a monthly fee - either a flat fee, or based upon consumption.

Many cloud providers offer the concept of Virtual Private Cloud (VPCs) which are normally used to separate and segregate your various systems and teams within an account. At times, you may want to join two of these VPCs and would use VPC Peering to connect them.

![Unable to peer](/images/2021-10-kubernetes-peering/no-peering.png)

VPC Peering can also be used to join a service from an ISV to your network, for instance: imagine that you paid for a managed MongoDB from Atlas. That would enable you to access the MongoDB service via a private IP address over the peered VPC network. This removes the need to expose it on the Internet, so it could reduce the latency, increase security and lower the costs associated with egress bandwidth. That's because VPC Peering tends to stay completely within the cloud network and backbone, without any traffic needing to leave the region.

![Joining two private networks](/images/2021-10-kubernetes-peering/peered.png)

## Where VPC peering may fall short

Two problems may occur, where VPC peering may fall short.

1) You are paying for a managed service in a different cloud to where you run your workloads. I.e. DataStax Astra (managed Cassandra) on GCP and AWS EKS, so there is no possibility to use the provided VPC peering here.
2) You are running your own services on-premises in your own private clouds, or in a customer's datacenter, and there is no VPC peering solution that you can use.

In the first scenario, you may decide to make the service public on the Internet and then implement an IP address whitelist, so that only select egress IP addresses in your datacenter can access the managed service. Unfortunately, it is trivial to spoof IP addresses, so this is not bulletproof as a solution.

For the second scenario, exposing a private on-prem service can involve all kinds of process and in-house security teams generally take a protective stance here. If you do succeed in exposing a service behind NAT, firewalls or corporate proxies, it will involve opening a number of ports for every service you need to access.

## Looking at alternatives

There is an alternative, you could set up your own VPNs, at which point you join the entire network from point A to point B. A client may be reluctant to peer their private datacenter to your cluster.

At this point, let's introduce inlets. Inlets is a private tunnel which can be used to connect individual services to your Kubernetes cluster in the same way as a VPC peering.

Inlets has two parts:
* a control plane which should be accessible and public to your remote cluster.
* a data plane, which can be public or private which is used to access the service i.e. MongoDB or Cassandra.

![Joining a service via inlets](/images/2021-10-kubernetes-peering/metering.png)

> Connecting a REST Metering service from a client's data-center for the purposes of billing and monitoring.

In the diagram above, we are running a product in an AWS EKS cluster and want to observe the amount of cores and GB of RAM in each of our client's datacenters, so that we can produce an accurate bill each month.

As discussed earlier, the client has no way to peer VPCs with us. Setting up a VPN such as OpenVPN or Wireguard requires specific technical skills and specialist security knowledge. Instead, the client runs an "inlets client" which connects outbound without needing to open any ports or to create firewall exceptions.

It connects to an inlets server in our EKS cluster exposed via an Application Load Balancer, or a Kubernetes Ingress rule.

Our cluster is then able to access the metering service via a private ClusterIP service.

Before showing you an example of what this would look like in Kubernetes YAML manifests, it's worth noting that there are some alternatives available, but these may be much more expensive.

Equinix launched an interconnect service called Cloud Exchange which allows service provides to join networks through a central hub and high speed links: [Equinix Cloud Exchange Brings New Level of Interconnection and Potential to the Cloud](https://blog.equinix.com/blog/2014/04/30/equinix-cloud-exchange-brings-new-level-of-interconnection-and-potential-to-the-cloud/)

AWS also have a similar product: [AWS Direct Connect](https://aws.amazon.com/directconnect/).

Azure has a similar product called: [Express Route](https://azure.microsoft.com/en-gb/services/expressroute/#overview)

In contrast, inlets is a lightweight, low-cost solution which is easy to scale and automate through Kubernetes and containers.

Inlets also has some advantages over a VPN, in that it can be scaled to thousands of connections or clients by using the helm chart (more on that later). In addition, it's easy to monitor through cloud native tools such as Prometheus: [Measure and monitor your inlets tunnels](https://inlets.dev/blog/2021/08/18/measure-and-monitor.html).

On the other hand, Cloud Exchange, AWS or Azure may be more suitable if you only need to uplink a single service, have a large budget, need to connect multiple nodes and hosts instead of individual HTTPS or TCP services.

## What it looks like in YAML

This is what the LoadBalancer may look like for the control-plane, which is public, but authenticated and encrypted with TLS:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: inlets-control
  labels:
    app: inlets-server
spec:
  type: LoadBalancer
  ports:
    - name: inlets-control
      port: 8123
      protocol: TCP
      targetPort: 8123
      nodePort: 30023
  selector:
    app: inlets-server
```

Then there's a separate service for the data-plane, which our internal Pods will connect to:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tunnel-client-1-ssh
  labels:
    app: inlets-server
spec:
  type: ClusterIP
  ports:
    - name: inlets-ssh-data
      port: 8080
      protocol: TCP
      targetPort: 8080
  selector:
    app: inlets-server
```

Both of the services point to the same `inlets-server` deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inlets-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: inlets-server
  template:
    metadata:
      labels:
        app: inlets-server
    spec:
      containers:
      - name: inlets-server
        image: ghcr.io/inlets/inlets-pro:0.9.0
        imagePullPolicy: IfNotPresent
        command: ["inlets-pro"]
        args:
        - "server"
        - "--auto-tls=true"
        - "--auto-tls-san=ALB_IP"
        - "--token=TOKEN"
```

You can see the example manifest in the inlets-pro repo: [artifacts/split-plane-server.yaml](https://github.com/inlets/inlets-pro/blob/master/artifacts/split-plane-server.yaml)

The client can run as a regular Windows, Linux or MacOS process, as a container or as a Kubernetes Pod.

```bash
inlets-pro tcp client \
  --url wss://ALB_IP:8123 \
  --token-file /etc/inlets/token \
  --upstream metering-service
  --ports 8080
```

At that point, Pods inside your cluster can access the client's service via the ClusterIP service we defined above.

The control-plane is protected through the use of TLS encryption and a shared authentication token.

## Conclusion

We talked about VPC Peering, which is a way to connect two or more cloud networks together within the same provider, traditional VPNs and cloud interconnect products such as DirectConnect, Express Route and Equinix Cloud Exchange.

The time and experience required to [deploy inlets](https://docs.inlets.dev/) means that you could have a tunnel up and running within a few minutes, the other solutions we explored have different pros & cons, but are all likely to take much longer and require additional maintenance.

> inlets is a versatile tunnel / proxy that can connect external services to your cluster, bring Ingress into a private cluster behind firewalls, or help you receive webhooks during development.
> 
> [Feel free to reach out to us if you have any questions](https://inlets.dev/contact).

There's a helm chart available for the inlets-pro client and server on GitHub: [inlets/inlets-pro](https://github.com/inlets/inlets-pro/tree/master/chart)

You can also use inlets to get Ingress into a private cluster, exposing the local [Kubernetes Ingress Controller](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/) such as Traefik, IngressNginx or the Istio Gateway.

* [Expose the Istio Gateway](https://blog.alexellis.io/a-bit-of-istio-before-tea-time/)
* [Expose Traefik, IngressNginx or another Ingress Controller](https://inlets.dev/blog/2021/07/08/short-lived-clusters.html)

Case-studies and further reading:

* [Learn how to manage apps across private Kubernetes clusters](https://inlets.dev/blog/2021/06/02/argocd-private-clusters.html)
* [How we scaled inlets to thousands of tunnels with Kubernetes](https://inlets.dev/blog/2021/03/15/scaling-inlets.html)
* [The Simple Way To Connect Existing Apps to Public Cloud](https://inlets.dev/blog/2021/04/07/simple-hybrid-cloud.html)

You can watch inlets in action with Kubernetes in this live-stream:

{% include youtube.html id="qbR4brn8o6U" %}

## Try it out for yourself

If you'd like to kick the tires, or try inlets out for Ingress into your development cluster, then you may also like the [Inlets Operator for Kubernetes](https://github.com/inlets/inlets-operator). It will provision a tunnel server for any LoadBalancer services in your local cluster.

Would you like to talk to use about how to use inlets for your company? Feel free to [get in touch with us via email](https://inlets.dev/contact).