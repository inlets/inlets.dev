---
layout: post
title: Run an inlets Pro tunnel server for free on fly.io
description: Learn how to configure, deploy and run an inlets Pro server for free on the Fly application platform.
author: Johan Siebens
tags: inlets-pro secure https tunnel
author_img: jsiebens
image: /images/2021-07-inlets-fly-tutorial/background.jpg
date: 2021-07-07
---

## Introduction

This little story started with Alex learning more about the Fly platform and reaching out to me on Slack:

> Alex Ellis: Would you check out fly.io for hosting an inlets Pro tunnel server? They have a "generous free tier" for hosting containers.
>
> Me: Sounds interesting!

What is the [Fly Application Platform](https://fly.io)? In their documentation we found the following description:

_Fly is a platform for applications that need to run globally. It runs your code close to users and scales compute in cities where your app is busiest. Write your code, package it into a Docker image, deploy it to Fly's platform and let that do all the work to keep your app snappy._

Using this platform, you can run most applications with a `Dockerfile` using the `flyctl` command. The first time you deploy an app, we assign it a global IP address. By default, apps listen for HTTP and HTTPS connections, though they can be configured to accept any kind of TCP traffic.

After going through their documentation and tutorials, it didn't take long before we had a working set up deployed on fly.io, although with some minor tweaks in inlets Pro.

{% twitter https://twitter.com/alexellisuk/status/1403315054410358788 align=center %}

Now let me know you how I did it, so you can try it out too. Rather than paying your usual 5 USD / mo for an exit-server from DigitalOcean or Linode, you'll be able to run it for free, if you stay within the [free tier limits](https://fly.io/pricing).

## Prerequisites

For this tutorial you'll need the following:

- An account on [fly.io](https://fly.io) - a credit card is required for signing up.
- `flyctl`, a command-line utility that lets you work with Fly, follow these guides:
  - [installing flyctl](https://fly.io/docs/getting-started/installing-flyctl/)
  - [login to Fly](https://fly.io/docs/getting-started/login-to-fly/)
- [Docker](https://docker.io) installed on your machine
- The [inlets-pro](https://github.com/inlets/inlets-pro/releases) binary available on your machine
- An [inlets Pro license](https://inlets.dev/pricing/) - monthly or annual subscriptions are available

## Creating the Dockerfile

Since applications on Fly need to be built into a Docker image, we'll need to create a Dockerfile.

Fortunately inlets Pro is already released in a Docker image, so we just have to inherit from it and set some new command line arguments for the server.

``` Dockerfile
FROM ghcr.io/inlets/inlets-pro:0.8.5
CMD ["tcp", "server", "--auto-tls=false", "--token-env=TOKEN"]
```

For this tutorial you'll need version 0.8.5 or higher.

The second `CMD` line contains the parameters we pass to the `inlets-pro` command that are going to configure how inlets Pro runs.
By default, the official image will simply start an inlets Pro tcp server, but here we need to tweak the runtime flags a little but.
With the first flag, `--auto-tls`, we disable the auto-generation of the TLS CA and certificate for the control plane because we can rely on the HTTPS feature of fly.io. Second, with the flag `--token-env`, the server part of our inlets tunnel will read a token from an environment variable which we will create later as a [Fly secret](https://fly.io/docs/reference/secrets/).

> With platforms like Kubernetes, you can read secrets like tokens from disk, but with a PaaS platform, they tend to be injected through environment variables. A new patch was created by Alex and released the same day to enable this use case.

## Preparing to fly

A Fly application needs a `fly.toml` file to tell the system how we'd like to deploy it. Such a configuration file can be automatically generated with the `flyctl init` command. The INIT command will both register a new application with the Fly platform and create the `fly.toml` file which controls how the application will be deployed.

For this tutorial we will this command to start, but without the generation of the `fly.toml`, but instead we will create the configuration file step-by-step.

Assuming `flyctl` is installed and configured correctly, run the following command:

``` bash
$ flyctl init --nowrite
```

- `--nowrite`: we will create the `fly.toml` by hand

This will kick off a short dialogue with you about your new application. 

First up, it'll ask for an application name. Your name has to be unique across all Fly users, so be creative with the name, or go with an auto-generated name.

Next, it is possible you'll be asked to select an organization. If this is your first time on Fly, there'll only be one organization - your own personal organization, just for your applications. Organizations are all about sharing apps and collaborating. For this guide, we don't need to worry about that, so we can use our personal organization.

When the dialog finishes, `flyctl` has registered the app and displays it's name.

```bash
? App Name (leave blank to use an auto-generated name)

Automatically selected personal organization: Johan Siebens

New app created: white-star-8139
```

Grab the name (either chosen by you or the auto-generated one) and put it in a new `fly.toml` file:

```toml
app = "white-star-8139"
```

## Configuring the services

The biggest and most import part for this tutorial of the generated configuration file are the services sections.
Those sections configure the mapping of ports on the application to ports and services on the Fly platform.
Besides the port mapping, a `handlers` config setting specifies which middleware applies to incoming TCP connections.

In the case of an inlets exit server, we need to configure two service sections:

- one for the control plane of the tunnel, by default running on port 8123
- one for the data plane of the tunnel, the port of your application you want to expose.

For each service you can configure an internal port and one or more external ports. 
Fly allows you to configure an application to listen for global traffic on ports 80, 443, 5000, and ports 10000 - 10100, so we have to chose our ports wisely.

First, we add a service section for our control plane

```toml
[[services]]
  internal_port = 8123
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 10023

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 6
    timeout = "2s"
```

- the `internal_port` is set to 8123, the default port of the inlets control plane
- the control plane will be externally available on port 10023
- the control plane is running a secure websocket, hence the `TLS` and the `HTTP` middleware handlers


Next, a service configuration for the data plane of the application we want to make available.

As the Fly platform allows us to use 80 and 443 for the public ports, those are a perfect fit when making an HTTP service or a web application public.

```toml
[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

Just like our control plane, we define an `internal_port` for the data plane and activate the proper middleware handlers `HTTP` and `TLS` on the public services. In this example, I'm using internal port 8080, make sure you change the value according your application.

The configuration of the service for the data plane will be a little bit different when you want to expose a non-web application or service.
In that case, we don't specify a middleware handler and the Fly platform will just forward TCP to our inlets application.

For example when exposing Redis:

```toml
[[services]]
  internal_port = 6379
  protocol = "tcp"

  [[services.ports]]
    handlers = []
    port = 10079
```

For this tutorial we will continue with the first example, exposing an HTTP service.

> A note on health-checks: I'm sure you can spot a difference between the service section of the control plane and the data plane, being a health check configuration. With those health checks, Fly verifies if the application is available and restart the instance when that is not the case. 
Because the data plane is not ready when the inlets server is started, we still need to connect the client, only the control plane has a health check. Feel free the add a health check to your data plane if that fits your needs.

In the end, the complete `fly.toml` file will look like this and contains the basic configuration parts for running a inlets Pro exit service on the Fly platform.

```toml
app = "white-star-8139"

[[services]]
  internal_port = 8123
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 10023

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 6
    timeout = "2s"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

You can find a comprehensive overview of all the configuration options in the [Fly Documentation](https://fly.io/docs/reference/configuration/#fly-toml-line-by-line).

## Set up the authentication token for the tunnel

Secrets allow sensitive values, such as credentials, to be passed securely to your Fly applications. A secret has a name and a value and can be set for a specific application and are past as environment variable to the application, inlets-pro in our case.

The `flyctl secrets set` command will set one or more application secrets:

``` bash
token=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32 ; echo '')
flyctl secrets set TOKEN=$token
echo $token > token.txt
```

You can read the generated token back from `token.txt` to use with your `inlets-pro` client later on.

## Deploy the exit server to Fly

At this point, we have everything in place to deploy the inlets Pro exit server with `flyctl deploy`:

``` bash
$ flyctl deploy

Deploying white-star-8139
==> Validating app configuration
--> Validating app configuration done
Services
TCP 10023 ⇢ 8123
TCP 80/443 ⇢ 8080
==> Creating build context
--> Creating build context done
==> Building image with Docker
Sending build context to Docker daemon  4.096kB
Step 1/2 : FROM ghcr.io/inlets/inlets-pro:0.8.5
 ---> dc95fbda2417
Step 2/2 : CMD ["tcp", "server", "--auto-tls=false", "--token-env=TOKEN"]
 ---> Running in 5ecba2c50ef9
 ---> c40be77eab07
Successfully built c40be77eab07
Successfully tagged registry.fly.io/white-star-8139:deployment-1624430909
--> Building image done
==> Pushing image to fly
The push refers to repository [registry.fly.io/white-star-8139]
deployment-1624430909: digest: sha256:84b99c9044cd7a61771265122d6ad62847e7ed339a0ffe6e966857dde0dc44b1 size: 738
--> Pushing image done
Image: registry.fly.io/white-star-8139:deployment-1624430909
Image size: 18 MB
==> Creating release
Release v0 created

You can detach the terminal anytime without stopping the deployment
Monitoring Deployment

1 desired, 1 placed, 1 healthy, 0 unhealthy [health checks: 1 total, 1 passing]
--> v0 deployed successfully
```

## Try it out

Connect your `inlets-pro` client to the newly deployed server:

``` bash
export URL=wss://white-star-8139.fly.dev:10023/connect
export TOKEN=$(cat ./token.txt)
inlets-pro tcp client \
  --token $TOKEN \
  --upstream localhost \
  --port 8080 \
  --auto-tls=false \
  --url $URL
```

And the tunnel is up and running, exposing an HTTP service on your local machine at port 8080 via the Fly platform.

```
2021/06/23 09:03:17 Starting TCP client. Version 0.8.3 - 205c311fde775723cf68b8116dacd7f428d243f8
2021/06/23 09:03:17 Licensed to: Johan Siebens <redacted>, expires: <redacted> day(s)
2021/06/23 09:03:17 Upstream server: localhost, for ports: 8080
inlets-pro client. Copyright Alex Ellis, OpenFaaS Ltd 2020
INFO[2021/06/23 09:03:17] Connecting to proxy                           url="wss://white-star-8139.fly.dev:10023/connect"
```

In a different terminal, start an HTTP server on port 8080, for example a lightweight fileserver with inlets:

``` bash
$ inlets-pro http fileserver \
  --allow-browsing \
  --port 8080

2021/06/23 09:06:11 Starting inlets Pro fileserver. Version 0.8.3 - 205c311fde775723cf68b8116dacd7f428d243f8
2021/06/23 09:06:11 Serving: /workbench/workspaces/inlets/projects/fly-inlets, on 127.0.0.1:8080, browsing: true, auth: false
```

And test the public endpoint:

``` bash
$ curl -i https://white-star-8139.fly.dev
HTTP/2 200 
content-type: text/html; charset=utf-8
last-modified: Wed, 23 Jun 2021 06:38:09 GMT
date: Wed, 23 Jun 2021 07:08:22 GMT
content-length: 115
server: Fly/050517e (2021-06-16)
via: 2 fly.io
fly-request-id: 01F8VV5BC6BVZVS3BHTGSP0148

<pre>
<a href="Dockerfile">Dockerfile</a>
<a href="fly.toml">fly.toml</a>
<a href="token.txt">token.txt</a>
</pre>
```

You can expose any other HTTP or TCP services that are reachable by the client's network. Just specify the ports you wish to expose, one or many and the upstream name or IP address and traffic will be forwarded there from the exit server.

## Wrapping up

In this tutorial configured and deployed an inlets Pro exit server on the Fly platform, making the deployment pretty simple and reducing operational overhead. Not only the easy setup is attractive, but also the sharp pricing makes the platform a perfect fit for the inlets tunnel. For only __$1.94/mo__ you have already the most basic compute sizing available and with the __generous free tier__ you can even run three tunnel for free.

Further resources:

* [Follow @inletsdev on Twitter](https://twitter.com/inletsdev/)
* [Read tutorials and documentation for inlets](https://docs.inlets.dev/)
