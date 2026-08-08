---
title: Vigía
date: 2026-08-08
description: A Java service that watches every service in the homelab with HTTP and ping checks and sends Telegram alerts only on state changes, running as a systemd unit in an unprivileged LXC.
tags: [java, spring-boot, homelab, telegram, monitoring, systemd]
---

> _Project · Java 21 + Spring Boot 4 · August 2026 · [Vigía on GitHub](https://github.com/LuisBretonesVillegas/VIGIA)_ · IP addresses, hostnames, and paths are examples; this page contains no credentials or identifiers in use.

After a few weeks of building services in the homelab (photos, invoices, documents, DNS), one problem remained out of sight: nobody was watching whether it all stayed alive. I found out a service was down when I went to use it. That is where the idea for Vigía came from. A Java service that runs HTTP and ping checks against the services in production and sends a Telegram message only when something changes state: one when a service goes down, another when it recovers, and silence in between.

## What it does

- HTTP checks: a service is alive if it answers 2xx or 3xx within 10 seconds. Redirects are not followed, because a login screen already proves there is someone on the other side.
- Ping checks for what does not speak HTTP: the Proxmox host and the reverse proxy itself.
- A state machine per service (UP, PENDING_DOWN, DOWN) with a consecutive-failure counter. An isolated failure wakes nobody up.
- Alerts only on transitions. A sustained outage produces exactly one alert, and recovery is announced on the first good check.
- Watched services live in an external YAML file validated at startup. There is not a single URL in the code.
- The bot token only exists in environment variables that systemd injects from a root-owned file with mode 600. It is not in the repo, not in the YAML, not in the logs, and it is redacted from any error message.

## How it is deployed

It runs as a systemd service inside an unprivileged Debian LXC on Proxmox, under a no-shell service user. The jar is built on the PC and copied to the container, which only needs a JRE. It survives container reboots (verified with `pct reboot`) and the LXC is part of the nightly vzdump backup. All traffic is outbound: an external port scan sees the same before and after the project, that is, nothing.

## Numbers

- 11 services watched in production
- 44 tests, written before or alongside each class, with an adversarial pass: timeouts against a deliberately slow local server, 5xx responses, broken YAML, ping targets disguised as flags, a notifier that blows up mid-alert
- 172 MB of RAM and 0.8 seconds of startup, measured in production
- One alert per outage. Zero duplicates.

## Isn't Spring Boot too much for this?

Yes. The fair question is whether a cron job and four curls would not solve this, and the short answer is that they would. The long answer, with the reasoning behind the decision and the first real incident of the deployment included, is in [the blog entry](/blog/vigia-homelab-monitoring/).
