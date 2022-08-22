---
layout: post
title: Fixing the Developer Experience of Kubernetes Port Forwarding
description: Alex shows you some of the frustrations of using kubectl for port-forwarding and how to fix the developer experience.
author: Alex Ellis
tags: developer kubernetes port-forwarding productivity
author_img: alex
image: /images/2021-10-allow-lists/background.jpg
date: 2022-06-24
---

Alex shows you some of the frustrations of using kubectl for port-forwarding and how to fix the developer experience.

## The magic of kubectl port-forward

I wrote up a feature-length article exploring all the ways that you can access a service from within your Kubernetes cluster.

The article covers pros and cons, and how-tos with the following approaches

* LoadBalancers
* NodePorts
* Port-forwarding with `kubectl port-forward`
* Ingress and Ingress Controllers

[A Primer: Accessing services in Kubernetes](https://blog.alexellis.io/primer-accessing-kubernetes-services/)

Out of all the options, the only one that we can guarantee will work on every cloud, Operating System and local desktop Kubernetes engine (Docker Desktop, KinD, K3d, Minikube), is port-forwarding.

That's the magic of port-forwarding, and both kubectl and inlets can enable it.

For Kubernetes users, who've installed OpenFaaS, you'll get Prometheus and the OpenFaaS gateway deployed as [part of the helm chart](https://github.com/openfaas/faas-netes/tree/master/chart/openfaas).

```bash
arkade install openfaas

kubectl get svc -n openfaas
NAME                TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
basic-auth-plugin   ClusterIP   10.43.175.214   <none>        8080/TCP         84d
dashboard           ClusterIP   10.43.88.246    <none>        8080/TCP         84d
gateway             ClusterIP   10.43.114.157   <none>        8080/TCP         84d
prometheus          ClusterIP   10.43.132.67    <none>        9090/TCP         84d
```

When you run `kubectl port-forward` a persistent connection is opened between your workstation and the cluster through the Kubernetes API server, usually exposed on port 443 or 6443 over TLS. The traffic is then proxied between your local host and the cluster.

```bash
kubectl port-forward -n openfaas \
  svc/gateway 8080:8080

curl -i http://127.0.0.1:8080/healthz
HTTP/1.1 200 OK
Content-Length: 2
Content-Type: text/plain; charset=utf-8
Date: Fri, 24 Jun 2022 08:31:27 GMT

OK
```

If you try to access the service via your local network, it will not work since port-forwarding only binds to the 127.0.0.1 address.

So if that's something you need, because like me, you run multiple computers on your home network, add the following:

```
--address 0.0.0.0

Forwarding from 0.0.0.0:8080 -> 8080
```

## The issues with kubectl's port-forwarding

1) If you restart a container, you have to restart the command

  This may sound trivial, however it's incredibly inconvenient if you are going through the "change/deploy/test" loop that we do so often when making enhancements to OpenFaaS or inlets itself.

2) There's no load balancing at all

  If you have three replicas of a HTTP service, and port-forward it with kubectl, then the command will only pick one of the replicas and stick to it. You can't load balance in any way.

3) You have to run the command for every service you want to port-forward

  This may be OK if you only have one service to poke at, but when you need OpenFaaS, Prometheus and perhaps one more thing that you're building, it creates a significant amount of typing and distraction.

4) It's unreliable and doesn't reconnect

  A developer in the UK government emailed me complaining of how he was port-forwarding NATS only to see it continually time-out and crash. He asked if inlets could help, and started using it in his daily workflow.
  
  It solved his "headache" (his words) and remains connected. If for some reason the tunnel disconnects, only inlets will continue trying to reconnect until it is successful. [Read the case-study here](https://inlets.dev/blog/2021/04/13/local-port-forwarding-kubernetes.html)

5) You have to mentally map different ports if they clash

  If you have three services which are all bound to port 8000, you need to change all your commands and keep them in mind, so that you allocate differing ports for them like 8081, 8082 and 8083. This is clunky, so can we do better?

But apart from the above points, it's incredibly convenient and I use it a lot myself.

## A better developer experience

We can fix all of the issues above by using inlets.

> "But I don't want to expose anything on the Internet you say!" I hear you say

I get that. Inlets is a tool for connecting any two networks together, it does not require you to expose anything on the Internet whatsoever.

We need three steps to get this working:

* A few entries in our /etc/hosts file so we can access different Kubernetes services
* An inlets server on our workstation, so we have a way to access services within the cluster
* An inlets client as a Kubernetes Pod, which will connect to our workstation to expose the services

You'll be able to run this on MacOS, Windows and Linux, including Arm, Raspberry Pi and Apple M1.

So let's install OpenFaaS and Grafana using arkade, so we have something to play with:

```bash
# Create a new cluster, or use one you already have
kind create cluster

arkade install openfaas
arkade install grafana --namespace openfaas
```

Even though we're on a local network, with no public access, we'll create a secure token an enable TLS:

```bash
openssl rand -base64 32 > token.txt
```

Now prepare the server command on your computer:

```bash
export LAN_IP="192.168.1.14"
export TOKEN="$(cat token.txt)"

inlets-pro http server \
  --auto-tls \
  --auto-tls-san $LAN_IP \
  --token $TOKEN \
  --port 8000
```

The port 8000 is what we'll use to access all of our services, then we will multiplex them by using different local addresses in our /etc/hosts file.

Edit /etc/hosts:

```bash
127.0.0.1   grafana.svc.local
127.0.0.1   openfaas.svc.local
127.0.0.1   prometheus.svc.local
```

Save the file, and now we are ready to connect the client from within the cluster.

Save inlets.yaml:

```bash
export LICENSE="$(cat $HOME/.inlets/LICENSE)"
export TOKEN="$(cat ./token.txt)"
export WORKSTATION="192.168.1.14"

cat > inlets-client.yaml <<EOF
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inlets-client
spec:
  replicas: 1
  selector:
    matchLabels:
      app: inlets-client
  template:
    metadata:
      labels:
        app: inlets-client
    spec:
      containers:
      - name: inlets-client
        image: ghcr.io/inlets/inlets-pro:0.9.5
        imagePullPolicy: IfNotPresent
        command: ["inlets-pro"]
        args:
        - "http"
        - "client"
        - "--url=wss://$WORKSTATION:8123"
        - "--upstream=prometheus.svc.local=http://prometheus.openfaas:9090"
        - "--upstream=gateway.svc.local=http://gateway.openfaas:8080"
        - "--upstream=grafana.svc.local=http://grafana.grafana:80"
        - "--token=$TOKEN"
        - "--license=$LICENSE"
---
EOF
```

For any of the entries in `/etc/hosts`, we just add them to the `args` section:

So for Prometheus we have:

`- "--upstream=prometheus.svc.local=http://prometheus.openfaas:9090"`

That says that for any requests we get that match the hostname of `prometheus.svc.local`, forward them to the cluster address of: `http://prometheus.openfaas:9090`

Now simply apply the deployment file to the cluster:

```bash
kubectl apply -f ./inlets-client.yaml

# Check its logs:

kubectl logs deploy/inlets-client -f
2022/06/24 08:51:35 Licensed to: Alex <contact@openfaas.com>, expires: 128 day(s)
2022/06/24 08:51:35 Upstream: prometheus.svc.local => http://prometheus.openfaas:9090
2022/06/24 08:51:35 Upstream: gateway.svc.local => http://gateway.openfaas:8080
2022/06/24 08:51:35 Upstream: grafana.svc.local => http://grafana.grafana:80
2022/06/24 08:51:35 unable to download CA from remote inlets server for auto-tls: Get "https://192.168.1.14:8123/.well-known/ca.crt": dial tcp 192.168.1.14:8123: connect: connection refused
time="2022/06/24 08:51:40" level=info msg="Connecting to proxy" url="wss://192.168.1.14:8123/connect"
time="2022/06/24 08:51:40" level=info msg="Connection established" client_id=1bdab2d4bef546c4b3c310e321a4b321
```

You can now access any of your forwarded services:

* `http://prometheus.svc.local:8000`
* `http://grafana.svc.local:8000`
* `http://gateway.svc.local:8000`

Got another service you want to add? Just edit inlets.yaml and apply it again with kubectl.

Over on your server, you'll see the requests being printed out as they come in:

```
inlets-pro http server   --auto-tls   --auto-tls-san $LAN_IP   --token $TOKEN   --port 8000
2022/06/24 09:51:35 Wrote: /tmp/certs/ca.crt
2022/06/24 09:51:35 Wrote: /tmp/certs/ca.key
2022/06/24 09:51:35 Wrote: /tmp/certs/server.crt
2022/06/24 09:51:35 Wrote: /tmp/certs/server.key
2022/06/24 09:51:35 TLS: 192.168.1.14, expires in: 2491.999998 days
2022/06/24 09:51:35 Control Plane Listening with TLS on 0.0.0.0:8123
2022/06/24 09:51:35 Data Plane Listening on 0.0.0.0:8000
2022/06/24 09:51:40 200 /connect
INFO[2022/06/24 09:51:40] Handling backend connection request [1bdab2d4bef546c4b3c310e321a4b321]
```

```bash
curl -i http://gateway.svc.local:8000/healthz

inlets-pro http server   --auto-tls   --auto-tls-san $LAN_IP   --token $TOKEN   --port 8000
2022/06/24 09:51:35 Wrote: /tmp/certs/ca.crt
2022/06/24 09:51:35 Wrote: /tmp/certs/ca.key
2022/06/24 09:51:35 Wrote: /tmp/certs/server.crt
2022/06/24 09:51:35 Wrote: /tmp/certs/server.key
2022/06/24 09:51:35 TLS: 192.168.1.14, expires in: 2491.999998 days
2022/06/24 09:51:35 Control Plane Listening with TLS on 0.0.0.0:8123
2022/06/24 09:51:35 Data Plane Listening on 0.0.0.0:8000
2022/06/24 09:51:40 200 /connect
INFO[2022/06/24 09:51:40] Handling backend connection request [1bdab2d4bef546c4b3c310e321a4b321] 
2022/06/24 09:53:01 Proxy: gateway.svc.local:8000 GET => /healthz
```

You can try out inlets with a monthly subscription, and we have discounted plans for developers or for personal use, too.

Here's what Han had to say about it, after switching over from `kubectl port-forward` for his daily work on OpenFaaS.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">My preferred method to access kubernetes services while developing locally:<br><br>Run a <a href="https://twitter.com/inletsdev?ref_src=twsrc%5Etfw">@inletsdev</a> tunnel server on my local machine and set up a client in the cluster.<br><br>Thanks for the great article <a href="https://twitter.com/alexellisuk?ref_src=twsrc%5Etfw">@alexellisuk</a> <a href="https://t.co/ryWFEYUDSC">https://t.co/ryWFEYUDSC</a></p>&mdash; Han Verstraete (@welteki) <a href="https://twitter.com/welteki/status/1537736586892349440?ref_src=twsrc%5Etfw">June 17, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

## Wrapping up

The port-forwarding I showed you today only needs one command and a simple Kubernetes YAML file to fix all the five issues I mentioned with `kubectl port-forward`.

So do I still use `kubectl port-forward`, despite its issues and poor developer experience? Of course. It's the lowest common denominator, which works on every cloud and OS. But it's really just meant for testing, and not for heavy, daily use.

So if you write and test code on a daily basis, inlets fixes the developer experience, and we hope you'll try it out in your workflow too.

The example I shows you uses a HTTP tunnel, but if you're working with TCP services, then you may want to check out the article I mentioned earlier in the post:

* [Case-study fixing TCP port-forwarding for UK Government with NATS](https://inlets.dev/blog/2021/04/13/local-port-forwarding-kubernetes.html)

Inlets can also replace VPNs for private uplinks, it doesn't need root or any Kernel modules, so it's easy to automate just how you like.

* [FAQ: how is inlets different from VPNs and SaaS tunnels?](https://docs.inlets.dev/reference/faq/)

And of course, it can be used to expose public endpoints, but we didn't talk about that use-case today. If you're on Kubernetes, our operator can provide public IPs and LoadBalancers:

* [GitHub inlets/inlets-operator](https://github.com/inlets/inlets-operator)

Want to talk to us about inlets or networking in containers?

[Reach out to us via email, for a meeting.](https://inlets.dev/contact)

