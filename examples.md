Lucario
Background - transparent

https://carbon.now.sh


CLI example

```bash
# Set a shared auth token
$ export AUTH=""

# Setup a server in TCP mode
$ inlets-pro tcp server --auto-tls --auto-tls-san "178.62.70.130" \
  --token $AUTH

# Connect a client to provide upstream to 192.168.0.35 on the private
# network
$ inlets-pro tcp client --url wss://178.62.70.130:8123 \
  --token $AUTH \
  --upstream "192.168.0.35" \
  --ports "8080,2222"

# Use the tunnel for TCP traffic:
$ curl "http://178.62.70.130:8080/function/webhook"
$ ssh -p 2222 "pi@178.62.70.130"


```

HTTPS example


```bash
# Setup a server in HTTPS mode
$ inlets-pro http server --auto-tls --auto-tls-san "178.62.70.130" \
  --letsencrypt-domain "api.example.com" \
  --letsencrypt-email "mail@example.com" \
  --token $AUTH

# Connect a client and instruct the server which address to use 
# for each of the domains exposed
$ inlets-pro http client --url wss://178.62.70.130:8123 \
  --token $AUTH \
  --upstream "api.example.com=http://127.0.0.1:3000"

# Create a DNS record for the domain
$ doctl compute domain create api.example.com \
  --ip-address "178.62.70.130"

# Then access your website over the Internet with TLS
$ curl "https://api.example.com/v1/import"


```

Kubernetes example:

```bash
$ kubectl run nginx-1 --image=nginx --port=80 --restart=Always
pod/nginx-1 created

$ kubectl expose pod/nginx-1 --port=80 --type=LoadBalancer
service/nginx-1 exposed

# Install the operator with arkade or helm
$ arkade install inlets-operator \
  --provider digitalocean --region lon1 \
  --token-file "$HOME/do-token" \
  --license-file "$HOME/.inlets/LICENSE"

$ kubectl get svc/nginx-1 -w
NAME      TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
nginx-1   LoadBalancer   10.100.115.125   <pending>     80:32200/TCP   2m26s
nginx-1   LoadBalancer   10.100.115.125   178.62.28.53  80:32200/TCP   2m36s

# Live LoadBalancer in 10 seconds!
$ curl -s "http://178.62.70.130:80/"
```