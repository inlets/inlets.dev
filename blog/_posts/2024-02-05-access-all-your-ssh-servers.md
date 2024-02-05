---
layout: post
title: Introducing sshmux - connect to any of your private servers with a single tunnel VM
description: "Access all your remote SSH servers on your private network from a single TCP tunnel using the new sshmux feature."
author: Alex Ellis
tags: ssh sshmux tls remote tcp
author_img: alex
image: /images/2024-02-sshmux/background.png
date: 2023-09-01
---

Access all your remote SSH servers on your network from a single TCP tunnel using the new sshmux feature.

## Introduction

Quite often those of us wanting to expose or tunnel a single server or service, have several more like that which we'd also like to access. Take a HTTP server for instance, it's quite likely you'll have more than one domain - maybe one for Prometheus, one for Grafana, one for your blog, and maybe OpenFaaS on your Raspberry Pi.

At L7 HTTP routing is solved by inspecting the "Host:" header sent by the HTTP client. When traffic is encrypted end to end, you have L4 TLS routing, which obscures the Host header, however, it does a handshake which allows a server name to be read. This is called "Server Name Indication" or SNI.

So what about SSH?

SSH is a bespoke protocol which is usually multiplexed by having to use different ports, or various distinct IP addresses. You could do that with inlets prior to the new `sshmux` feature, but it would mean remapping ports, or adding extra tunnel server VMs to get additional IPs.

The `sshmux` feature acts just like a reverse proxy, and reads a TLS header to determine which server to forward the connection to. It's SNI for SSH.

If you'd like to learn how to expose a SSH server only, then see this tutorial: [Tutorial: Expose a private SSH server over a TCP tunnel](https://docs.inlets.dev/tutorial/ssh-tcp-tunnel/).With this tutorial, since the tunnel VM itself had SSH installed on port 22, you needed to add an extra port on your private SSH server's configuration. That's no longer needed with `sshmux`.

### Disclaimer

Now it goes without saying that there's a few things you should do before you put an computer running SSH onto the Internet.

At a bare-minimum, I'd suggest you:

* Disable password-based logins
* Disable root logins
* Only allow key-based logins
* Only put the hosts in the config.yaml file that you'd like to connect to remotely

These settings are very well documented and you can find them in `/etc/ssh/sshd_config` on most Linux systems.

## How it works

First off, you'll want to create a new TCP tunnel server so that you can play with it and not worry about breaking anything:

```bash
inletsctl create \
    --provider digitalocean \
    --region lon1 \
    --tcp
```

DigitalOcean will email you an initial root password. Use it to log in and then change the `/etc/defaults/inlets` file and edit the line `--proxy-protocol=""` to `"--proxy-protocol=v2"`. We do this to ensure we get the remote IP address of the client send to sshmux.

Restart the server with `sudo systemctl daemon-reload && sudo systemctl restart inlets-pro`.

Next create a config.yaml file on a computer in your private network. You can think of this machine as being like a jump box, or a bastion host. The `sshmux server` will run here in order to forward connections to your other servers.

```yaml
# config.yaml

upstreams:
- name: nuc.inlets
  upstream: 172.10.0.100:22
- name: rpi.inlets
  upstream: 172.10.0.101:22
```

I've used the IP addresses of my machines on my local network in the `upstream` field. You can also use a DNS name here like `raspberrypi.local`, so long as you first add an extra in `/etc/hosts` such as `raspberrypi.local  172.10.0.101`.

Run the `sshmux server` on the jump box:

```bash
inlets-pro \
    sshmux server \
    config.yaml
```

It'll listen for TCP traffic on port 8443, so now you can connect the `inlets-pro tcp client` using the details you were given when you created the tunnel server.

```bash
inlets-pro \
    tcp client \
    --url "wss://..." \
    --token "..." \
    --upstream "127.0.0.1" \
    --port 8443
```

## Try it out

From your laptop, you can now use the IP address of the exit server VM to ssh into any of the machines in the config.yaml file.

Edit `~/.ssh/config` and add the following:

```
Host *.inlets
    HostName %h
    Port 8443
    ProxyCommand inlets-pro sshmux connect TUNNEL_IP:%p %h
```

Just update TUNNEL_IP to the IP address of the exit server VM.

Now you can use the `nuc.inlets` and `rpi.inlets` hostnames to connect to your servers.

```bash
ssh nuc.inlets "uname -a && uptime"
ssh rpi.inlets "uname -a && uptime"
```

## Wrapping up

In a very short period of time, a prototype written over the FOSDEM weekend has made it into the inlets-pro product. It's not the only way to connect to various machines with your local network, but it's a very simple and effective way to do it if you're already using inlets.

