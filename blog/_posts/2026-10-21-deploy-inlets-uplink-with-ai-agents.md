---
layout: post
title: "Introducing agent-skills for Inlets Uplink: agent-assisted setup"
description: "Use agent-skills to install Inlets Uplink, connect a private service, and verify the tunnel from end to end."
author: Han Verstraete
tags: inlets uplink kubernetes ai agent-skills automation
category: tutorial
rollup: true
author_img: welteki
published: true
# TODO: Add a cropped cover image before publication.
date: 2026-10-21
---

You can now ask your AI agent to set up Inlets Uplink with a single prompt. Our [agent-skills](https://github.com/inlets/agent-skills) guide it through configuring ingress and TLS, installing the Helm chart and creating tunnels.

[Inlets Uplink](https://docs.inlets.dev/uplink/) is a self-hosted platform for managing HTTP and TCP tunnels in your Kubernetes cluster. It lets your application access APIs, databases and other services on customers' private networks. A tunnel client connects out from each customer's network, so they don't need to open inbound ports.

![A tunnel client connects outbound from a customer's private network to Inlets Uplink, allowing an application in the Kubernetes cluster to access the customer's APIs and databases.](/images/2026-10-deploy-inlets-uplink-with-ai-agents/uplink-architecture.png)

Getting started with an initial Uplink deployment normally means working through the installation guide and adapting the configuration to your environment. With the skills, you can now ask an agent to do this for you.

The agent can inspect what's already installed and configured, build on that setup, and work through small differences between your environment and the installation guide. This reduces the manual adjustments needed to get started.

The [inlets/agent-skills](https://github.com/inlets/agent-skills) repository includes two skills for Inlets Uplink:

- `setup-uplink` installs and configures Uplink on an existing Kubernetes cluster, covering ingress, TLS, and verification of the control plane.
- `use-inlets-uplink` creates and manages tunnels on an existing Inlets Uplink cluster.

In this post, we'll start with an existing [K3s](https://k3s.io/) cluster in a [SlicerVM](https://slicervm.com/) and use the skills to install Uplink with self-signed TLS. We'll then create a tunnel and connect a small HTTP API service through the tunnel.

## What you'll need

**Kubernetes cluster**

For local evaluation, we recommend that you start with a small K3s cluster and give your agent access to its kubeconfig. We used a SlicerVM running locally on [Slicer for Mac](https://slicervm.com/mac/) with a single-node K3s cluster. You can use an existing Kubernetes cluster, whether it's running locally or hosted elsewhere.

**Coding agent and skills**

For this walkthrough, we used [OpenCode](https://opencode.ai/) with a self-hosted `deepseek-v4-flash-0731` model. You can use any other agents and models that support skills and tool use.

Install the Inlets skills:

```bash
npx skills add inlets/agent-skills
```

You can find manual installation instructions in the [agent-skills repository](https://github.com/inlets/agent-skills#installation).

**Uplink license**

You will also need an Uplink license. Make sure the agent can read it. It is best to save the license in the default location at `~/.inlets/LICENSE_UPLINK`. If you have it in a different location, tell the agent where to find it.

## What the agent will deploy

For this walkthrough, we'll prompt the agent to set up Uplink in the SlicerVM's K3s cluster, then run a small HTTP service and tunnel client on the host. We'll ask it to connect the service through a private tunnel and verify its response from a Pod inside the cluster.

The tunnel client connects to the client-router on the VM's private IP. A test Pod accesses the HTTP service on the host through an internal Kubernetes Service and the tunnel.

```text
Host                                            SlicerVM / K3s
+------------------------+                      +-----------------------------------+
|      HTTP service      |                      |             Test Pod              |
|     127.0.0.1:9091     |                      |                 |                 |
|           ^            |                      |                 v                 |
|           |            |                      |  http://customer-api.acmeco:8000  |
|           |            |                      |                 |                 |
|           |            |   tunnel websocket   |                 v                 |
|     Tunnel client      |=====================>|           Tunnel server           |
+------------------------+                      +-----------------------------------+
```

Uplink is installed through a [Helm chart](https://docs.inlets.dev/uplink/installation/). Its operator manages the tunnel workloads, the `client-router` accepts connections from tunnel clients, and the `client-api` provides a REST API for creating and managing tunnels.

These are some common deployment choices the agent needs to know. You can include them in your prompt, or let the agent inspect the environment and ask for missing details:

- **Client connection address.** The client-router needs a hostname that tunnel clients can connect to. If you don't specify one when prompting the agent, it will try to suggest one based on your environment or ask you to provide one.

- **TLS certificates.** The agent needs to know whether to use Let's Encrypt, an existing certificate issuer, or self-signed certificates. It checks the cluster for ingress and certificate configuration it can reuse, and asks for any missing details when required.

- **Private or public tunnels.** Tell the agent whether tunneled services should stay private within the cluster or be exposed publicly. Private is the default, but the agent may ask if you haven't specified a choice. Read more about [exposing tunnels publicly](https://docs.inlets.dev/uplink/expose-tunnels/) in the documentation.


## Let the agent deploy Inlets Uplink

For a quick deployment, we will use self-signed TLS certificates. This lets us skip setting up public DNS records and provisioning publicly trusted certificates. It also works well with a private cluster like our SlicerVM setup.

For production, you'll want a publicly accessible endpoint with your own domain and Let's Encrypt certificates, which the setup skill also supports.

With the environment ready, we gave the agent the following prompt. Replace `<cluster-name>` with the name of your cluster:

```text
Set up Inlets Uplink on the Kubernetes cluster <cluster-name>.
Use the setup-uplink skill and the kubeconfig for that cluster. Create
values.yaml in the current working directory. Use self-signed certificates
and keep tunneled applications private. The Uplink license is available
at ~/.inlets/LICENSE_UPLINK.
```

![The Uplink installation prompt in OpenCode](/images/2026-10-deploy-inlets-uplink-with-ai-agents/installation-prompt.png)
> The prompt specifies self-signed certificates and private tunnels for the `uplink` cluster.

Guided by the skill, the agent checks what's already installed and works out the remaining configuration, asking us for anything it can't determine.

It found the cluster needed an ingress controller and cert-manager, then asked us to confirm `uplink.192.168.64.3.nip.io` as the client-router hostname.

Using `nip.io` works well for local evaluation and private clusters. The hostname resolves to the VM's private IP, `192.168.64.3`, without having to create a DNS record.

![OpenCode inspecting the cluster and planning the Uplink installation](/images/2026-10-deploy-inlets-uplink-with-ai-agents/installation-plan.png)
> After confirming the hostname, the agent works through the dependencies, certificates, Helm configuration and verification.

The agent saved `values.yaml` for future configuration changes and `uplink-ca.pem` so clients can trust the self-signed certificate. It also checked that the management API returned HTTP 200 for an authenticated request and HTTP 401 without authentication.

![OpenCode summarising the installed Uplink components and verification results](/images/2026-10-deploy-inlets-uplink-with-ai-agents/installation-summary.png)
> The summary reports ready deployments, successful TLS and API checks.

## Create and connect a tunnel

With Uplink installed, we'll use the [use-inlets-uplink skill](https://github.com/inlets/agent-skills/tree/master/skills/use-inlets-uplink) to create our first tunnel.

For this example, we'll run a small HTTP service to simulate a remote API. The API runs alongside the agent on the local machine. A tunnel client connects the local API to the Uplink cluster. The agent will verify the connection from a Pod inside the cluster.

Start by prompting the agent to create a new namespace and tunnel. Replace `uplink.192.168.64.3.nip.io` with your own Uplink client-router hostname.


```text
Use the use-inlets-uplink skill to create an HTTP tunnel
called customer-api in a tenant namespace called acmeco on the
Uplink installation at uplink.192.168.64.3.nip.io.

Show me the tunnel status and its internal Service address.
```

We ask the agent to create a new tenant namespace following Uplink best practices. See the [tunnel provisioning documentation](https://docs.inlets.dev/uplink/create-tunnels/) for more details.

![Prompt to create the customer-api tunnel in OpenCode](/images/2026-10-deploy-inlets-uplink-with-ai-agents/tunnel-creation-prompt.png)
> Create a tunnel for `acmeco` on our existing Uplink installation.

The agent creates the requested namespace and makes sure it is labelled correctly. It also ensures the Uplink license secret is created in the namespace before it creates the `customer-api` tunnel.

The summary reports a running tunnel Pod and the internal HTTP address `http://customer-api.acmeco.svc.cluster.local:8000`.

![OpenCode showing the created tunnel and its internal Service address](/images/2026-10-deploy-inlets-uplink-with-ai-agents/tunnel-creation-summary.png)
> The tunnel is provisioned and ready for a client to connect.

For local evaluation, we ask the agent to start a small HTTP service and connect it through the tunnel:

```text
Run a small HTTP service on this host that returns "Hello from acmeco".

Start a tunnel client for the acmeco/customer-api uplink tunnel on
uplink.192.168.64.3.nip.io forwarding to this service.

Verify the response through the tunnel from a Pod inside the
Uplink cluster.
```

Here, "this host" is the machine running the agent. The HTTP service and tunnel client run there, while Uplink runs in the K3s cluster in the VM.

![Prompt to run the local HTTP service and connect its tunnel client](/images/2026-10-deploy-inlets-uplink-with-ai-agents/tunnel-client-prompt.png)
> Asking the agent to connect the example service and check it from inside K3s.

The agent started the HTTP service on `127.0.0.1:9091` and connected the client to `wss://uplink.192.168.64.3.nip.io/acmeco/customer-api`. It detected that the client needed the `--tls-ca` option to trust the private CA created during setup.

It then started a temporary Pod and verified that the API was reachable from within the Uplink cluster at `http://customer-api.acmeco:8000/`.

![OpenCode reporting the connected client and response from the in-cluster check](/images/2026-10-deploy-inlets-uplink-with-ai-agents/tunnel-verification-summary.png)
> The agent reports the customer response through the tunnel.

When you're finished, prompt the agent to stop the example HTTP service and tunnel client. You can also ask it to delete the example tunnel and tenant namespace if they're no longer needed.

## Conclusion

With a clear prompt, the agent can install and verify Inlets Uplink on an existing cluster in a few minutes with little manual input.

`deepseek-v4-flash-0731` installed and verified Uplink in 9m 41s, including installing Traefik and cert-manager. No additional steering prompts were needed. We only had to confirm the suggested client-router hostname during setup.

We saw consistent results across repeated deployments with different models and cluster setups.

### Observed setup times

We ran the same installation prompt several times in OpenCode and compared different models.
The average time to install and verify Uplink was:

| Model | Average setup time |
|---|---:|
| GPT-5.6 Luna (low reasoning) | 4m 14s |
| Qwen 3.8 27B | 3m 36s |

These averages cover Uplink installation only, excluding tunnel creation and the HTTP test. Traefik and cert-manager were already installed in the cluster.

You can watch a separate installation run below, where Qwen 3.8 27B completed the setup in **2m 41s**. The video covers the Uplink installation and verification shown earlier in this post.

{% include youtube.html id="GeOLye4iRwQ" %}

> Uplink installation using Qwen 3.8 27B.

### Adapting to production

For production, you're more likely to use a managed cluster such as AKS, EKS or GKE. The agent checks your cluster setup and uses that information to adapt the Uplink deployment to your environment.

Prompt the agent to use your own domain and publicly trusted certificates instead of the self-signed certificates we used for evaluation in this post.

The skill was verified on EKS, where the agent ran through a full production deployment using the Application Load Balancer (ALB) for ingress.
