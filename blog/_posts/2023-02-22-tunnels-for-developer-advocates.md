---
layout: post
title: Why do Developer Advocates like network tunnels?
description: Over the past three years we've seen inlets has become a hit with developer advocates, but why?
author: Alex Ellis
tags: kubernetes demos devrel
author_img: alex
image: /images/2023-02-tunnels-dev-advocates/background.jpg
date: 2023-02-22
---

Over the past three years we've seen inlets has become a hit with developer advocates, but why? And how does it stack up against Tailscale, Ngrok and Wireguard?

## Developers like me

[Inlets](https://inlets.dev/) began its journey on the cusp of 2019 over the holiday season as a Proof of Concept (PoC), with the simple idea of making a tunnel that could be self-hosted and didn't have any artificial limits.

I built it for myself. I wanted a tunnel that was born in the cloud, built for Kubernetes, built for containers, without rate-limits and that followed the same principles that had made [OpenFaaS](https://openfaas.com) so popular - simplicity, security and portability.

The incumbent solutions like Ngrok and Cloudflare Argo were not a good fit for several reasons:

* They were tied to a SaaS, meaning all your data had to pass through the vendor's servers
* You had to buy your domain names from the parent company, or transfer it there
* In the case of Ngrok, they were heavily rate-limited, even on paid plans, with stingy bandwidth limits
* Ngrok was and possibly still is banned by many corporate networks, by simply blocking the domain name "*.ngrok.io" used to connect tunnels
* Neither product had container images, Kubernetes integrations or Helm charts

They just were not built for the needs of Cloud Native practitioners. Ngrok was built many years ago when most developers wrote in Ruby or PHP and ran it directly on their own machine for development.

So inlets was a response to these issues, and quickly gained popularity with its intended audience.

Two of the maintainers of cert-manager started using the inlets-operator to get public IPs for KinD clusters, to test Let's Encrypt integrations and to run demos at KubeCon.

And it was really popular with personal users and developer advocates who used it to run demos with customers, on live-streams and at events like KubeCon.

Nathan Peck at AWS [built out an AWS ECS Anywhere lab](https://nathanpeck.com/ingress-to-ecs-anywhere-from-anywhere-using-inlets/) and told me that traditional VPNs did not work well, and that he'd used inlets TCP tunnels to load balance instead:

<blockquote class="twitter-tweet" data-conversation="none"><p lang="en" dir="ltr">You can try it out by sending traffic to <a href="https://t.co/s4h7DweKMF">https://t.co/s4h7DweKMF</a><br><br>Your request goes to an AWS Fargate hosted Inlets exit server, and then down to a Raspberry Pi sitting on my desk!<br><br>Refresh a few times to reach all of my Raspberry Pi&#39;s! <a href="https://t.co/xslB7Gz4NL">pic.twitter.com/xslB7Gz4NL</a></p>&mdash; Nathan Peck (@nathankpeck) <a href="https://twitter.com/nathankpeck/status/1438554384238006276?ref_src=twsrc%5Etfw">September 16, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

The infamous CNCF parody account "Memenetes" noticed us and even added inlets to his Cloud Native Puzzle "Now with inlets and K3s":

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Kid: I want a really difficult puzzle for my birthday<br>Me: <a href="https://t.co/y5dzjL6mIv">pic.twitter.com/y5dzjL6mIv</a></p>&mdash; memenetes (@memenetes) <a href="https://twitter.com/memenetes/status/1247630361242279936?ref_src=twsrc%5Etfw">April 7, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

And inlets was presented at various conferences like the OSSummit and [Cloud Native Rejekts](https://cloud-native.rejekts.io/) by the community:

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">At <a href="https://twitter.com/hashtag/OSSummit?src=hash&amp;ref_src=twsrc%5Etfw">#OSSummit</a> <a href="https://twitter.com/ellenkorbes?ref_src=twsrc%5Etfw">@ellenkorbes</a> is providing a great overview of the many dev, debug, build, deploy, etc. tools available to developers in the Kubernetes ecosystem. Shout-out to <a href="https://twitter.com/inletsdev?ref_src=twsrc%5Etfw">@inletsdev</a> by my friend <a href="https://twitter.com/alexellisuk?ref_src=twsrc%5Etfw">@alexellisuk</a>! <a href="https://t.co/UblhwesF2i">pic.twitter.com/UblhwesF2i</a></p>&mdash; Phil Estes (@estesp) <a href="https://twitter.com/estesp/status/1189506674392031233?ref_src=twsrc%5Etfw">October 30, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

[Ellen Korbes](https://twitter.com/l_korbes), used inlets at their time at Garden to get public ingress for demos.

Over the years since 2019, there have been too many users to mention individually, but here are a few:

* [Connor Hicks](https://twitter.com/cohix?lang=en), then at 1Password, now founder at Suborbital [used inlets with his WebAssembly project to get Ingress directly to his Raspberry Pi](https://twitter.com/cohix/status/1359885962407518210?ref_src=twsrc%5Etfw) during development
* [Carlos Santana](https://twitter.com/csantanapr), Staff Developer Advocate at IBM, now at AWS [used inlets to get webhooks to Tekton Pipelines, for development](https://twitter.com/csantanapr/status/1223759215816257536?ref_src=twsrc%5Etfw)
* [Kat](https://twitter.com/usrbinkat), a developer advocate at Kong [used inlets to run a demo of Kong's API Gateway with live traffic](https://twitter.com/usrbinkat/status/1557430745332781057?ref_src=twsrc%5Etfw).
* [Michael Cade](https://twitter.com/MichaelCade1) of Kasten/Veeam picked inlets for a customer demo because in his words "A VPN was overkill, giving way too much access away" - [Managing private Kubernetes clusters with Kasten](https://vzilla.co.uk/vzilla-blog/dark-kubernetes-clusters-managing-multi-clusters)
* [Marino Wijay](https://twitter.com/virtualized6ix) of Solo.io signed up to inlets to demo the new [Ambient Mesh changes](https://istio.io/latest/blog/2022/introducing-ambient-mesh/) in the Istio project.

Whilst not a developer advocates, here are three other examples I really enjoyed:

[Mark Sharpley from the UK connected his solar-powered boat to the Internet with inlets](https://inlets.dev/blog/2021/07/13/inlets-narrowboat.html) so he could monitor it with Prometheus. That's about as Cloud Native as it gets.

And [Zespre Schmidt](https://twitter.com/starbops) spontaneously wrote up a really comprehensive guide to inlets for personal use: [A Tour of Inlets - A Tunnel Built for the Cloud](https://blog.zespre.com/inlets-the-cloud-native-tunnel.html)

[Johan Siebens](https://johansiebens.dev/), a Kubernetes and infrastructure contractor went on a content spree, writing dozens of tutorials and utilities for inlets, including a popular one on hosting tunnel servers [for free on Fly.io](https://inlets.dev/blog/2021/07/07/inlets-fly-tutorial.html) and using [ArgoCD to manage multi-cloud Kubernetes clusters](https://inlets.dev/blog/2021/06/02/argocd-private-clusters.html).

Over the three years, we've had a lot of love from the community.

I want to say thank you from me. We're still building inlets for developers and would love to hear from you on how you're using it for personal use or at work.

The core of inlets is a single binary, but there are dozens of Open Source tools built around it:

The [inlets-operator](https://github.com/inlets/inlets-operator) looks for LoadBalancer services in Kubernetes, then creates a cheap tunnel VM with the inlets-pro server pre-installed, runs a Pod in the cluster with the client, and then updates the service IP.

[Ivan Velichko](https://twitter.com/iximiuz), then SRE at Booking.com, now developer at Docker Slim wrote a detailed review and explanation of the inlets-operator, that created tunnel servers for LoadBalancers for private clusters: [Exploring Kubernetes Operator Pattern](https://iximiuz.com/en/posts/kubernetes-operator-pattern/).

![Inlets Operator animation](https://iximiuz.com/kubernetes-operator-pattern/kube-operator-example-opt.gif)
> Inlets Operator animation

Not everyone needed to run inlets inside Kubernetes, after all, containerd, Docker and Firecracker are also Cloud Native runtimes.

That's where the inletsctl CLI came in. It shares a [cloud provisioning library](https://github.com/inlets) with the inlets-operator, and can be used to set up a new tunnel server in less than 30 seconds.

```bash
inletsctl create \
  --provider digitalocean \
  --access-token-file ~/.digitalocean/token \
  --region lon1
```

There's also options for Let's Encrypt and for TCP tunnels.

After a few moments, usually under 30 seconds, you'll get a "connection string" for the `inlets-pro client` which you can run on your machine.

Some users wanted to set up a TCP tunnel server, and multiplex multiple different TCP services over it. They'd started using HAProxy, but found it wasn't available on Windows, so we wrote a [tiny OSS TCP load balancer as an alternative to HAProxy](https://github.com/inlets/mixctl) which has over 400 stars on GitHub.

Nathan LeClaire and Sven Dowideit integrated the code directly into their new start-up product to save on writing boiler-plate code.

Inlets doesn't just do remote port forwarding like Ngrok, it also does local forwarding.

A developer in the UK Government kept banging his head against the wall with the flakiness of "kubectl port-forward", so we wrote a feature to help him: [Fixing the Developer Experience of Kubernetes Port Forwarding](https://inlets.dev/blog/2022/06/24/fixing-kubectl-port-forward.html).

Han Verstraete, who works at OpenFaaS Ltd uses local tunnels to access Prometheus, Grafana and OpenFaaS from within his KinD clusters whilst working on OpenFaaS Pro. You can find out how in my article: [A Primer: Accessing services in Kubernetes](https://blog.alexellis.io/primer-accessing-kubernetes-services/).

Let's not forget, that I also use inlets. When I was working on a product that had to integrate with webhooks from GitHub.com and GitLab.com at the same time, I closed the lid on my laptop, opened it again in a cafe down the road and everything continued to work exactly the same.

You can't do that with a static IP or port forwarding set up on your router.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">inlets-operator brings a Service LoadBalancer with public IP to any Kubernetes cluster i.e. minikube/k3d/KinD/kubeadm<br><br>I set up <a href="https://twitter.com/OpenFaaSCloud?ref_src=twsrc%5Etfw">@openfaascloud</a> on my laptop at home, when I got to a coffee shop it reconnected with the same public IP from <a href="https://twitter.com/digitalocean?ref_src=twsrc%5Etfw">@digitalocean</a>😱<a href="https://t.co/PanfWfMRlT">https://t.co/PanfWfMRlT</a> <a href="https://t.co/hHCeMRW7z2">pic.twitter.com/hHCeMRW7z2</a></p>&mdash; Alex Ellis (@alexellisuk) <a href="https://twitter.com/alexellisuk/status/1185179594040717312?ref_src=twsrc%5Etfw">October 18, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

## Is inlets right for you as a developer or advocate?

With the popularity of free SaaS solutions like Ngrok and modern VPNs like Tailscale, you've got to ask yourself. Should you pay for an inlets subscription?

If you want to access your mom's printer whilst on the road. Use Tailscale.

You're super cost sensitive and don't want to pay anything to self-host a low-traffic HTTP endpoint, think about port-forwarding on your router, along with a machine to run a cron-job to update a dynamic DNS record. It's a bunch of work, but it's "free". And of course, [you give out the location of your home to any users](https://inlets.dev/blog/2021/04/13/your-isp-wont-give-you-a-static-ip.html).

If you are cost sensitive and occasionally need to debug webhooks, Ngrok will probably be fine, just don't go beyond the rate limits. (This is easy to do - ask me how I know)

If you're a commercial business looking at Ngrok or Inlets, inlets works out significantly cheaper and you can use it for much more than just webhooks.

If you're a service provider and want to connect to customer devices and services, Tailscale may work out expensive (there is no public pricing available), and is really better for connecting entire hosts or subnets, than individual services. Check out what we're doing with [inlets uplink](https://docs.inlets.dev/uplink/become-a-provider/).

Want to make your Kubernetes home-lab accessible from anywhere like a managed Kubernetes service? [Check out this tutorial for inlets](https://inlets.dev/blog/2022/07/07/access-kubernetes-api-server.html)

Want to go deeper on technical differences? [Check out the inlets FAQ](https://docs.inlets.dev/reference/faq/)

So where does inlets excel?

* Customer demos that require a public IP address.
* When your ISP won't give you a public IP, or you can't take it with you. Yes. With inlets your IP will move with you. You can even use it on a train, plane [or a solar-powered boat](https://inlets.dev/blog/2021/07/13/inlets-narrowboat.html)
* You're a developer advocate like Kat, Ellen, the cert-manager team, or Marino team - and you want to integrate with Istio, Kubernetes Ingress Controllers or need Load Balancers that have real IPs
* You're a vendor or part of the DevRel team and run a booth or talk at conferences - people in the audience and on the show floor will be able to access any demos you deploy to make them more interactive and memorable.
* You've been burned by VPNs or SaaS tunnels and want something that just works in dev and production.

So why do developers advocates pay for inlets? They can run 2-5 tunnels at very low cost, it improves their effectiveness with demos, workshops and builds more customer engagement.

You can [try inlets for free](https://inlets.dev/pricing/).

## Want to talk?

Feel free to [reach out for a call to talk more](/contact/), or check out the links I've included above to see how other customers are using inlets today.
