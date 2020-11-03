---
layout: post
title: Preparing for the Docker Hub Rate Limits
description: On Nov 1st, all images pulled from the Docker Hub will be subjected to severe limits, which will affect all Kubernetes users. Find out how to prepare.
author: Alex Ellis
tags: registry containers docker dockerhub
author_img: alex
image: /images/2020-10-preparing-docker-hub/containers.jpg
date: 2020-10-29
---

On Nov 1st, all images pulled from the Docker Hub will be subjected to severe limits, which will affect all Kubernetes users. Learn what solutions exist, and how how to prepare.

## Introduction

[Docker](Docker) is both a company and [an Open Source project](https://github.com/docker/docker) which revolutionised how users deploy code to production. Containers rather than Virtual Machines (VMs) are now considered the lingua franca of deployments, and containers are packed in "images". These images need to be distributed through a container registry, such as the registry created and operated by Docker called the [Docker Hub](https://hub.docker.com/).

![Container shipment](/images/2020-10-preparing-docker-hub/containers.jpg)

Up until recently, public images were able to be pulled as many times as needed by a user with no rate-limiting, gating, or payments getting in the way. On Nov 1st, that is all going to change an the following will come into play:

* Unauthenticated users: 100 pulls / 6 hours
* Authenticated users: 200 pulls / 6 hours
* Paying, authenticated users: unlimited downloads

See also: [Docker Hub rate limits & pricing](https://www.docker.com/pricing)

[Kubernetes](https://kubernetes.io) users will be most affected, since it's very common to push and pull images during development many times with each revision of a container. Even bootstrapping a cluster with 10 nodes, each of which needs 10 containers just for its control-plane and could exhaust the unauthenticated limit before you've even started getting to the real work. This is compacted where companies use a shared IP address, shared cloud infrastructure, or a VPN, as the Docker Hub will use the shared IP address.

That limit of 100 pulls can be extended to 200 pulls, but requires complex configuration of your Kubernetes cluster with ["image pull secrets"](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/) in each namespace and each ServiceAccount throughout the cluster. Docker Hub users who pay Docker will be able to pull an unlimited amount of images, without rate-limiting, however this still requires "image pull secrets" to be configured.

You will be able to check your rate-limit level using a new Docker Hub API. Read more: [Docker Hub Download rate limit](https://docs.docker.com/docker-hub/download-rate-limit/).

## Potential solutions

You will hit the limit, eventually, and so it's best to prepare yourself and team for that eventually, than to scramble to StackOverflow when that day arrives.

In addition to several alternatives, I want to show you how to use the [registry-creds operator](https://github.com/alexellis/registry-creds/) built to help new users learning Kubernetes, and those who are developing images locally.

For Kubernetes learners, whichever solution you go for (including paying for a Docker Hub account), this is going to be an additional step. The learning curve is steep enough already, but now rather than installing Kubernetes and getting on with things, a suitable workaround will need to be deployed on every new cluster.

### Use a local mirror of the Docker Hub

Setting up a mirror is fairly straight-forward, but will require additional infrastructure, storage, and maintenance. You may also have to factor in bandwidth costs. In the remote-work situation we are all currently in, does that mean setting up a mirror/cache on each employee's machine, on the VPN, or the public Internet?

Someone in the team will need to own the mirror and have a good way to restore it quickly, if it crashes.

There is an [arkade](https://get-arkade.dev/) app for setting up a Docker registry on your own Kubernetes cluster:

```bash
arkade install docker-registry
```

This configuration enables authentication, so that you don't have to worry about finding out how to do that yourself.

```bash
arkade install docker-registry-ingress \
  --email web@example.com \
  --domain reg.example.com
```

It also has automation to get a TLS certificate set-up, as nobody really wants to mess about with self-signed CAs, do they?

And if you're running on your own hardware, or on-premises, you can use the [inlets-operator](https://github.com/inlets/inlets-operator) to expose it on the Internet securely.

```bash
export LICENSE="INLETS_PRO_LICENSE_JWT"
export ACCESS_TOKEN=$HOME/access-token

arkade install inlets-operator \
 --provider digitalocean \
 --region lon1 \
 --token-file $ACCESS_TOKEN \
 --license $LICENSE
```

See a complete tutorial here for [setting up a local Docker registry with a public IP address](https://blog.alexellis.io/get-a-tls-enabled-docker-registry-in-5-minutes/).

Docker docs: [Registry as a pull through cache](https://docs.docker.com/registry/recipes/mirror/)

### Configure an image pull secret

Whether you pay Docker for unlimited pulls, or want to use your free account to bump up to 200 pulls per 6 hours, you'll need to log in.

This generally consists of three steps:

1) Create an image pull secret in each Kubernetes namespace

From the [OpenFaaS docs](https://docs.openfaas.com/deployment/kubernetes/#set-a-custom-imagepullpolicy)

```bash
kubectl create secret docker-registry my-private-repo \
    --docker-username=$DOCKER_USERNAME \
    --docker-password=$DOCKER_PASSWORD \
    --docker-email=$DOCKER_EMAIL \
    --namespace openfaas-fn
```

2) Attach the secret to any Service Accounts in each namespace

```bash
kubectl edit serviceaccount default -n openfaas-fn
```

Most users can get away with just editing the `default` serviceaccount, however if you have more than one serviceaccount you'll have to edit each of them.

At the bottom of the manifest add:

```yaml
imagePullSecrets:
- name: my-private-repo
```

At that point, you can now deploy a container to the `openfaas-fn` namespace, and as long as the Pod is using the `default` service account, it will pull from the Docker Hub using the credentials provided in the `my-private-repo` secret.

### Use a public Docker Hub mirror

It appears that Google Cloud are offering a mirror of the Docker Hub at `mirror.gcr.io`

So you can change your images as follows:

```Dockerfile
FROM ubuntu:latest
```

to:

```Dockerfile
FROM mirror.gcr.io/library/ubuntu:latest
```

This may be worth while for Google Cloud customers, but read all the terms and conditions before switching over.

See also: [Google Cloud - Pulling cached Docker Hub images](https://cloud.google.com/blog/products/containers-kubernetes/mitigating-the-impact-of-new-docker-hub-pull-request-limits)

### Publish your own images to another registry

Since the Docker Hub rate limits pass the burden on to the end-user, and not the maintainers/vendors, you could consider using another registry all-together.

Just be careful that you don't incur a huge bill. Make sure you know the costs of bandwidth and are aware of any limits that are in place.

The best option at present seems to be [GitHub's container registry (ghcr.io)](https://github.com/features/packages) which offers unlimited pulls of public images. Beware that the original GitHub Package Repository for containers is not the same product, and cannot support multi-arch templates.

On the inlets project we've already started publishing an image in GHCR so that users don't have to contend with this issue.

Before:

```bash
docker pull inlets/inlets-pro:0.7.3
docker pull docker.io/inlets/inlets-pro:0.7.3
```

> Note that the `docker.io` prefix is implicit, we are just not use to typing it in.

After:

```bash
pull ghcr.io/inlets/inlets-pro:0.7.3
```

It's a little more typing, and maintainers have to change their projects, but this seems like a good balance.

## Our solution for ImagePullSecrets

Finally, I wanted to introduce our solution for managing ImagePullSecrets. We developed a Kubernetes operator which will propagate your registry credentials, whether for the Docke Hub or some other registry to every namespace in your cluster.

We're releasing this as a free and open-source project on GitHub and you will be able to pull an image from GHCR to avoid a chicken-and-egg situation.

* Star or fork on GitHub: [alexellis/registry-creds](https://github.com/alexellis/registry-creds)

![Diagram](https://github.com/alexellis/registry-creds/blob/master/diagram.jpg?raw=true)

> How it works: an initial secret is created, which is then copied into each namespace, and attached to each ServiceAccount

Here's how you can try it out:

* Use the arkade tool to download some tools and start a cluster, if you don't already have one:

```bash
curl -SLs https://dl.get-arkade.dev|sh
sudo mv arkade /usr/local/bin/

arkade get kind
arkade get kubectl
kind create cluster
```

* Create a secrets file `~/.docker-creds`

```bash
export DOCKER_USERNAME=username
export DOCKER_PASSWORD=password
export DOCKER_EMAIL=email

# Optional
export DOCKER_SERVER=""
```

* Install registry-creds with arkade

The app applies the manifest for the controller and its CRD called `ClusterPullSecret` then creates an initial Kubernetes seed secret and attaches it to a new `ClusterPullSecret`. Of course, if you prefer then you can do all of this manually and there are [instructions in the README](https://github.com/alexellis/registry-creds).

```bash
source ~/.docker-creds
arkade install registry-creds --from-env
```

If you prefer, then you can also specify each flag, however be careful of leaking your credentials into your bash history:

```bash
arkade install registry-creds \
  --username "${DOCKER_USERNAME}" \
  --password "${DOCKER_PASSWORD}" \
  --email  "${DOCKER_EMAIL}"
```

* Deploy an image

```bash
kubectl run nginx-1 --image=nginx --port=80 --restart=Always
```

The image will now be pulled from the Docker Hub using the credentials you specified when installing the registry-creds arkade app.

If you want to prove that the secret is being used, try creating a private container image, and then deploying that with the command above.

## Wrapping up

In conclusion, there are some changes coming to the Docker Hub that are potentially going to affect every user of container images. Kubernetes users are going to suffer the worst, especially new users who are just starting out on their journey. There are mitigations such as a pull-through and caching registry, which are actually a good idea anyway to make your environment faster. Configuring an ImagePullSecret is likely to be required whatever you decide to do, and the `registry-creds` operator we created is ready for the task.

Feel free to [Star or Fork the registry-creds project on GitHub](https://github.com/alexellis/registry-creds). Feature requests are welcome.

All the tools mentioned here which are maintained by [OpenFaaS Ltd](https://www.openfaas.com/) are multi-arch compatible, so you can run these steps on your home lab, ARM64 server, or on a Raspberry Pi.

You can follow [@inletsdev](https://twitter.com/inletsdev) and myself [@alexellisuk](https://twitter.com/alexellisuk) on Twitter

You may also like:

* [Get a TLS-enabled Docker registry in 5 minutes](https://blog.alexellis.io/get-a-tls-enabled-docker-registry-in-5-minutes/)
* [Consuming Public Content by opencontainers.org](https://opencontainers.org/posts/blog/2020-10-30-consuming-public-content/)
* [Expose your private Grafana devops dashboards with Caddy and TLS](https://blog.alexellis.io/expose-grafana-dashboards/)
