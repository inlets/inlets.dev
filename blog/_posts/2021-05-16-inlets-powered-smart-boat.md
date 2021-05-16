---
layout: post
title: Connecting my boat to the Internet with inlets
description: A guest post from Mark, who used inlets to bring edge computing to his narrow boat during lockdown.
author: Mark Sharpley
tags: inlets-pro homelab boat iot
author_img: mark
image: /images/2021-05-16-boat/background.jpg
date: 2021-05-16
---

A guest post from Mark, who used inlets to bring edge computing to his narrow boat during lockdown.

# Introduction

Like many of us, I've at times struggled with the work/life balance and lockdown has only made that more challenging. I noticed that the balance wasn't quite right, and tried a few of the usual hobbies like baking soughdough bread, exercise in the form of cycling and building a Raspberry Pi cluster.

There was just an itch that I couldn't quite scratch, until I found Ionic.

![My narrowboat, Ionic](/images/2021-05-16-boat/boat.jpg)

Meet Ionic. She's a 17 metre [narrow boat](https://en.wikipedia.org/wiki/Narrowboat) and she first floated in 1986.

> A narrowboat is a particular type of canal boat, built to fit the narrow locks of the United Kingdom. The UK's canal system provided a nationwide transport network during the Industrial Revolution - [Wikipedia](https://en.wikipedia.org/wiki/Narrowboat)

Since I bought her last Christmas, I've been slowly renovating her and sailing up the Grand Union Canal in my spare time. It's a welcome detachment from my digital existence and the manual jobs mean I can get my hands dirty, and enjoy a break from notifications.

## Boat, tick. What next?

I thought: "OK, so now I've renovated my boat, what next?" No DevOps engineer worth their salt could own a boat and not try to connect it to the Internet.

This boat is pretty basic. The fuel level is measured with a stick. The water tank level is measured in a similar way. And if I wanted to know where my boat was, I'd have to get out a compass and map.

While there is some joy in this we can do better - all we need is a stable Internet connection, a few Raspberry Pis and some creative thinking.

## Hooking Ionic up to the Internet

To access the Internet I use a SIM card with a data-only contract, plugged into a [5G router by Huawei](https://consumer.huawei.com/en/routers/5g-cpe-pro/specs/).

The boat runs on 12 volts, fed by two 120 aH batteries connected in parallel. I use solar panels and a charge controller to trickle charge back into them.

This system powers the Raspberry Pi, and then there's also an inverter on board for whenever I need 240V, it can draw the 12V input and produce power for a regular 3-pin plug. 

## Starting Simple

I decided to track *Ionic's* location using a Raspberry Pi 4, a USB GPS dongle. Then [Prometheus](https://prometheus.io/) stores the metrics in a time series and Grafana provides a visual dashboard.

For me, [GPSD](https://gpsd.gitlab.io/gpsd/) is the gold standard for GPS on Linux, however in order to connect it to Prometheus, I had to write an "exporter".

You can find [markopolo123/gpsd_Prometheus_exporter](https://github.com/markopolo123/gpsd_Prometheus_exporter) on GitHub, it's written in Python and there's a pip package for it too. The exporter presents metrics in a structured way for Prometheus to consume.

Here's a sample of the Prometheus metrics presented from the boat:

```bash
#
# HELP longitude longitude measured
# TYPE longitude gauge
longitude -1.327495167
# HELP latitude latitude measured
# TYPE latitude gauge
latitude 52.054281667
# HELP speed Current speed in knots
# TYPE speed gauge
speed 1.2926536000000002
# HELP altitude Current Altitude in metres
# TYPE altitude gauge
altitude 113.1
```

Then to keep GPSD and the exporter running at all times, I set up a systemd unit file for both of them. In my work I do a lot of DevOps automation, so naturally I created an Ansible playbook to configure everything.

# Where inlets comes in

Now we have a way to track *ionic's* location, speed and altitude. I started off running the whole stack locally, with both Prometheus and Grafana running on the boat's Pi 4. Given that the Raspberry Pi 4 has up to 8GB of RAM, it seemed like a good plan, but then I wondered what would happen if the boat's battery ran out? What if someone stole the Raspberry Pi? What if I ran out of disk space for metrics?

Quickly, I decided to offload Grafana and Prometheus to the cloud, and then have the Raspberry Pi only run its Prometheus exporter and the GPS daemon.

To utilise my other monitoring stack we needed a tunnel from the boat to my other network - the Pi 4 should automatically use this to present metrics.

> In my job I've used a lot of solutions for remote access from VPNs, to Ngrok and SSH. What I can say is that inlets PRO "just worked". I loved the simplicity of it and whenever I had a question, I got help directly from Alex.

![Conceptual diagram](/images/2021-05-16-boat/boat-inlets.jpg)

Once the tunnel exists we can simply point Prometheus at the local end point and start scraping metrics. It's just like the boat is directly on my network, and if it disconnects for any reason, the tunnel restarts without any extra configuration needed.

## Next Steps

We've seen how inlets tunnels can be used to easily give access to metrics from a boat. It's a bit of an *edge* case but, hey, if the tool fits ;)

There are plenty of other things I want to do (beyond the manual renovation work) to improve this setup, in no particular order we have:

**Expanding on metrics**

There are lots more metrics to gather...
* Solar power and battery statistics
* Fuel and water level gauges
* Air quality and temperature
* engine status - rpm, temp etc
* Sinking alert

**A Flask website to display the boat's location**

The prometheus instance allows us to easily extract stored metrics from it. I created a simple Python Flask web application which displays the boat's last known location from Prometheus.

![flask-application](/images/2021-05-16-boat/flask-app.png)

In the future, I may add historical data like routes and alerts for when the battery level gets too low.

**Pushing metrics or scraping metrics?**

One way that we could improve power usage is by having the boat turn the Raspberry Pi on and off to send periodic data throughout the day. Prometheus has support for a push model which could work well here.

**Sending text messages**

This easily be done via the [Huawei API](https://github.com/Salamek/huawei-lte-api/tree/master/huawei_lte_api) to trigger sending text messages from the the Huawei router, although I would need to update my contract to give me a text message allowance.

# Further resources:

* [Read tutorials and documentation for inlets](https://docs.inlets.dev/)
* [Get started with inlets today](https://inlets.dev)

