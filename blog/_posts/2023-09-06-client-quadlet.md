---
layout: post
title: Run and expose Kubernetes Pod based Application using Quadlet and Inlets
description: As a Kubernetes user, you can use the same YAML file to expose your application using Inlets
author: Ygal Blum & Valentin Rothberg
tags: podman quadlet containers
author_img: ygalblum
#image: /images/2021-09-compose/writing.jpg
date: 2023-09-06
---

This tutorial is inspired by a previous post from Alex Ellis's on [running inlets with compose](https://inlets.dev/blog/2021/09/09/compose-and-inlets.html).
But instead of Compose, we want to show how to deploy inlets via Quadlet and make use of Podman's Kubernetes capabilities. Hence, we are going to run a `.kube` file via Quadlet and Podman.

[Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) is a new way of running containerized workloads in systemd with Podman.
Running Podman in systemd achieves a high degree of robustness and automation since systemd can take care of the lifecycle management and monitoring of the workloads.
More advanced features such as [Podman auto updates](https://docs.podman.io/en/latest/markdown/podman-auto-update.1.html) and [custom health-check actions](https://www.redhat.com/sysadmin/podman-edge-healthcheck) make Quadlet a handy tool for modern Edge Computing.

## Deploy the Inlets Server

When using inlets, users can provision the VMs acting as tunnel servers on various cloud providers.
The [post](https://inlets.dev/blog/2021/09/09/compose-and-inlets.html), inspiring this one, showed how to deploy it on [Linode](https://www.linode.com/) while a newer [post](https://inlets.dev/blog/2023/09/01/tunnel-aws-ec2.html) describes how it can be deployed on AWS.

Follow either posts, or deploy the tunnel server on any other provider.
The inlets [documentation](https://docs.inlets.dev/reference/inletsctl/#examples-for-specific-cloud-providers) provides details and examples for various providers.

Whichever provider you choose, `inletsctl` will print two parameters you will need when deploying the local client:
1. IP - The external IP address of the Inlets tunnel server
2. Auth-token - Token the client must use when connecting to the server

## Running GHost along with Inlets client

You can run Ghost on your local computer, a Raspberry Pi, or an additional EC2 instance.

### Secrets

The Inlets client depends on two secrets `inlets-license` and `inlets-token`.
However, because these secrets are consumed by a Kubernetes Pod, they also must take the form of a Kubernetes Secret

#### Inlets Token Secret

1. Use the following jinja template `inlets-token-secret.yml.j2`:
    ```jinja
    apiVersion: v1
    kind: Secret
    metadata:
        name: inlets-token
    stringData:
        inlets-token: "{% raw %}{{ inlets_token }}{% endraw %}"
    ```

2. Create the `token_data.json` file
    ```json
    {
        "inlets_token": "< TOKEN >"
    }
    ```
3. Generate the secret
    ```bash
    j2 inlets-token-secret.yml.j2 token_data.json | podman kube play -

#### Inlets License Secret

1. Use the following jinja template `inlets-license-secret.yml.j2`:
    ```jinja
    apiVersion: v1
    kind: Secret
    metadata:
        name: inlets-license
    stringData:
        inlets-license: "{% raw %}{{ inlets_license }}{% endraw %}"
    ```

2. Create the `license_data.json` file
    ```json
    {
        "inlets_license": "< LICENSE >"
    }
    ```
3. Generate the secret
    ```bash
    j2 inlets-license-secret.yml.j2 license_data.json | podman kube play -
    ```

### Kubernetes YAML and Quadlet

#### Kubernetes Pod YAML
1. Use the following jinja template `inlets-ghost.yml.j2`:

    ```jinja
    ---
    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: ghost-pv-claim
      labels:
        app: ghost
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 20Gi
    ---
    apiVersion: v1
    kind: Pod
    metadata:
      name: inlets-ghost-demo
    spec:
      containers:
      - name: ghost
        image: docker.io/library/ghost:5.59.0-alpine
        env:
        - name: url
          value: https://{% raw %}{{ inlets_server_domain }}{% endraw %}
        - name: NODE_ENV
          value: development
        volumeMounts:
        - name: ghost-persistent-storage
          mountPath: /var/lib/ghost/content
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
      - name: inlets
        image: ghcr.io/inlets/inlets-pro:{% raw %}{{ inlets_version | default('0.9.21') }}{% endraw %}
        args:
        - "http"
        - "client"
        - "--url=wss://{% raw %}{{ inlets_server_ip }}{% endraw %}:8123"
        - "--token-file=/var/secrets/inlets-token/inlets-token"
        - "--license-file=/var/secrets/inlets-license/inlets-license"
        - "--upstream=http://127.0.0.1:2368"
        volumeMounts:
        - mountPath: /var/secrets/inlets-token
          name: inlets-token
        - mountPath: /var/secrets/inlets-license
          name: inlets-license
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
      volumes:
      - name: ghost-persistent-storage
        persistentVolumeClaim:
          claimName: ghost-pv-claim
      - name: inlets-license
        secret:
          secretName: inlets-license
      - name: inlets-token
        secret:
          secretName: inlets-token
    ```
2. Create the `kube_data.json` file
    ```json
    {
        "inlets_server_ip": "192.168.1.1",
        "inlets_server_domain": "ghost.example.com"
    }
    ```
3. Generate the `inlets-ghost.yaml` file
    ```bash
    j2 inlets-ghost.yml.j2 kube_data.json > inlets-ghost.yml
    ```

#### Quadlet `inlets-ghost.kube` file
```
[Kube]
Yaml=inlets-ghost.yml
```

#### Create and run the Quadlet
Since the client does not require any root privileges, it can be executed as a user service

1. Copy the `inlets-ghost.yaml` and `inlets-ghost.kube` files to  `~/.config/containers/systemd/`
    ``` bash
    sudo cp inlets-ghost.yaml inlets-ghost.kube ~/.config/containers/systemd/
    ```
2. Reload the systemd daemon
    ```bash
    systemctl --user daemon-reload
    ```
3. Start the service
    ```bash
    systemctl --user start inlets-ghost.service
    ```

## Access the blog

Once all resources are up and running you can access you blog at your at `https://< inlets_server_domain >`

To create your admin account, add `/ghost` to the end of the URL.

## Wrapping up

The idea for this tutorial came during a twitter discussion about Podman's support for Kubernetes Yaml files, a feature not enough people are aware of.

You can use the example Yaml files and customize them to run any local application and connect it to your inlets server.

Following these instructions, you can take your Kubernetes Deployments (or Pods, or DaemonSets) and deploy them directly with Podman without the need of any translation or additional tools.

Using Quadlet you can make systemd manage your deployment for you.

If you want to learn more about Quadlet check out the following resources:
- [Man page](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [Make systemd better for Podman with Quadlet](https://www.redhat.com/sysadmin/quadlet-podman)
- [Deploying a multi-container application using Podman and Quadlet](https://www.redhat.com/sysadmin/multi-container-application-podman-quadlet)
- [Quadlet examples](https://github.com/containers/appstore/tree/main/quadlet)