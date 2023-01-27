---
layout: post
title: Host a private Git server in your homelab with Gitea and Kubernetes
description: Alex shows you how to access Gita from within a private Kubernetes cluster, from anywhere.
author: Alex Ellis
tags: kubernetes gitea homelab selfhosting
author_img: alex
date: 2023-01-27
---

Alex shows you how to access Gita from within a private Kubernetes cluster, from anywhere.

[Blaise Pabon](https://twitter.com/controlpl4n3), a long-time community member told me he was struggling to set up a Gitea instance in his homelab. He wanted it to show off his portfolio and knowledge of Kubernetes whilst interviewing for his next role. I took some time out to look into this for him and write it up so anyone can follow along.

We're using inlets to get remote access to Gitea's HTTPS and SSH ports, but you could find other ways to do this if you wish. Check out my post on [When your ISP won't give you a static IP](https://inlets.dev/blog/2021/04/13/your-isp-wont-give-you-a-static-ip.html) and [the inlets FAQ](https://docs.inlets.dev/faq) for some of the differences.

## Isn't GitHub where all the action is?

GitHub is a great place to host your code, but it's not the only place. There are many other Git hosting providers, and you can even host your own Git server. In this post, I'll show you how to host your own Git server using [Gitea](https://gitea.io/en-us/), and how to expose it to the world.

Why would you want to do that?

As an ardent user of GitHub myself for personal projects, Open Source and commercial software, I'm probably not the target market here, but I have run my own Git server in the past with plain SSH and also with GitLab. There's something satisfying about having your own code server, of being able to invite your friends, show off your work, and to customise it however you see fit.

## Tutorial: Self-hosting Gitea on Kubernetes

Gitea ("A painless self-hosted Git service.") is an Open Source fork of the [Gogs](https://gogs.io/) project, and has a built-in UI that looks very similar to GitHub's. It has integration points for CI, webhooks, bots, and Role Based Access Control (RBAC).

There are two main ways to access it as a user:

* The web UI (mentioned above) for administration, and cloning public repositories
* SSH - for cloning private repositories and pushing changes to the server securely

Since the web UI requires HTTPS, the easiest way to expose Gitea to the world is to use an Ingress Controller, leaning on cert-manager to acquire, manage and renew a free TLS certificate from Let's Encrypt.

Initially, I struggled to find the right configuration for Gitea but got there in the end and want to share that with you, so you can get up and running quickly.

I'm using [arkade](https://arkade.dev) to install charts and CLIs, however you can use Helm or kubectl directly, if you prefer. Just navigate to the homepage of each tool and follow the instructions to install them.

Before we get started:

```bash
arkade get kubectl helm
```

### Setup an Ingress Controller and cert-manager

First, set up an Ingress Controller and cert-manager.

```bash
arkade install nginx-ingress
arkade install cert-manager
```

If you're using K3s, you may have Traefik pre-installed. You can use Traefik, or delete it and install nginx-ingress instead.

(Optional step to remove Traefik):

```bash
kubectl delete svc/traefik -n kube-system
kubectl delete deploy/traefik -n kube-system
```

Create an issuer for cert-manager to use to obtain certificates from Let's Encrypt:

```bash
export DOMAIN="gitea.example.com"
export EMAIL="webmaster@$DOMAIN"

cat > issuer-prod.yaml <<EOF
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-prod
  namespace: gitea
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: $EMAIL
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - selector: {}
      http01:
        ingress:
          class: nginx
EOF

kubectl apply -f issuer-prod.yaml
```

> Just remember to replace "nginx" with "traefik" if you're using K3s, and didn't switch to ingress-nginx.

### Setup an admin password

Create an initial password for an admin user. We'll be exposing this on the Internet, so OpenSSL can be used to generate a password:

```bash
$(openssl rand -base64 32) > admin.txt

kubectl create secret generic gitea-admin-secret \
    -n gitea \
    --from-literal username=git \
    --from-file password=./admin.txt
```

### Define values.yaml for Helm

Gitea can be installed using a Helm chart, you can find out more about it here: [Gitea helm chart](https://gitea.com/gitea/helm-chart/)

You need to customise this before pasting it in.

Set the DOMAIN and EMAIL variables accordingly, then run the command:

```yaml
export DOMAIN=gitea.example.com
export EMAIL=webmaster@$DOMAIN

cat <<EOF > values.yaml
ingress:
  enabled: true
  annotations:
     cert-manager.io/issuer: letsencrypt-prod

     kubernetes.io/ingress.class: nginx
     kubernetes.io/tls-acme: "true"
  hosts:
    - host: $DOMAIN
      paths:
        - path: /
          pathType: Prefix
  tls:
  - secretName: gitea-tls
    hosts:
        - $DOMAIN
service:
  http:
    type: ClusterIP
    port: 3000
    clusterIP: None
  ssh:
    type: LoadBalancer
    port: 2222
    clusterIP: None

gitea:
  admin:
    existingSecret: gitea-admin-secret
    email: $EMAIL
  config:
    server:
      SSH_DOMAIN: gitea-ssh.example.com
    service:
      DISABLE_REGISTRATION: true
      SHOW_REGISTRATION_BUTTON: false
EOF
```

I've turned off anonymous registration, to prevent any unwanted users from signing up and uploading spurious content to our server.

### Install the chart for Gitea

```bash
helm repo add gitea-charts https://dl.gitea.io/charts/
helm repo update

kubectl create namespace gitea

helm upgrade --install gitea \
  gitea-charts/gitea \
  --namespace gitea \
  -f ./values.yaml
```

### Install the inlets-operator

The inlets-operator will look for any LoadBalancer services in your Kubernetes cluster and create a tunnel server for each of them. The Gitea chart needs one LoadBalancer IP for the HTTP UI and another for SSH.

Install the inlets-operator using this guide: [Docs: inlets-operator installation](https://docs.inlets.dev/reference/inlets-operator/)

### Find your public IP addresses

Find the IP of the Ingress Controller in the default namespace, or kube-system for traefik.

```bash
kubectl get tunnels -o wide
NAME                              SERVICE                    TUNNEL   HOSTSTATUS     HOSTIP   HOSTID
ingress-nginx-controller-tunnel   ingress-nginx-controller            active       134.209.22.40   337809678
```

Find the IP of of the SSH service in the gitea namespace.

```bash
kubectl get tunnels -o wide -n gitea
NAME               SERVICE     TUNNEL   HOSTSTATUS   HOSTIP         HOSTID
gitea-ssh-tunnel   gitea-ssh            active       159.65.28.33   337809677
```

Once you find the public IP address created by the inlets-operator, you'll need to create a DNS A record in your DNS control panel.

I.e. `gitea.example.com` should point to the IP address of the LoadBalancer service for ingress-nginx or traefik.

Create a separate DNS A record for the SSH service, i.e. `ssh.gitea.example.com` should point to the IP address of the LoadBalancer service for the SSH service.

If you're using DigitalOcean to manage your DNS records, you can create the entries like this:

```bash
doctl compute domain create \
    --ip-address 134.209.22.40 \
    gitea.example.com

doctl compute domain create \
    --ip-address 159.65.28.33 \
    gitea-ssh.example.com
```

## Log in as an administrator

Log in as an administrator by visiting https://gitea.example.com/admin.

Then, you can log out and log in as a regular user.

The username is git and the password was saved in the "admin.txt" file in an earlier step.

![Create the first user](/images/2023-01-gitea-k8s/new-user.png)

> Create the first user

### Access the Gitea UI as a normal user

You should now be able to access the Gitea UI at https://gitea.example.com

![Gitea UI](/images/2023-01-gitea-k8s/create-repo.png)

Note that the URL for cloning via SSH is configured in the Helm chart and is different from the URLs for the UI.

```bash
git clone ssh://git@gitea-ssh.o6s.io:2222/alex/web-scraper.git
```

Here you can see the domain configured and showing up in clone URLs:

![Gitea SSH URL](/images/2023-01-gitea-k8s/clone-ssh.png)
> The SSH URL is configured in the Gitea config

If you see `503 Service Temporarily Unavailable` or a bad TLS record, then the chances are that you didn't edit the domain in one of the commands, or tried to use an invalid configuration setting.

Gitea uses initialisation and migration scripts, I found that when changing settings, I had to delete the PersistentVolumes and Helm chart before configuration would reload.

This is how I found out what was failing:

```bash
kubectl logs pod/gitea-0 -n gitea -c configure-gitea
```

Learn how to troubleshoot Kubernetes with my guide: [How to Troubleshoot Applications on Kubernetes](https://blog.alexellis.io/troubleshooting-on-kubernetes/)

[Gitea config cheat-sheet](https://docs.gitea.io/en-us/config-cheat-sheet/#service-service)


## Wrapping up

There are many different configuration options for Gitea, you may want to explore how you can configure it through the documentation.

* Why not create an integration with webhooks, using OpenFaaS Functions? [Extend and automate self-hosted Gitea with functions](https://www.openfaas.com/blog/gitea-faas/) by [Matti Ranta](https://twitter.com/techknowlogick)
* How about inviting some of your friends to collaborate on a project?
* Could you mirror your favourite Open Source projects from GitHub to your own server?
* Try a different Git hosting solution like Gitlab. [Gitlab](https://gitlab.com) is popular with enterprise companies and includes its own CI runner mechanisms. If you'd like to try it out, the steps will be largely the same as what we explored here. See also: [Gitlab Helm chart](https://docs.gitlab.com/charts)

What other ideas do you have? Feel free to reach out to me on Twitter: [@alexellisuk](https://twitter.com/alexellisuk)

Related articles:

* [Access your local cluster like a managed Kubernetes engine](https://inlets.dev/blog/2022/07/07/access-kubernetes-api-server.html)
* [Monitor inlets tunnels with Grafana Cloud](https://inlets.dev/blog/2022/09/02/monitor-inlets-with-grafana.html)
* [Expose Traefik with K3s to the Internet](https://inlets.dev/blog/2021/12/06/expose-traefik.html)

