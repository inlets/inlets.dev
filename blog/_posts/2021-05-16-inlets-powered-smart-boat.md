---
layout: post
title: Inlets on the water... making a smart boat talkative
description: Using inlets-pro to connect a boat to my home lab
author: Mark Sharpley
tags: inlets-pro homelab boat iot
author_img: mark
image: /images/2021-05-16-boat/background.jpg
date: 2021-05-16
---

A real world use case for Inlets tunnels with IOT edge computing on the water.

## Introduction

Before we dive into the technical aspect of this blog post there should probably be some explanation for how we got here.

Like many of us, I've at times struggled with the balance of remote work, lockdown and my personal life. I've done all the usual stuff - bread baking, home IOT setup, and a lot of cycling but there was another itch which required scratching.

![ionic](/images/2021-05-16-boat/boat.jpg)

Meet Ionic. She's a 17 metre narrow boat, laid down in 1986. I purchased her last Christmas and have been slowly renovating her and sailing up the Grand Union Canal in my spare time. It's a complete detachment from my digital existence, with lots of manual and dirty jobs. You quickly end up doing things you'd never contemplated before. I've learned a lot which


# Okay, so you have a boat

>  No DevOps engineer worth their salt could own a boat and not try to connect it to the internet.
>  - Me, probably

This boat is pretty basic. The fuel level is measured with a stick. The water tank level is measured with a stick. Want to know where the boat is? Look at a map. While there is joy in this, we can do better - all we need is a stable Internet connection, a few Raspberry Pis and some enthusiasm.

## Hooking up to the Internet

To access the Internet there is a sim card with a data only contract, plugged into [one of these](https://consumer.huawei.com/en/routers/5g-cpe-pro/specs/) This lives on the boat and is plugged into the 12 volt power system which itself is fed from two 120 amp hour "leisure" batteries:

![leisure batteries](/images/2021-05-16-boat/battery.jpg)

The batteries are trickle charged using solar panels:

![solar panels](/images/2021-05-16-boat/solar.jpg)


The Huawei Router provides DHCP and WiFi for the boat and is powered from this circuit.
The same system also power the Raspberry Pi.

## Starting Simple

I decided to track *Ionic's* location using a Pi 4, a USB GPS dongle and a prometheus exporter to provide metrics for GPSD.

A [GPSD](https://gpsd.gitlab.io/gpsd/) exporter for prometheus did not exist so I [wrote one](https://github.com/markopolo123/gpsd_prometheus_exporter).

Systemd is used to manage GPSD and the prometheus exporter. This is all installed and configured on the Pi 4 using an Ansible playbook.

Here's a sample of the prometheus metrics presented from the boat:

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

I use [Prometheus](https://prometheus.io) to monitor these metrics and [Grafana](https://grafana.com) to visualise them.

# How Inlets helps

Now we have a way to track *ionic's* location, speed and altitude. I started off running the whole stack locally, with both prometheus and grafana running on the boat's Pi 4. This isn't particularly useful if I'm not on the boatand it seems a bit wasteful. I have a prometheus and Grafana stack elsewhere, so let's use that.

So, we need a tunnel from the boat to my other network - the Pi 4 should automatically use this to present metrics. Inlets is a great choice for creating this tunnel. I've used it a lot in other projects and like the simplicitiy of it. Other ways to do this include a VPN like wireguard or SSH Tunneling.

![visual explanation](/images/2021-05-16-boat/boat-inlets.jpg)

# Next Steps

We've seen how inlets tunnels can be used to easily give access to metrics from a boat. It's a bit of an *edge* case but, hey, if the tool fits ;)

There's a bunch more things we could do here, but take into account that the boat still requires a lot of actual physical work...

More things to do:

## Adding more metrics.

The sky's the limit here:
* Solar power and battery statistics
* Fuel and water level gauges
* Air quality and temperature
* engine status - rpm, temp etc
* sinking alert

## A Flask website to display the boat's location:
![boat](/images/2021-05-16-boat/flask-app.jpg)

## Using push instead of pull
It's not super important to me at the moment, but it would be nice for the boat to aggregate metrics and push them when it has a connection. Under the current model, any connection outage would result in lost data. This could also be useful if low power/burst modes are required. This could be done with tweaks to the current stack or shipping metrics to a time series database using other tooling.

## Sending text messages
This could be done via the [Huawei API](https://github.com/Salamek/huawei-lte-api/tree/master/huawei_lte_api). I'd like to invoke this using [faasd](https://github.com/openfaas/faasd) running on the boat's Pi.


