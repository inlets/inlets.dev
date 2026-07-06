---
layout: post
title: How to Expose Llama.cpp over Inlets Cloud
description: Learn how to securely expose a local llama.cpp inference server to the Internet with authentication using Inlets Cloud.
author: Han Verstraete
tags: ai llm llama-cpp authentication tunnel
category: tutorial
rollup: true
author_img: welteki
image: /images/2026-07-llama-cpp/background.png
date: 2026-07-06
---

With Inlets Cloud, you can quickly get a URL with authentication for an LLM server running locally, making it easy to use that model outside the machine it is running on.

[`llama.cpp`](https://github.com/ggml-org/llama.cpp) makes serving open models from your own hardware straightforward, whether that is a developer laptop, a workstation, or a powerful lab machine.

This is useful for:

- Accessing a model of your choice remotely from anywhere with unlimited tokens.
- Sharing access to GPUs with colleagues.
- Serving your latest fine-tune for feedback from the community and friends.

In this post, we'll cover how to:

- Create an Inlets Cloud HTTP tunnel and get a public domain for a running `llama-server`.
- Protect the inference API with bearer-token authentication.
- Configure [OpenCode](https://opencode.ai/) and [Claude Code](https://code.claude.com/) to use the self-hosted model.

In the conclusion we will also include instructions for a self-hosted inlets-pro tunnel server.

## Pre-reqs

You'll need access to Inlets Cloud. If you do not have an account yet, [register here](https://cloud.inlets.dev/register).

Install the `inlets-pro` binary for connecting to tunnels:
 
 - Download it from the [GitHub releases](https://github.com/inlets/inlets-pro/releases)
 - Or install it with [arkade](https://github.com/alexellis/arkade): `arkade get inlets-pro`

You'll also need a running `llama-server` listening locally. The examples in this post assume it is running at `http://127.0.0.1:8081`. For evaluation, this does not need to be a dedicated GPU server. We ran the example model from an M1 MacBook Air. If you don't have a server running yet, see the appendix: [How to set up llama-server](#appendix-how-to-set-up-llama-server).

## Configure the Inlets Cloud CLI

The `inlets-pro cloud` CLI provides a command-line interface to Inlets Cloud. It comes as a plugin for `inlets-pro` that needs to be installed separately.

If your `inlets-pro` binary does not already include the `cloud` command, install the plugin:

```bash
inlets-pro plugin get cloud
```

Check that the command is available:

```bash
inlets-pro cloud version
```

To start using the CLI, authenticate it with an access token. Access tokens can be managed through the [Inlets Cloud Dashboard](https://cloud.inlets.dev).

![Creating an access token in the Inlets Cloud dashboard](/images/2026-07-inlets-cloud-llama-cpp/create-access-token.png)

Create a new access token and save it somewhere private. In this example, we'll store it at `~/.inlets/cloud-access-token`. Run the following command, paste in your token, press Enter once, then press Control + D to save the file.

```bash
mkdir -p ~/.inlets

# Paste your token into this file
cat > ~/.inlets/cloud-access-token
```

After saving the token, restrict the file permissions:

```bash
chmod 0600 ~/.inlets/cloud-access-token
```

Then log in with the CLI:

```sh
inlets-pro cloud auth login --token "$(cat ~/.inlets/cloud-access-token)"
```

Confirm the login was successful:

```sh
inlets-pro cloud auth whoami
```

## Create an Inlets Cloud tunnel

Create a new HTTP tunnel using the Cloud CLI. The tunnel needs a name, and the CLI will pick a default region if you do not specify one. For a model API, it's worth choosing a region close to the person or automation that will call the model most often.

List the available regions:

```sh
inlets-pro cloud region list
```

In the examples below, we'll set the region explicitly to `cambs1`. By default Inlets Cloud will generate a HTTPS domain for the tunnel under `tryinlets.dev`.

```sh
TUNNEL_NAME="llama"
REGION="cambs1"

inlets-pro cloud tunnel create "$TUNNEL_NAME" \
  --region "$REGION"
```

## Connect the tunnel to llama-server

Get the connection command for the tunnel. In these examples, the inlets client runs on the same machine as `llama-server`, so the `--upstream` flag points to the local `llama-server` address.

The upstream does not have to be on the same machine. You can point it at another host or IP address as long as it is reachable from the machine running the inlets client.

```sh
inlets-pro cloud tunnel connect llama \
  --upstream=http://127.0.0.1:8081
```

Example output:

```sh
inlets-pro uplink client --url=wss://cambs1.uplink.inlets.dev/han-verstraete/llama \
  --token=<REDACTED> \
  --upstream=vevamo.cambs1.tryinlets.dev=http://127.0.0.1:8081
```

By default, this connects the tunnel but does not require callers of the public HTTPS endpoint to authenticate. To prevent anyone from being able to access the `llama-server`, you need to enforce authentication for the tunnel.

Generate a random token and save it locally:

```sh
openssl rand -base64 32 > ./llama-token
chmod 0600 ./llama-token
```

Now run the tunnel client command from `inlets-pro cloud tunnel connect`, adding `--bearer-token-file ./llama-token`. For example:

```sh
inlets-pro uplink client --url=wss://cambs1.uplink.inlets.dev/han-verstraete/llama \
  --token=<REDACTED> \
  --upstream=vevamo.cambs1.tryinlets.dev=http://127.0.0.1:8081 \
  --bearer-token-file ./llama-token
```

Keep the bearer token private. Anyone with the public URL and bearer token can send inference requests to your local model while the tunnel client is running.

## Test authentication

Export the generated HTTPS URL and bearer token for testing:

```sh
export LLAMA_TUNNEL_URL="https://vevamo.cambs1.tryinlets.dev"
export LLAMA_TUNNEL_TOKEN="$(cat ./llama-token)"
```

First, check that requests without the bearer token are rejected:

```sh
curl -i "$LLAMA_TUNNEL_URL/v1/models"
```

Then send the bearer token:

```sh
curl -s "$LLAMA_TUNNEL_URL/v1/models" \
  -H "Authorization: Bearer $LLAMA_TUNNEL_TOKEN" | jq
```

## Use the model

Now that we have a protected HTTPS endpoint, we can point coding agents at it.

### Connect with OpenCode

[OpenCode](https://opencode.ai) supports custom OpenAI-compatible providers through its configuration file. If you already have an `opencode.json`, merge the provider below into your existing `provider` section. If you're starting from an empty config, you can use the full example as-is.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "local-llama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local Llama",
      "options": {
        "baseURL": "https://vevamo.cambs1.tryinlets.dev/v1",
        "timeout": 600000,
        "apiKey": "<redacted>"
      },
      "models": {
        "unsloth/Qwen3.5-4B-MTP-GGUF:UD-Q4_K_XL": {
          "name": "Qwen3.5-4B-MTP-UD-Q4_K_XL",
          "limit": {
            "context": 100000,
            "output": 8192
          }
        }
      }
    }
  }
}
```

Make sure to replace `baseURL` with the URL for your tunnel plus `/v1`, and replace `apiKey` with the bearer token generated in the previous section.

Configuration Breakdown:

- `npm` - The provider plugin to use. `@ai-sdk/openai-compatible` works with any OpenAI-compatible API, including `llama-server`.
- `name` - Display name for the provider in the OpenCode UI.
- `options.baseURL` — The Inlets Cloud HTTPS endpoint plus `/v1`. This is the domain for your Inlets tunnel. The URL must include the `/v1` path.
- `options.timeout` - Request timeout in milliseconds. Local models can be slow, so a generous timeout is recommended. In this example, `600000` is 10 minutes.
- `options.apiKey` - The bearer token generated in the previous step. OpenCode will use it when calling the tunnel endpoint.

You can now start OpenCode and run the `/models` command, then select the `Local Llama` provider and model. Send a small test prompt first, for example: `Reply with one sentence and tell me which model you are running on.`

### Connect with Claude Code

Claude Code can be started directly with the environment variables for the tunneled model. Point `ANTHROPIC_BASE_URL` at the tunnel root URL, not at `/v1`, and use the bearer token for `ANTHROPIC_AUTH_TOKEN`.

```sh
CLAUDE_CODE_API_TIMEOUT_MS=600000 \
CLAUDE_CODE_ATTRIBUTION_HEADER=0 \
CLAUDE_CODE_MAX_CONTEXT_TOKENS=100000 \
CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192 \
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70 \
ANTHROPIC_AUTH_TOKEN="<redacted>" \
ANTHROPIC_BASE_URL="https://vevamo.cambs1.tryinlets.dev" \
claude \
  --model unsloth/Qwen3.5-4B-MTP-GGUF:UD-Q4_K_XL
```

Inside Claude Code, you can use `/status` to confirm the active model and endpoint.

## Appendix: How to set up llama-server

For this tutorial, we're using a small model so that we can validate the tunnel, authentication, and client configuration quickly. For useful day-to-day work with coding agents, you will usually want to serve a more advanced model that has been tuned for coding and tool use.

On Apple Silicon, you can download the macOS arm64 `llama.cpp` release from the [llama.cpp releases page](https://github.com/ggml-org/llama.cpp/releases). The release binary includes Metal support, so `llama-server` can use GPU acceleration.

For NVIDIA GPUs, build `llama.cpp` from source with CUDA support. Unsloth's [llama.cpp MTP guide for Qwen models](https://unsloth.ai/docs/models/qwen3.6#llama.cpp-mtp-guide) shows the build and run commands for this setup.

In this example, we ran the model locally on an M1 MacBook Air with 16 GB of RAM. The model is served with `llama.cpp`'s `llama-server`.

```sh
./llama-server \
    -hf unsloth/Qwen3.5-4B-MTP-GGUF:UD-Q4_K_XL \
    --host 127.0.0.1 \
    --port 8081 \
    --ctx-size 100000 \
    --gpu-layers 99 \
    --parallel 1 \
    --threads 4 \
    --jinja \
    --reasoning off \
    --reasoning-budget 0
```

A few notes on the flags:

- `--host 127.0.0.1` keeps the server private to the local machine. Inlets Cloud will be the public entry point.
- `--port 8081` is the local port the model is served on.
- `--ctx-size 100000` sets the context window. Experiment with this value based on the memory available on your machine. A decent context size is important when using the model with agents. The agent's system prompt alone can already consume a significant number of tokens.
- `--jinja` enables the model's chat template, which is important for tool-calling capable models.
- `--reasoning off` and `--reasoning-budget 0` disable reasoning for this validation run. On the limited hardware used here, the model could not reliably complete the reasoning loop. If you are running on more capable hardware, experiment with turning reasoning back on and compare the results.

Check that the local server responds:

```sh
curl -s http://127.0.0.1:8081/v1/models | jq
```

You can also test a small chat completion locally:

```sh
curl -s http://127.0.0.1:8081/v1/chat/completions \
  -H "content-type: application/json" \
  -d '{
    "model": "unsloth/Qwen3.5-4B-MTP-GGUF:UD-Q4_K_XL",
    "messages": [
      {"role": "user", "content": "Reply with one short sentence."}
    ],
    "max_tokens": 128
  }' | jq
```

## Wrapping up

We exposed a local `llama.cpp` server through a managed tunnel using Inlets Cloud. The inference endpoint was secured with an API token and was accessible through a public URL.

The same approach will work for other inference engines such as [vLLM](https://vllm.ai) and [sglang](https://docs.sglang.io).

We showed how to plumb the public URL into both OpenCode and Claude Code but other harnesses work in a very similar way. In fact we often use a coding agent to add models to our agents rather than editing files manually.

To take this even further every coding agent should be able to follow the instructions to setup a tunnel, the only manual part you need is getting your token for Inlets Cloud.

If you prefer to run the tunnel infrastructure yourself, you can use the same client-side setup with a self-hosted `inlets-pro` HTTP tunnel server instead of Inlets Cloud. Start with the guide for [running an automated HTTP tunnel server](https://docs.inlets.dev/tutorial/automated-http-server), then add [HTTP authentication](https://docs.inlets.dev/tutorial/http-authentication/) so the public endpoint is protected in the same way as the managed tunnel above.
