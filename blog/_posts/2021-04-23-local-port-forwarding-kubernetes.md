---
layout: post
title: Reliable local port-forwarding from Kubernetes
description: Learn how one user cleared his headache and got reliable local port-forwarding for Kubernetes
author: Alex Ellis
tags: inlets-pro homelab hosting
author_img: alex
image: /images/2021-04-23-local-forwarding/background.jpg
date: 2021-04-13
---

Learn how one user cleared his headache and got reliable local port-forwarding for Kubernetes

## Introduction

A developer working on an API for the UK Government reached out to me and asked if he could use inlets to access a message queue from a GKE cluster on his laptop. The answer was yes, but we haven't documented it very well yet. I asked why he wasn't using `kubectl port-forward` and the answer surprised me.

The traditional use-case for inlets PRO has always been exposing or tunneling a service from a private cluster to a public cluster. This kind of forwarding is called **remote port forwarding** and is the use-case we're used to seeing with Ngrok. A port is forwarded to a remote cluster for access via its network. The difference between inlets and Ngrok or Argo tunnels, is that inlets can forward a service and also keep it private on the remote network by binding it to loopback, or a non-public adapter. inlets PRO customers tell me that they do this quite often for hybrid cloud use-cases and for continuous deployment to edge locations.

![Remote forwarding](/images/2021-04-23-local-forwarding/remote-forwarding.jpg)

> Remote forwarding pushes a local endpoint to a remote host for access on another network

The developer that contacted me wanted to "bring back" a remote service to his local computer without exposing it on the internet. This is called **local port forwarding**.

![local forwarding](/images/2021-04-23-local-forwarding/local-forwarding.jpg)

> Local forwarding brings a remote service back to localhost for accessing

## Try it out for yourself

The simplest experiment I could think of was to forward SSH from my Intel NUC to my Apple MacBook Air M1 which didn't have SSH running on it. At that point, running `ssh -p 22 localhost` on the Mac would have given me a connection to the NUC's SSH service.

My NUC had an IP of `192.168.0.35`, so I logged in, then ran:

```bash
inlets-pro tcp server \
  --auto-tls-san 192.168.0.35 \
  --token test1234 \
  --client-forwarding
```

The new flag here is `--client-forwarding`, because the client is forwarding ports and this is disabled by default for security.

Then on my M1, using Rosetta, I ran the `x86_64` binary:

```bash
inlets-pro tcp client \
  --local 2222:192.168.0.35:22 \
  --local-addr 127.0.0.1: \
  --ports 8000 \
  --url wss://192.168.0.35:8123 \
  --token test1234
```

The `--local` flag is really what we care about here. It's saying which ports need to be brought back from the remote network.

Then `--local-addr 127.0.0.1:` makes sure that the services that are brought back are only bound to loopback, so that nobody can access that SSH service on my local network.

Then finally, I just ran:

```bash
ssh -p 2222 localhost
```

It worked. On to the Kubernetes manifests.

## Replacing `kubectl port-forward`

It turns out that `kubectl port-forward` disconnects often and can give a poor connection for long-term use.

First we create a `Deployment` for the inlets PRO server. To get NATS installed I just installed OpenFaaS using `arkade install openfaas`, because [OpenFaaS](https://openfaas.com/) bundles NATS within its helm chart:

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inlets-server
  namespace: openfaas
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
        image: ghcr.io/inlets/inlets-pro:0.8.3
        imagePullPolicy: IfNotPresent
        command: ["inlets-pro"]
        args:
        - "server"
        - "--auto-tls=true"
        - "--common-name=192.168.0.35"
        - "--token=test1234"
        - "--client-forwarding"
```

Note the `--client-forwarding` flag. You can also create a secret and mount that as a volume instead of specifying a hard-coded value.

Next, decide whether you want to expose the control-plane via a NodePort or a LoadBalancer using the built-in automatic TLS encryption, or turn encryption off and let an IngressController do that instead.

I thought a LoadBalancer would be the easiest to understand for him:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: inlets-control
  namespace: openfaas
  labels:
    app: inlets-server
spec:
  type: LoadBalancer
  ports:
    - name: inlets-control
      port: 8123
      protocol: TCP
      targetPort: 8123
      nodePort: 30812
  selector:
    app: inlets-server
```

After applying those configurations, I checked that the service came up with `kubectl logs -n openfaas deploy/inlets-server` - it looked good.

Next up, it was time to give him the inlets client command, just like what we had before to access SSH:

```bash
inlets-pro tcp client \
  --local 4222:nats:4222 \
  --local-addr 127.0.0.1: \
  --ports 8000 \
  --url wss://192.168.0.35:8123 \
  --token test1234
```

That was it. I could then run the NATS CLI and do a benchmark on the NATS server running directly inside my OpenFaaS instance on my Intel NUC.

```bash
$ arkade install nats

/home/alex/.arkade/bin/nats bench test
10:43:24 Starting benchmark [msgs=100,000, msgsize=128 B, pubs=1, subs=0]
   0s [====================================================================] 100%

Pub stats: 397,314 msgs/sec ~ 48.50 MB/sec
```

He seemed to be running Linux, because he then generated a systemd service so that he could have the inlets client running all the time.

To generate your own just add the `--generate=systemd` flag to any inlets PRO command.

The user was so happy that he emailed me and said:

> ALEX!
> YOU ARE A STAR!
> You literally managed to solve my greatest headache
> Ps. If you don’t mind I’d like to describe your project and how it saved my life in my new article on Medium

That message made the whole exercise worth it, and of course he picked up a personal use license for himself after that.

## Wrapping up

In a short period of time, a user who was frustrated with the friction of existing and accepted tools find a workaround that saved him from a considerable headache. I had to go the extra mile, but hope that this little exercise we went through will help many more users to come who may have landed here.

Depending on the levels of interest, we may consider adding a feature to inlets pro or inletsctl to automate his kind of local port forwarding. You may also be interested in the `inletsctl kfwd` feature that was built last year for a similar usecase, where users wanted to remotely forward a local service into a Kubernetes cluster.

```bash
Forward a Kubernetes service to the local machine using the --if flag to 
specify an ethernet address accessible from within the Kubernetes cluster

Usage:
  inletsctl kfwd [flags]

Examples:
  inletsctl kfwd --from test-app-expressjs-k8s:8080
  inletsctl kfwd --from test-app-expressjs-k8s:8080 --if 192.168.0.14


Flags:
  -f, --from string        From service for the inlets client to forward
  -h, --help               help for kfwd
  -i, --if string          Destination interface for the inlets server
      --license string     Inlets PRO license key
  -n, --namespace string   Source service namespace (default "default")
      --pro                Use inlets PRO
```

Feel free [to reach out to me](https://inlets.dev/contact) if you have questions about inlets.

You can kick the tires for free with a 14-day trial using the link at the bottom of the page, or just check out the [various other tutorials and tools we have for you here](https://docs.inlets.dev/).
