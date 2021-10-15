---
layout: post
title: Fixing Ingress for short-lived local Kubernetes clusters
description: Learn how to get Ingress for clusters that you re-create often during development.
author: Alex Ellis
tags: inlets-pro secure tcp loadbalancer
author_img: alex
image: /images/2020-11-ipv6-proxy/top.jpg
date: 2021-07-08
---

## Introduction

Do you ever find yourself wishing that you could get Ingress into your local or private Kubernetes clusters? Perhaps it's during development, a CI job with KinD, or a customer demo.

It wasn't long after creating the first version of [inlets](https://github.com/inlets/) that my interest turned to [Kubernetes](https://kubernetes.io/). Could the operator pattern help me bring Ingress and TCP LoadBalancers to clusters hidden behind firewalls, HTTP Proxies and NAT?

> The answer was yes, but if you delete and re-create your cluster many times in a day or week, there may be a better fit for you.

Let's first recap how the operator works.

I got the first proof of concept working 5 Oct 2019 using [Equinix Metal](https://equinixmetal.com/) (née Packet) for the hosting. It watched for Services of type LoadBalancer, then provisioned a cloud instance using an API token and

This was actually recorded on the last day of vacation, that's how badly I wanted to see this problem fixed:

{% include youtube.html id="LeKMSG7QFSk" %}

Since then, support for around a dozen clouds was added including AWS EC2, GCP, Linode, Vultr, DigitalOcean, Azure and others.

Installing the inlets-operator brings LoadBalancers to any Kubernetes cluster, why would you want that?

* You're deploying to public cloud and want a similar test environment
* You self-host services with a Raspberry Pi and K3s or in a homelab
* You have an on-premises Kubernetes cluster and want others to access services / endpoints

### The workflow explained

The Kubernetes Operator encodes the knowledge and experience of a human operator into code. For inlets, it took my knowledge of creating a cloud instance, installing the inlets tunnel server software, then running a client pod in my local cluster.

[Ivan Velichko](https://twitter.com/iximiuz) who is an SRE at Booking.com created an animation to show exactly what happens and in what order

![Demo GIF](https://iximiuz.com/kubernetes-operator-pattern/kube-operator-example-opt.gif)

> Read more about Operators in [Ivan's blog post](https://iximiuz.com/en/posts/kubernetes-operator-pattern)

### Where operators fall short

The operator is ideal for a single user, with a single long-lived cluster. That could be your Raspberry Pi, a private data center or a local K3d, KinD or minikube cluster.

The IP will go with you, and because the client runs as a Pod, it will restart whenever there's an interruption in traffic, like going to your local cafe.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">inlets-operator brings a Service LoadBalancer with public IP to any Kubernetes cluster i.e. minikube/k3d/KinD/kubeadm<br><br>I set up <a href="https://twitter.com/OpenFaaSCloud?ref_src=twsrc%5Etfw">@openfaascloud</a> on my laptop at home, when I got to a coffee shop it reconnected with the same public IP from <a href="https://twitter.com/digitalocean?ref_src=twsrc%5Etfw">@digitalocean</a>😱<a href="https://t.co/PanfWfMRlT">https://t.co/PanfWfMRlT</a> <a href="https://t.co/hHCeMRW7z2">pic.twitter.com/hHCeMRW7z2</a></p>&mdash; Alex Ellis (@alexellisuk) <a href="https://twitter.com/alexellisuk/status/1185179594040717312?ref_src=twsrc%5Etfw">October 18, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

But here's three scenarios where the operator may fall short:

* If you have dozens of team members all using the inlets-operator, then there will potentially be a lot of VMs created and it could be hard to manage them centrally.
* Secondly, the operator requires an access token to provision the cloud host.
* Thirdly, if you delete your cluster, external resources cannot be cleaned up

The third issue isn't specific to inlets, if you delete the LoadBalancer service, or delete the operator then any external VMs will be cleaned up and removed. But it turns out that some people are too lazy to do that, and at times I may also be included in that group.

There is a simply work-around to this problem.

* Create a VM and collect its connection details
* Share or store the details of the VM
* Run the client with YAML or the helm chart

The [inletsctl](https://github.com/inlets/inlestctl) tool uses the same code as [inlets-operator](https://github.com/inlets/inlets-operator) to provision VMs, so we can use that for the first step.

Install the tool:

```bash
# sudo is optional and is used to move the binary to /usr/local/bin/
curl -SLfs https://inletsctl.inlets.dev | sudo sh
```

Then explore the options and providers with `inletsctl create --help`. The key options you'll need are `--provider`, `--region` and `--access-token-file`.

```bash
inletsctl create \
  --access-token-file ~/Downloads/do-access-token \
  --provider digitalocean \
  --region lon1

Using provider: digitalocean
Requesting host: upbeat-jackson5 in lon1, from digitalocean
2021/07/08 10:42:23 Provisioning host with DigitalOcean
Host: 253982495, status: 
[1/500] Host: 253982495, status: new
..
[11/500] Host: 253982495, status: active
```

Note the output with its sample connection command, IP address and auth token for the tunnel server.

```bash
inlets Pro TCP (0.8.3) server summary:
  IP: 165.227.232.164
  Auth-token: DP4bepIxuNXbjbtXWsu6aSkEE9r5cvMta56le2ajP7l9ajJpAgEcFxBTWSlR2PdB

Command:

# Obtain a license at https://inlets.dev
# Store it at $HOME/.inlets/LICENSE or use --help for more options
export LICENSE="$HOME/.inlets/LICENSE"

# Give a single value or comma-separated
export PORTS="8000"

# Where to route traffic from the inlets server
export UPSTREAM="localhost"

inlets-pro tcp client --url "wss://165.227.232.164:8123" \
  --token "DP4bepIxuNXbjbtXWsu6aSkEE9r5cvMta56le2ajP7l9ajJpAgEcFxBTWSlR2PdB" \
  --upstream $UPSTREAM \
  --ports $PORTS
```

Let's imagine you've deployed Nginx to your cluster, and that's what you want to expose.

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-1
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
EOF
```

Now create a private ClusterIP for the Deployment, so that it can be accessed:

```bash
kubectl expose deployment nginx-1 --port=80 --type=ClusterIP
```

Then deploy a tunnel client that forwards traffic to the `nginx-1` service on port 80.

inlets-pro has two [helm charts](https://github.com/inlets/inlets-pro/tree/master/chart) which can be used to run both a client or server as Pods within your cluster

You can write your own YAML manually for an inlets-pro client, or deploy the chart for the client.

First create a secret for your inlets-pro license key:

```bash
kubectl create secret generic -n default \
  inlets-license --from-file license=$HOME/.inlets/LICENSE
```

Then create a secret for the auth token:

```bash
kubectl create secret generic -n default \
  nginx-1-tunnel-token \
  --from-literal token=DP4bepIxuNXbjbtXWsu6aSkEE9r5cvMta56le2ajP7l9ajJpAgEcFxBTWSlR2PdB
```

```bash
git clone https://github.com/inlets/inlets-pro
cd inlets-pro/chart/inlets-pro-client

helm upgrade --install \
  --namespace default \
  --set autoTLS=true \
  --set ports=80 \
  --set upstream=nginx-1 \
  --set url=wss://165.227.232.164:8123 \
  --set tokenSecretName=nginx-1-tunnel-token \
  --set fullnameOverride="nginx-1-tunnel" \
  nginx-1-tunnel \
  ./
```

The key fields you need to set are:

* `ports` - this is a comma separated list of TCP ports to expose on the remote server
* `upstream` - this is the DNS name of the service to forward traffic to which is accessible within the cluster, in this instance it's our ClusterIP

The other fields correspond to the name of the tunnel or are defaults.

You'll see a deployment created by the helm chart with the name you specified in the `fullnameOverride`:

```bash
kubectl get deploy/nginx-1-tunnel
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
nginx-1-tunnel   1/1     1            1           39s
```

And you can check the logs for more details:

```bash
kubectl logs deploy/nginx-1-tunnel
```

Then try to access your Nginx service via the public IP of your inlets tunnel server:

```bash
curl -i http://165.227.232.164:80
HTTP/1.1 200 OK
Server: nginx/1.14.2
Date: Thu, 08 Jul 2021 10:03:09 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 04 Dec 2018 14:44:49 GMT
Connection: keep-alive
ETag: "5c0692e1-264"
Accept-Ranges: bytes

<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
```

### What about my Ingress Controller?

Let's say that you wanted to expose Traefik or ingress-nginx, how does that compare?

Create a secret for the auth token:

```bash
kubectl create secret generic -n default \
  traefik-tunnel-token \
  --from-literal token=DP4bepIxuNXbjbtXWsu6aSkEE9r5cvMta56le2ajP7l9ajJpAgEcFxBTWSlR2PdB
```

Just follow the steps from before, then change the helm install to the following:

```bash
git clone https://github.com/inlets/inlets-pro
cd inlets-pro/chart/inlets-pro-client

helm upgrade --install \
  --namespace kube-system \
  --set autoTLS=true \
  --set ports=80,443 \
  --set upstream=traefik \
  --set url=wss://165.227.232.164:8123 \
  --set tokenSecretName=traefik-tunnel-token \
  --set fullnameOverride="traefik-tunnel" \
  traefik-tunnel \
  ./
```

What changed?

* The namespace is now `kube-system` to match where K3s installs Traefik by default
* The ports are 80 and 443, so that Traefik or cert-manager can respond to HTTP01 Acme challenges to issue certificates
* The upstream service is changed to `traefik`

There's also a dashboard port on 8080, you can add that to the list if you wish.

Finally, the name is updated. You can install the helm chart for the inlets client or server as many times as you like.

### Production use and travel

If you close the lid on your laptop and open it in a coffee shop and connect to their captive WiFi portal, your IP address will go with you and will work just the same there or on the other side of the world after a 12 hour flight to San Francisco.

I showed you how to expose a single HTTP service, but TCP services are also supported like MongoDB or Postresql.

For a production configuration, you are more likely to want to expose an IngressController or an [Istio](https://istio.io) Gateway. In this way, you just pay for a single exit server created with [inletsctl](https://github.com/inlets/inletsctl) or [the operator](https://github.com/inlets/inlets-operator) and make sure that you have TLS encryption enabled for any traffic you serve.

* [Istio Gateway with TLS](https://blog.alexellis.io/a-bit-of-istio-before-tea-time/)
* [Expose Your IngressController and get TLS from LetsEncrypt and cert-manager](https://docs.inlets.dev/#/get-started/quickstart-ingresscontroller-cert-manager?id=expose-your-ingresscontroller-and-get-tls-from-letsencrypt)

An IngressController can also be used to set authentication for your endpoints and for testing OAuth2 workflows.

## Wrapping up

We looked at how the operator pattern works and encoded my operational experience of inlets into code, and also where it fell short in one or two scenarios. Then I showed you how to create a tunnel server manually and then deploy an inlets client using YAML.

[Miles Kane](https://twitter.com/milsman2) uses inlets Pro to get access to his own services running on a HA K3s cluster built with Raspberry Pis.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr"><a href="https://twitter.com/alexellisuk?ref_src=twsrc%5Etfw">@alexellisuk</a> 3 nodes <a href="https://twitter.com/Raspberry_Pi?ref_src=twsrc%5Etfw">@Raspberry_Pi</a> <a href="https://twitter.com/HAProxy?ref_src=twsrc%5Etfw">@HAProxy</a> <a href="https://twitter.com/keepalived?ref_src=twsrc%5Etfw">@keepalived</a> 3 nodes <a href="https://twitter.com/kubernetesio?ref_src=twsrc%5Etfw">@kubernetesio</a> <a href="https://twitter.com/hashtag/k3sup?src=hash&amp;ref_src=twsrc%5Etfw">#k3sup</a> <a href="https://twitter.com/hashtag/master?src=hash&amp;ref_src=twsrc%5Etfw">#master</a> <a href="https://twitter.com/hashtag/embedded?src=hash&amp;ref_src=twsrc%5Etfw">#embedded</a> <a href="https://twitter.com/hashtag/etcd?src=hash&amp;ref_src=twsrc%5Etfw">#etcd</a> 3 nodes workers. <a href="https://twitter.com/nginx?ref_src=twsrc%5Etfw">@nginx</a> <a href="https://twitter.com/hashtag/Kubernetes?src=hash&amp;ref_src=twsrc%5Etfw">#Kubernetes</a> <a href="https://twitter.com/hashtag/ingress?src=hash&amp;ref_src=twsrc%5Etfw">#ingress</a> and <a href="https://twitter.com/inletsdev?ref_src=twsrc%5Etfw">@inletsdev</a> <a href="https://twitter.com/hashtag/pro?src=hash&amp;ref_src=twsrc%5Etfw">#pro</a> <a href="https://twitter.com/hashtag/operator?src=hash&amp;ref_src=twsrc%5Etfw">#operator</a> <a href="https://t.co/FNTMIDClpC">pic.twitter.com/FNTMIDClpC</a></p>&mdash; milsman2 (@milsman2) <a href="https://twitter.com/milsman2/status/1417672558183333893?ref_src=twsrc%5Etfw">July 21, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

The exit-servers can also be hosted within a public Kubernetes cluster, it might be a good option for a large team, or for part of a SaaS product that needs to expose endpoints dynamically.

You can get a copy of inlets Pro for personal or business use [in the store](https://inlets.dev/pricing/)
