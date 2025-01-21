---
layout: post
title: Quickstart - Automate & Scale Tunnels with Inlets Uplink
description: Inlets Uplink is a complete solution for managing tunnels, that scales from anywhere from ten to tens of thousands of tunnels. Try it out in 30 mins with this quickstart.
author: Alex Ellis
tags: tunnel management saas hosting
category: tutorial
rollup: true
author_img: alex
image: /images/2024-12-uplink-quickstart/background.png
date: 2024-12-09
---

Inlets Uplink is a complete solution for automating tunnels, that scales from anywhere from ten to tens of thousands of tunnels.

This guide get you started with deploying tunnels via the CLI, Kubernetes Custom Resource Definition (CRD), and REST API within about 30 minutes.

**Uplink vs inlets**

Now, you may be familiar with [inlets](https://inlets.dev/) as a stand-alone binary, and container image, and may have tried out the inlets-operator, that creates LoadBalancers for Services in your Kubernetes cluster. The stand-alone version is used to expose a few services from a private network to the Internet using HTTP or TCP tunnels, and it's great for small teams and individuals.

Uplink was built for for DevOps teams in large companies, SaaS providers, IoT solutions, and hosting providers, who need to connect to many different remote endpoints using automation to make the process as seamless as possible. It provides packaging, APIs, and observability for automating the same inlets code that is used in stand-alone architectures.

[![Conceptual diagram](/images/2024-12-uplink-quickstart/conceptual-uplink.png)](/images/2024-12-uplink-quickstart/conceptual-uplink.png)
> Conceptual diagram showing management via the REST API (client-api), and a private Kubernetes API server being tunneled back to the management cluster for automation via ArgoCD.

**About Uplink**

* It's a scalable solution for automating tunnels
* Installed via a Helm chart
* Implements tenant isolation through Kubernetes namespaces
* Includes a REST API, CLI and Custom Resource Definition (CRD) for managing tunnels
* Includes detailed Prometheus metrics on active tunnels
* Supports TCP and HTTP tunnels
* Endpoints are private by default, but can be made public

**Private or public HTTP & TCP endpoints**

By default, each HTTP and TCP endpoint is kept private, and can only be accessed from within the Kubernetes cluster using a [ClusterIP Service](https://kubernetes.io/docs/concepts/services-networking/service/).

This approach is ideal for managing customer endpoints or internal services that are hosted in private or hard to reach environments.

For hosting providers, where you want some or all of the tunnels to be publicly accessible, you can turn on the "data router" component and use Kubernetes Ingress or Istio to route traffic from your custom domains to the tunnel server.

When exposing tunnels to the Internet, you can create a new Ingress record for each domain, or use a wildcard domain so that a single Ingress record and TLS certificate can serve all tunnels. Learn more in: [Ingress for Tunnels](https://docs.inlets.dev/uplink/ingress-for-tunnels/).

Our [inlets cloud](https://inlets.dev/cloud) product is built on top of multiple inlets uplink installations in different regions around the world. Our UI makes use of the REST API (client-api) that's built into inlets uplink.

## Quick start

This guide is a quick start for installing inlets uplink as quickly as possible, and skips over some of the more advanced features like customizing the Helm chart, or enabling public endpoints, which are [mentioned in the documentation](https://docs.inlets.dev/uplink/).

We make the tutorial as fast as possible, we will use our arkade tool to install a few initial helm charts, but you are free to use `helm` directly if you prefer.

### Bill of materials

* A Kubernetes cluster with the ability to create public LoadBalancers
* An [Ingress controller](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/) or Istio
* [cert-manager](https://cert-manager.io/) to obtain TLS certificates
* Helm 3
* [Arkade](https://arkade.dev) CLI
* A domain under your control, where you can create a subdomain

### Install the Ingress controller and cert-manager

```bash
arkade install ingress-nginx
arkade install cert-manager
```

Next, find the public address for your Ingress controller:

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

This will be an IP address or a DNS name, some provides such as AWS EKS will provide a DNS name. Create DNS A records in the next step if you received an IP address, otherwise create CNAME records.

### Configure the uplink Helm chart

Create two DNS A or CNAME records to the IP or DNS name given in the previous step:

1. The first is for the client-api, this is the REST API that can be used to manage tunnels - `us1.uplink.example.com`
2. The second is for the client-router, this is the public endpoint that the inlets client will use - `clientapi.us1.uplink.example.com`

Next, edit values.yaml:

```sh
export LE_EMAIL="webmaster@example.com"
export CLIENT_ROUTER_DOMAIN="us1.uplink.example.com"
export CLIENT_API_DOMAIN="clientapi.us1.uplink.example.com"

cat <<EOF > values.yaml
ingress:
  class: "nginx"
  issuer:
    enabled: true
    name: "letsencrypt-prod"
    email: "$LE_EMAIL"

clientRouter:
  # Customer tunnels will connect with a URI of:
  # wss://uplink.example.com/namespace/tunnel
  domain: $CLIENT_ROUTER_DOMAIN
  tls:
    ingress:
      enabled: true

clientApi:
  enabled: true
  domain: $CLIENT_API_DOMAIN
  tls:
    ingress:
      enabled: true
```

The REST API provided by the `clientApi` section is secured with an API token that we will generate in a moment, however OIDC/Auth2 can also be used, and is best for when you have several different uplink regions.

The OIDC/OAuth2 authentication is set through the following, but is not recommended for the quick start, since it requires additional infrastructure such as Keycloak or Okta.

```yaml
clientApi:
  # When using OAuth/OIDC tokens to authenticate the API instead of
  # a shared secret, set the issuer URL here.
  issuerURL: "https://keycloak.inlets.dev/realms/inlets-cloud"

  # The audience is generally the same as the value of the domain field, however
  # some issuers like keycloak make the audience the client_id of the application/client.
  audience: "cloud.inlets.dev"
```

Before installing the Helm chart, we need to make sure some secrets exist in the cluster.

Create the `inlets` namespace, do not customise this for the quick start, since you'll have to edit every command:

```bash
kubectl create namespace inlets
kubectl label namespace inlets \
    inlets.dev/uplink=1
```

Create a secret with the inlets-uplink license key:

```bash
kubectl create secret generic \
  -n inlets inlets-uplink-license \
  --from-file license=$HOME/.inlets/LICENSE_UPLINK
```

Create the API token for the client-api:

```bash
export token=$(openssl rand -base64 32|tr -d '\n')
mkdir -p $HOME/.inlets
echo -n $token > $HOME/.inlets/client-api

kubectl create secret generic \
  client-api-token \
  -n inlets \
  --from-file client-api-token=$HOME/.inlets/client-api
```

Now install the chart:

```sh
helm upgrade --install inlets-uplink \
  oci://ghcr.io/openfaasltd/inlets-uplink-provider \
  --namespace inlets \
  --values ./values.yaml
```

### Verify the installation:

```bash
# Check the deployments were created and are running with 1/1 replicas:
kubectl get deploy -n inlets

# Check the logs of the various components for any errors:
kubectl logs deploy/client-api -n inlets
kubectl logs deploy/inlets-router -n inlets
kubectl logs deploy/cloud-operator -n inlets

# Make sure that the certificates were issued by cert-manager:
kubectl get certificate -n inlets -o wide
```

### Connect a remote HTTP endpoint

You can define a HTTP or a TCP tunnel, for this example we will use HTTP.

For a simple test, run the built-in HTTP fileserver from the inlets binary on your local machine, and share a new temporary folder:

```sh
mkdir -p /tmp/share
echo "Hello from $(whoami)" > /tmp/share/index.html

cd /tmp/share

inlets-pro fileserver \
    --webroot /tmp/share \
    --port 8080 \
    --allow-browsing
```


It can be created via a Kubernetes CRD, via the REST API, or via the CLI.

You'll find examples for each in the documentation.

```sh
inlets-pro get tunnel

inlets-pro tunnel list

inlets-pro tunnel create \
    fileserver \
    --upstream 127.0.0.1:8080
```

Then get the connection string, you can format this as a CLI command or as Kubernetes YAML to expose a Pod, Service, etc within a private cluster.

```sh
inlets-pro tunnel connect \
    fileserver \
    --namespace inlets \
    --domain https://$CLIENT_ROUTER_DOMAIN
```

The default output is for a CLI command you can run on your machine:

* `--format cli` - default
* `--format k8s_yaml` - for Kubernetes YAML to apply to a private cluster
* `--format systemd` - generate a systemd unit file to install on a Linux machine

Both Kubernetes and systemd will restart the tunnel if it fails, and retain logs that you can view later.

Start up the tunnel client with the command you were given.

Remember, by default Inlets Uplink uses private endpoints, so you will need to run a Pod within the cluster to access the tunnel.

```sh
kubectl run --rm -it --restart=Never \
  --image=alpine:latest \
  --command -- sh
```

Then install curl and access the tunnel:

```sh
# apk add curl
# curl -i http://fileserver.inlets:8000/index.html
```

All HTTP tunnels bind to port 8000, and can multiplex multiple services over the same port using a Host header.

### Create a TCP tunnel

Perhaps you need to access a customer's Postgres database from their private network?

In this example we'll define the tunnel using a Custom Resource instead of the CLI.

Example Custom Resource to deploy a tunnel for a Postgres database:

```yaml
apiVersion: uplink.inlets.dev/v1alpha1
kind: Tunnel
metadata:
  name: db1
  namespace: inlets
spec:
  licenseRef:
    name: inlets-uplink-license
    namespace: inlets
  tcpPorts:
  - 5432
```

Alternatively the cli can be used to create a new tunnel:

```bash
inlets-pro tunnel create db1 \
  --namespace inlets \
  --port 5432
```

The quickest way to spin up a Postgres instance on your own machine would be to use Docker:

```bash
export PASSWORD=$(head -c 16 /dev/urandom |shasum)
echo $PASSWORD > ./postgres-password.txt

docker run --rm --name postgres \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=$PASSWORD \
  -ti postgres:latest
```

**Connect with an inlets uplink client**

```bash
inlets-pro tunnel connect db1 \
    --namespace inlets \
    --domain https://$CLIENT_ROUTER_DOMAIN \
    --upstream 127.0.0.1:5432
```

Run the above command on your local machine to generate the tunnel client command.

Then run it on your local machine to connect to the tunnel.

**Access the customer database from within Kubernetes**

Now that the tunnel is established, you can connect to the customer's Postgres database from within Kubernetes using its ClusterIP `db1.inlets.svc.cluster.local`:

Try it out:

```bash
kubectl run -i -t psql \
  --env PGPORT=5432 \
  --env PGPASSWORD=$(cat ./postres-password.txt) --rm \
  --image postgres:latest -- psql -U postgres -h db1.inlets
```

Try a command such as `CREATE database websites (url TEXT)`, `\dt` or `\l`.

### Create a TCP tunnel using the REST API

You can view the reference documentation for the REST API for Inlets Uplink here: [REST API](https://docs.inlets.dev/uplink/rest-api/)

This example will tunnel a private Kubernetes cluster to your management cluster for administration or automation through tools such as kubectl, ArgoCD, Helm, Flux, or your own Kubernetes operators.

If you don't use Kubernetes, you can still try out the commands, then delete the tunnel without connecting to it.

If you do want to try the example and don't have a private cluster handy, you can create one using Docker via the `kind create cluster --name kube1` command. The kind tool is available via `arkade get kind`.

As a general rule, the upstream should be `kubernetes.default.svc` and the port should be `443`, for K3s clusters, the port is often changed to `6443`.

Retrieve the API token for the client-api from Kubernetes:

```sh
export TOKEN=$(kubectl get secret -n inlets client-api-token \
  -o jsonpath="{.data.client-api-token}" \
  | base64 --decode)
```

Create a new tunnel using the REST API:

```sh
export CLIENT_API=https://clientapi.us1.uplink.example.com

export NAME="kube1"

curl -s -H "Authorization: Bearer ${TOKEN}" \
  -X POST \
  $CLIENT_API/v1/tunnels \
  -d '{"name": "kube1", "namespace": "inlets", "tcpPorts": [443] }' \
  | jq

{"name":"kube1","namespace":"inlets","created":"2024-12-09T11:01:38Z"}
```

You can verify the result via the API or via `kubectl`:

```sh
kubectl get tunnels.uplink.inlets.dev/kube1 -n inlets -o wide

NAME    AUTHTOKENNAME   DEPLOYMENTNAME   TCP PORTS   DOMAINS   INGRESS
kube1   kube1           kube1            [443]   
```

List the tunnels we created earlier, along with the new one with:

```sh
curl -s -H "Authorization: Bearer ${TOKEN}" \
  $CLIENT_API/v1/tunnels \
  | jq

[
  {
    "name": "kube1",
    "namespace": "inlets",
    "tcpPorts": [
      443
    ],
    "connectedClients": 0,
    "created": "2024-12-09T11:01:38Z"
  }
]
```

You can build a connection command using the `inlets-pro tunnel connect` command:

```sh
export CLIENT_ROUTER=us1.uplink.example.com

inlets-pro tunnel connect kube1 \
    --namespace inlets \
    --domain https://$CLIENT_ROUTER_DOMAIN \
    --format k8s_yaml \
    --upstream kubernetes.default.svc:443 > kube1-client.yaml
```

Switch your Kubernetes cluster to the private cluster, then apply the YAML file for the inlets client with `kubectl apply -f kube1-client.yaml`.

Check that the client connected:

```sh
kubectl logs deploy/kube1-inlets-client

time="2024/12/09 11:27:03" level=info msg="Connecting to proxy" url="wss://us1.uplink.example.com/inlets/kube1"
time="2024/12/09 11:27:03" level=info msg="Connection established" client_id=51dbd4430bac4049b56f107481d25394
```

Now switch back to the management cluster's context.

The cluster will be available via a ClusterIP in the inlets namespace name `kube1.inlets` on port 443.

**Access the Kubernetes API server**

Either set up the additional TLS name for the Kubernetes API server's SAN such as `kube1.inlets` (K3s makes this easy via `--tls-san`), or update the KUBECONFIG to provide the [server name as per these instructions](https://docs.inlets.dev/tutorial/kubernetes-api-server/#update-your-kubeconfig-file-with-the-new-endpoint), or use `--insecure-skip-tls-verify`.

Find the following section and edit it:

```yaml
- cluster:
    server: https://kube1.inlets:443
    tls-server-name: kubernetes
```

For a quick test, run a Pod in the cluster and try to access the Kubernetes API server using `--insecure-skip-tls-verify`:

```sh
kubectl run -i -t kube1-connect \
  --namespace inlets \
  --image=alpine:latest --rm \
  --restart=Never -- sh

# apk add kubectl curl

# curl -i -k https://kube1.inlets:443
```

Put your kubeconfig into place at .kube/config, update the server name and endpoint to https://kube1.inlets:443

You can use `cat > .kube/config` to create the file, then paste in the contents from your machine. Hit Control+D when done. This is quicker than installing an editor such as nano or vim into the container.

```sh
# cd
# mkdir -p .kube
# cat > .kube/config

# kubectl --context kind-kube1 get node
NAME                  STATUS   ROLES           AGE   VERSION
kube1-control-plane   Ready    control-plane   19m   v1.31.0
# 
```

## Next steps

In a short period of time, we installed inlets uplink to a Kubernetes cluster, and created public endpoints for the REST API (client-api) and the client-router. We then created three tunnels using the CLI, the CRD and the REST API. We used a single namespace for all the tunnels, but you can create a namespace per tenant, and then input the namespace into each of these approaches.

Once you have services such as Postgresql, SSH, Ollama, the Kubernetes API server, or your own TCP/HTTP services tunneled back to the management cluster, you can start accessing the endpoints as if they were directly available within the Kubernetes cluster.

This means that all CLIs, tools, and products that work with whatever you've tunneled can be used without modification.

**Common uses-cases for inlets-uplink**

* Do you have an agent for your SaaS product, that customers need to run on private networks? Access it via a tunnel.
* Perhaps you manage a number of remote databases? Use pgdump and pgrestore to backup and restore databases.
* Do you deploy to Kubernetes? Use kubectl, Helm, ArgoCD, or Flux to deploy applications, just run them in-cluster.
* Do you write your own Kubernetes operators for customers? Just provide the updated KUBECONFIG to your Kubernetes operators and controllers.
* Do you want to access GPUs hosted on Lambda Labs, Paperspace, or your own datacenter? Command and control your GPU instances from your management cluster.
* Do you have a powerful GPU somewhere and want to infer against it using your central cluster? Run ollama remotely, and tunnel its REST API back.
* Do you have many different edge devices? Tunnel SSHD and run Ansible, Puppet, or bash scripts against them just as if they were on your local network.

In the documentation you can learn more about managing, monitoring and automating tunnels.

If you're new to Kubernetes, and would like us to give you a hand setting everything up, we'd be happy to help you with the installation, as part of your subscription benefits.

Would you like a demo, or to speak to our team? [Reach out here for a meeting](https://inlets.dev/contact).

See also:

* [Inlets Uplink documentation](https://docs.inlets.dev/uplink/)
* [Inlets Uplink REST API](https://docs.inlets.dev/uplink/rest-api/)
* [Monitor Inlets Uplink tunnels](https://docs.inlets.dev/uplink/monitoring-tunnels/)
* [Expose a Kubernetes API Server via inlets](https://docs.inlets.dev/tutorial/kubernetes-api-server/)
* [Expose Inlets Uplink tunnels publicly for Ingress](https://docs.inlets.dev/uplink/ingress-for-tunnels/)

