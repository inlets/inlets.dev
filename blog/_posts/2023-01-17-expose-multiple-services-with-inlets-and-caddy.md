---
layout: post
title: How to expose multiple domains on a single server with Caddy and inlets
description: Learn how a wildcard domain and TLS certificate can be used to host dozens of subdomains on a single server with inlets and Caddy.
author: Han Verstraete
author_img: welteki

image: /images/2023-caddy-reverse-proxy/background.jpg
date: 2023-01-17
---

Learn how a wildcard domain and TLS certificate can be used to host dozens of subdomains on a single server with inlets and Caddy.

## Introduction

If you deploy an inlets HTTP tunnel server using the `--lets-encrypt-domain` flag, it will obtain a TLS certificate for each domain you specify. This works well and is really handy for 2-3 domains at a time, especially if they are unlikely to change. 

But what if you want to change the names often, without having to get a new certificate each time? Or what if you want to expose dozens of services on a single server? What if you just want a handy server, where you can connect different tunnels with different names from one day to the next?

That's where we can use a wildcard domain and have all the traffic go to a reverse proxy like Nginx, Traefik, or in this instance Caddy.

While using my own tunnels for local development and testing I found that I often wanted to expose different named tunnels as part of my workflow.

By using a wildcard domain for the tunnel it's possible to expose services on multiple subdomains without having to configure the tunnel server and DNS for each subdomain. It's a bit like having your own Ngrok, but without any of the limits that come with it. And what's more, you could expose tens or hundreds of domains over a single tunnel without having to pay anything extra.

> Inlets was built specifically to integrate with containers and Kubernetes, you can even run the tunnel server on a cutting edge platform like Fly.io in a microVM. In this tutorial, we focus on running a client as a regular binary on your local Linux, MacOS or Windows machine.

The built-in HTTP server in inlets uses a HTTP01 challenge for each domain, and Let's Encrypt limits us on how many of those we can have per week, so that's where the [DNS challenge](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge) comes in handy. The HTTP01 ACME challenge checks the server's URL over port 80 to verify it has ownership, then issues a certificate if everything looks good.

With a DNS01 challenge, DNS records are used instead, and this can often feel more complex because an API key with the appropriate permissions are required from your DNS provider.

You can use your preferred reverse proxy, but we're going to use [Caddy](https://caddyserver.com/) in the tutorial. It will handle certificate renewals and TLS termination. We just need to give it an API key to update DNS records.

In the next sections we will walk you through the setup and configuration of inlets and caddy.

## Pre-reqs

An inlets tunnel server will generally use single digits of RAM, so even a 5 USD DigitalOcean droplet is sufficient for this tutorial.

- A Linux server, VM, VPS etc with a public IP address
- An [inlets subscription](https://inlets.dev/pricing/)
- Access to the dashboard or API of your domain provider to setup the DNS challenge and DNS records.

## Run the inlets HTTP tunnel server

Log into your server and install inlets-pro:

Download the binary from GitHub, or use `arkade get` to install it:
 
 - Download it from the [GitHub releases](https://github.com/inlets/inlets-pro/releases)
 - Get it with [arkade](https://github.com/alexellis/arkade): `arkade get inlets-pro`

Generate an authentication token the client will use to connect to the server:

```bash
TOKEN="$(head -c 32 /dev/urandom | base64 | cut -d "-" -f1)"
```

Configure the inlets tunnel server. The `--generate` flag can be used to turn the command arguments into a configuration file for systemd. The usual place to save the service file is: `/etc/systemd/system/inlets.service`.

```bash
inlets-pro http server \
  --auto-tls false \
  --control-addr 127.0.0.1 \
  --data-addr 127.0.0.1 \
  --token $TOKEN \
  --generate=systemd > inlets.service
```

Notice that we are binding the control plane and data plane to the local host only with the flags `127.0.0.1`, this ensures that all traffic passes through Caddy which is now responsible for TLS termination for inlets.

The built-in Automatic TLS feature is also disabled. In the next section we will setup Caddy as a reverse proxy to make the tunnel accessible on the public internet and handle TLS termination.

Move the service file and start the service:

```bash
sudo mv inlets.service /etc/systemd/system/inlets.service
sudo systemctl daemon-reload
sudo systemctl enable --now inlets
```

Verify that the service is running:

```bash
systemctl status inlets
```

## Setup Caddy

Caddy will be used as a reverse proxy for the inlets HTTP tunnel server.

By default the Caddy server does not contain any DNS modules. These can be added to your download from [caddyserver.com](https://caddyserver.com/download). Alternatively you can use xcaddy to build caddy with your DNS provider plugged in. The [caddy community wiki](https://caddy.community/t/how-to-use-dns-provider-modules-in-caddy-2/8148) has more details on how to enable the DNS challenge for your provider. In this example we use the [Cloudflare DNS provider](https://github.com/caddy-dns/cloudflare).

> Note: If you are using DigitalOcean DNS there is a [separate provider available](https://github.com/caddy-dns/digitalocean), along with modules for many other DNS providers.

We will need two DNS A records, the first will be used as the URL for the inlets client and it'll host the control-plane of the tunnel.

The second will be a wildcard domain that will be used to host the data-plane of the tunnel. This is where the traffic from the client will be routed to.

* `inlets.example.com`
* `*.inlets.example.com`

Both records should point to the IP address of the server you created in the earlier step.

Next create the caddy configuration file `/etc/caddy/Caddyfile`:

```
{
    email email@inlets.example.com
}

inlets.example.com {
    reverse_proxy localhost:8123
}

*.inlets.example.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy localhost:8000
}
```

We define three blocks in the caddy configuration file. The first block on the top of the file can be used to define the email to use for the renewal notifications on the domains.

In the second we configure caddy to reverse proxy the control-plane for the tunnel server using the domain `inlets.example.com`. Caddy will automatically obtain a valid TLS certificate for this domain.

In the third block we configure a wildcard domain `*.inlets.example.com` and point it to the data-plane of the tunnel. To generate a wildcard certificate you will need to use the DNS-01 challenge type which requires using a supported DNS provider. This is defined with a `tls { }` block added below the domain definition. The configuration might be different depending on you DNS provider. You can find the specific configuration info and instructions to configure authentication for your provider in the [repo of you DNS provider plugin](https://github.com/orgs/caddy-dns/repositories?type=all).

Make sure to move the caddy binary you downloaded or compiled with xcaddy into your path:

```bash
sudo mv caddy /usr/bin/
```

Create a systemd service file for caddy named `/etc/systemd/system/caddy.service`:

```ini
# caddy.service

[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
EnvironmentFile=/etc/default/caddy
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

Create an env file for Caddy that contains your Cloudflare API token and start the caddy service:

```bash
# Cloudflare API token
export CF_API_TOKEN=""

echo "CF_API_TOKEN=$CF_API_TOKEN" >> /etc/default/caddy
```

Then enable the service:

```bash
systemctl daemon-reload && \
systemctl enable --now caddy
```

You can check the logs of caddy using `sudo systemctl status caddy` to verify that the TLS certificates were obtained successfully.

## Connect the tunnel client

Whenever you need to expose a local service, you just define it in the `--upstream` flag, where the left hand side is the sub-domain and the right hand side is the local service. For example if we want to expose a local blog service running on port 8080 and an API service running on port 3000 we can start a tunnel client with the following command:

```bash
inlets-pro http client \
  --token $TOKEN \
  --url=wss://inlets.example.com \
  --upstream=blog.inlets.example.com=http://127.0.0.1:8080 \
  --upstream=api.inlets.example.com=http://127.0.0.1:3000 \
  --auto-tls=false
```

It is also possible to run multiple tunnel clients on different machines, each exposing local services. For example if we need to expose a fronted service running on another host in addition to the API we already exposed in the previous example we can start a second tunnel on the other host:

```
inlets-pro http client \
  --token $TOKEN \
  --url=wss://inlets.example.com \
  --upstream=frontend.inlets.example.com=http://127.0.0.1:8080 \
  --auto-tls=false
```

## Wrapping up

By using a wildcard TLS certificate it is easy to expose services on multiple subdomains without having to configure the tunnel server and DNS for each subdomain. This can be very convenient if you have to expose many services or if the service you want to expose changes regularly.

We can expose any domain name we want under the subdomain `*.inlets.example.com`. I use this when writing blog posts at work when I'll expose `blog.inlets.example.com` and another day I'll be testing actuated when I'll expose `actuated.inlets.example.com`. Both can of course also be exposed at the same time. It's a bit like having your own Ngrok, but without any of the limits or additional costs per domain that come with it.

Each tunnel client requires a license, so just make sure you've checked your subscription before you start extra tunnels! The personal plan at time of writing comes with two licenses included.

You can check out the plans [here](https://inlets.dev/pricing).

Find out more in the [inlets docs](https://docs.inlets.dev/).
