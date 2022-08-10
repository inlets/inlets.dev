---
layout: post
title: How To Manage Inlets Tunnels With Argo CD and GitOps
description: Learn how Argo CD can make managing multiple tunnel servers easier through GitOps.
author: Han Verstraete
tags: management argocd kubernetes saas
author_img: welteki
image: /images/2022-managing-tunnels-with-argocd/background.png
date: 2022-08-10
---

If you're managing multiple inlets tunnel servers, Argo CD and GitOps could make your job easier. We'll show you how to set up two different inlets TCP servers using the inlets helm chart, Argo CD and SealedSecrets for the servers' authentication tokens.

## Introduction

In the previous blog post, [How To Manage Customer Services From Within Your Product](https://inlets.dev/blog/2022/08/03/accessing-customer-services.html) we showed how to deploy multiple, isolated tunnels, one for each customer and service. Adding additional tunnels and managing them can be made simpler by setting up a GitOps pipeline with [Argo CD](https://argo-cd.readthedocs.io/en/stable/). It lets you store the configuration for all your tunnels in a git repository and can automate their deployment.

![Diagram of Argo CD deploying multiple Inlets tunnel servers](/images/2022-managing-tunnels-with-argocd/argocd-inlets-servers.png)
> Argo CD monitors a git repository and deploys one or multiple Inlets tunnel servers based on the provided configuration.

Argo CD is one of the Cloud Native Computing Foundation’s (CNCF) projects for Continuous Delivery. If you are new to Argo CD and GitOps, the article: [Understanding Argo CD: Kubernetes GitOps Made Simple](https://codefresh.io/learn/argo-cd/) is a great place to start.

## Prepare a Kubernetes cluster

You'll need a Kubernetes cluster that is available on the internet. Your own public cluster or any managed service like Linode Kubernetes Engine, DigitalOcean Kubernetes, AWS Elastic Kubernetes Service (EKS) or Google Kubernetes Engine should work.

To access the control plane of each tunnel server we need to set up Kubernetes Ingress. Since we will be using the `inlets-pro` Helm chart to deploy our tunnel servers you can follow the steps in "Install the prerequisites" and "Install an Issuer" over in the guide: [Use your Kubernetes cluster for exit-servers](https://github.com/inlets/inlets-pro/tree/master/chart/inlets-pro).

After you complete setting up Ingress for the cluster we will install Argo CD. If you followed the previous steps, `arkade` should be available on your system. You can use it to install Argo CD.
```bash
arkade install argocd
```

## Run a TCP tunnel server

To install a tunnel server we need to override the default values from the inlets-pro Helm chart. Argo CD does not allow the use of external values.yaml files. The values files must be in the same repository as the Helm chart. We can work around this limitation by creating an "umberella chart".

```
# Example umbrella chart
├── Chart.yaml
└── values-postgresql-customer1.yaml
```

In the `Chart.yaml` of the umbrella chart we specify the `inlets-pro` chart as a dependency. We can then add multiple values files, one for each server that has to be created. The different values files in the chart can be referenced later by the Argo CD apps for each tunnel server.
```yaml
apiVersion: v2
name: inlets
description: Helm chart for an inlets-pro TCP server
type: application
version: 0.1.0
appVersion: "0.1.0"
dependencies:
  - name: inlets-pro
    version: 0.4.0
    repository: https://inlets.github.io/inlets-pro/charts
```

The `values-postgresql-customer1.yaml` sets the configuration values for the first tunnel server:
```yaml
inlets-pro:
  tokenSecretName: postgresql-customer1-token
  ingress:
    domain: postgresql-customer1.example.com

  dataPlane:
    type: ClusterIP
    ports:
    - targetPort: 5432
      protocol: TCP
      name: postgresql
      port: 5432
```

We set the address, in this case `postgresql-customer1.example.com`, that we want our inlets clients to connect to in the `ingress.domain` field. When the chart is deployed a Certificate is created and cert-manager will request a TLS certificate from Let’s Encrypt using a HTTP01 challenge.

In the `tokenSecretName` field we set the name of the secret containing the token that we want to use for this server. In the next section we will see how to create these secrets and make them available in the cluster.

As a last step we need to create a new Argo CD application to deploy the Inlets server using our Helm chart.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: postgresql-customer1-tunnel
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/welteki/inlets-server-argocd-demo.git
    targetRevision: HEAD
    path: charts/inlets
    helm:
      valueFiles:
        - values-postgresql-customer1.yaml
  destination:
    server: "https://kubernetes.default.svc"
    namespace: default
```

Deploy the Application using `kubectl apply`

## Manage tokens for your tunnels

Each inlets tunnel server requires a unique token. This token needs to be stored as a secret in the cluster so that it can be accessed by the inlets server. Argo CD is un-opinionated about how secrets are managed. Whether you want to use [Vault](https://www.vaultproject.io/), [Helm Secrets](https://github.com/jkroepke/helm-secrets) or [Secrets OPerationS (SOPS)](https://github.com/mozilla/sops), to name a few, they can all be set up to work with ArgoCD. We will be using [Bitnami Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets).

Install sealed-secrets and the `kubeseal` cli:

```bash
# Install sealed-secrets
arkade install sealed-secrets

# Install cli
arkade get kubeseal
```

> For simplicity arkade is used to install sealed-secrets but it can also be installed declaratively with an Argo CD application.

The `kubeseal` cli will let us encrypt a Kubernetes Secret using asymmetric encryption. It creates a SealedSecret CRD that can safely be stored in version control. Once a SealedSecret is deployed to the cluster, the Sealed Secrets controller will decrypt it and deploy a normal Kubernetes Secret.

Create a token for your inlets-pro server:

```bash
# Generate a random token
export TOKEN=$(head -c 16 /dev/random | shasum|cut -d" " -f1)

# Create a yaml-encoded Secret without adding it to the cluster
kubectl create secret generic postgresql-customer1-token \
  --dry-run=client \
  --from-literal=token=$TOKEN \
  -o yaml \
  > postgresql-customer1-token-secret.yaml
```

Use the `kubeseal` cli to retrieve the public key from the Sealed Secrets controller.

```
kubeseal --fetch-cert \
--controller-name=sealed-secrets \
--controller-namespace=default \
> mycert.pem
```

The certificate can be used to encrypt secrets without direct access to the Kubernetes cluster. It can safely be stored in version control.

Use the public key with the `kubeseal` cli to create a `SealedSecret` from the `Secret` we generated earlier.

```bash
kubeseal \
  --cert=mycert.pem \
  --format yaml \
  -f postgresql-customer1-token-secret.yaml > postgresql-customer1-token-sealed.yaml
```

All `SealedSecret` resources can be put into the templates folder so that they can be deployed with the Helm chart.

```
# Example umbrella chart
├── Chart.yaml
├── templates
│   └── postgresql-customer1-token-sealed.yaml
└── values-postgresql-customer1.yaml
```

## Run multiple servers

The steps described in the previous section can be repeated for each additional tunnel server that you want to run.

Create an additional secret and add it to the chart:

```bash
# Generate a random token
export TOKEN=$(head -c 16 /dev/random | shasum|cut -d" " -f1)

# Create a yaml-encoded Secret without adding it to the cluster
kubectl create secret generic mysql-customer2-token \
  --dry-run=client \
  --from-literal=token=$TOKEN \
  -o yaml \
  > mysql-customer2-token-secret.yaml

# Create a SealedSecret
kubeseal \
  --controller-name=sealed-secrets \
  --controller-namespace=default \
  --format yaml \
  -f mysql-customer2-token-secret.yaml > mysql-customer2-token-sealed.yaml
```

Add a new values file to the chart:

```yaml
# values-mysql-customer2.yaml
inlets-pro:
  tokenSecretName: mysql-customer2-token
  ingress:
    domain: mysql-customer2.example.com

  dataPlane:
    type: ClusterIP
    ports:
    - targetPort: 3306
      protocol: TCP
      name: mysql
      port: 3306
```

Create a new Argo CD app:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mysql-customer2-tunnel
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/welteki/inlets-server-argocd-demo.git
    targetRevision: HEAD
    path: charts/inlets
    helm:
      valueFiles:
        - values-mysql-customer2.yaml
  destination:
    server: "https://kubernetes.default.svc"
    namespace: default
```

Notice that the `spec.helm.valueFiles` field now references the `values.yaml` file for the second server.

> The [app of apps pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/) can be used to declaratively create the Argo CD app for each Inlets tunnel instead of doing it manually with `kubectl apply`.

## Automate things further

The pattern we described in the previous section works great if you only have to manage a couple of tunnel servers, but what if you have to manage dozens of servers? It can quickly become a mess to manage all the Argo CD Application resources. Luckily Argo CD provides a tool to automate the generation of Applications called [ApplicationSet](https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/).

The Application Set controller is deployed alongside Argo CD by default. Unlike an Argo CD Application resource, which deploys applications from a single source repository to a single destination cluster, the ApplicationSet CRD consists of [Generators](https://argocd-applicationset.readthedocs.io/en/stable/Generators/) and an Application template. A generator generates key/value parameters that are substituted in the Application template to render multiple applications.

![Diagram of ApplicationSet](/images/2022-managing-tunnels-with-argocd/application-set.png)
> The ApplicationSet applies generated parameters to the template and creates one or multiple Argo CD applications. Each application in turn deploys an Inlets server.

We can define an ApplicationSet for the inlets servers:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: inlets-tunnel
spec:
  generators:
  - list:
      elements:
      - name: postgresql-customer1-tunnel
        valuesFile: values-postgresql-customer1.yaml
  template:
    metadata:
      name: '{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/welteki/inlets-server-argocd-demo.git
        targetRevision: HEAD
        path: charts/inlets
        helm:
          valueFiles:
            - '{{valuesFile}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: default
      syncPolicy:
        automated:
          selfHeal: true
```

This ApplicationSet uses the [List generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/) which generates parameters based on a fixed list of arbitrary key/value pairs. In this case it contains values for the name of our inlets servers and the values file that Helm needs to use for the deployment.

In the application template section the fields like `{% raw %}{{name}}{% endraw %}` and `{% raw %}{{valuesFile}}{% endraw %}` are populated via parameters that will be replaced by the generator.

The process of deploying an additional inlets tunnel server with the ApplicationSet now looks like this:
- Add an additional token secret and `values.yaml` file to the chart.
- Add the server to the list of key/value pairs in the ApplicationSet generators section.

    ```yaml
    generators:
    - list:
        elements:
        - name: postgresql-customer1-tunnel
          valuesFile: values-postgresql-customer1.yaml
          # Add second server
        - name: mysql-customer2-tunnel
          valuesFile: values-mysql-customer2.yaml
    ```

- Commit and push your changes
- Sync changes manually in the UI or wait for Argo CD to automatically detect the drift in the repository.
- A new Argo CD application for a tunnel server should be created.

## Wrapping up

We showed you how Argo CD can be used to simplify deploying and managing multiple Inlets tunnel servers. We also demonstrated one of the many possible ways to manage secrets with Argo CD using [Bitnami Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets).

Some resources like the nginx ingress, Sealed Secrets controller and the Argo CD application for tunnel servers where installed manually with `arkade` or by running `kubectl apply`. The [app of apps pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/) can be used to automate all these steps and bootstrap your entire cluster with Argo CD.

In the tutorial the ApplicationSet is used to deploy all Argo CD applications to a single cluster. Additional parameters can be added to the template to deploy Inlets tunnel servers to multiple Kubernetes clusters. The examples from the [Argo CD user guide](https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/) can be used as a reference for this.

You may also like:
- [Bring GitOps to your OpenFaaS functions with ArgoCD ](https://www.openfaas.com/blog/bring-gitops-to-your-openfaas-functions-with-argocd/)
- [How to update your OpenFaaS functions automatically with the Argo CD Image Updater](https://www.openfaas.com/blog/argocd-image-updater-for-functions/)