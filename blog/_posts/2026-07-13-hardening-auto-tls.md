---
layout: post
title: "Hardening Auto-TLS for Inlets Tunnels"
description: "inlets-pro 0.11.14 adds a verification step to auto-TLS, hardening the first-connection trust model against MITM vectors."
author: Alex Ellis
tags: security tls inlets-pro auto-tls
category: release
rollup: true
author_img: alex
date: 2026-07-13
---

When you SSH to a server for the first time, you get a prompt asking you to verify the host fingerprint. Most people just hit "yes" and move on. We know we should check the fingerprint, but in practice, individuals rarely collect server fingerprints and add them manually to their `known_hosts` file.

The `--auto-tls` feature for HTTP and TCP tunnels takes a very similar approach. On first connection, the client fetches the server's self-signed CA and trusts it without verification.

Practically speaking, the current version could be subject to a complex man-in-the-middle attack on first connection. An attacker would need to sit on the network between your client and server, intercept the initial handshake, and serve their own CA before the real one. This would require physical access to the network or ISP-level interception. It's unlikely to affect most users in day-to-day operation, but we wanted to harden the product regardless.

As of inlets-pro 0.11.14, we've added belt and braces against MITM vectors: the client now verifies the CA belongs to the server it's connecting to, using the tunnel's token for an extra layer of hardening.

## How it works

The client and server already share a token. We've now added a step where the client verifies the CA using that token.

The client generates a random value and sends it to the server. The server signs it along with the CA using the shared token. The client checks the signature. If it matches, the CA is trusted.

The random value means an old CA from a previous server run can't be reused. And the token is never sent in plaintext during this exchange.

## Which products are affected?

This change only applies to inlets-pro HTTP and TCP tunnels that use `--auto-tls`. If you're not using auto-TLS, nothing changes.

Here's the full picture:

- **inlets-pro HTTP tunnels with auto-TLS** — verification is now enabled
- **inlets-pro TCP tunnels with auto-TLS** — verification is now enabled
- **inlets-pro HTTP or TCP tunnels with custom TLS** — not affected, you provide your own certificate
- **inlets uplink** — not affected, does not implement auto-TLS and relies on Let's Encrypt or vendor certificates already in the trust bundle
- **inlets-pro status** — verification is now enabled when using auto-TLS, with `--auto-tls-legacy` to talk to older servers

## Upgrading

The easiest path is to delete your existing tunnel server and recreate it. Most tunnel servers are created by [inletsctl](https://github.com/inlets/inletsctl), so you can simply delete and recreate:

```bash
inletsctl delete
inletsctl create
```

Make sure to add back any flags you used previously — `--letsencrypt-domain`, `--tcp`, `--provider`, or any others. This gives you a fresh server running 0.11.14, a new token, and a new IP address.

Before you delete the old server, set the TTL on any DNS A or CNAME records pointing at it to something low like 60 seconds. That way when you update the record to the new IP after recreating, the change will propagate quickly.

If you're using the [inlets-operator](https://github.com/inlets/inlets-operator) on Kubernetes, upgrade the operator via the Helm chart first, then delete any existing tunnels so they're recreated with the new version:

```bash
helm upgrade inlets-operator inlets/inlets-operator \
  --set image.tag=0.11.14

kubectl delete tunnelserver <name>
```

The operator will recreate the tunnel server automatically. If you have DNS records pointing at the server, set the TTL to 60 seconds before deleting the tunnel, then update the record to the new IP once it's recreated.

If you prefer to do a rolling upgrade in place, you can use `--auto-tls-legacy` as a temporary bridge. A new client connecting to an older server will fail, so add the flag to the client:

```bash
inlets-pro tcp client \
  --url wss://server.example.com:8123 \
  --token AUTH_TOKEN \
  --auto-tls-legacy \
  --upstream 127.0.0.1 \
  --ports 80,443
```

This restores the previous behaviour and prints a warning. On the server, `--auto-tls-legacy` allows older clients to continue fetching the CA without verification. Remove the flag from both sides once everything is upgraded. The `inlets-pro status` command also supports `--auto-tls-legacy` if you need to query an older server.

## Empty tokens no longer accepted

If you're running auto-TLS, the server now requires a non-empty token. Previously an empty token was accepted, which meant any client could connect without authentication. If you were running without a token, the server will now refuse to start.

#### Token strength

The security of this feature depends on your token being strong. Use at least 32 bytes of random data:

```bash
openssl rand -base64 32 > ./token
```

## Wrapping up

Auto-TLS now verifies the server identity, not just encrypts the connection. The trust anchor is the shared token, which you already control. No extra configuration needed once you're on the updated client and server.

If you're already using a token with auto-TLS, the feature is enabled automatically on upgrade.

* [Read the 0.11.14 release notes](https://github.com/inlets/inlets-pro/releases/tag/0.11.14)
* [Docs: Automated HTTP tunnel server](https://docs.inlets.dev/tutorial/automated-http-server/)
* [Docs: Automated TCP tunnel server](https://docs.inlets.dev/tutorial/automated-tcp-server/)
* [Docs: Kubernetes TCP LoadBalancer](https://docs.inlets.dev/tutorial/kubernetes-tcp-loadbalancer/#co-existing-with-other-loadbalancers)