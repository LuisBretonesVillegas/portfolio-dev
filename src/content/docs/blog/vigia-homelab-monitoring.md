---
title: "Vigía: monitoring the homelab, and why I ended up using Spring Boot"
date: 2026-08-08
description: A Java service that watches the homelab with HTTP and ping checks and alerts on Telegram only on state changes. Why the FastAPI plan got binned, and what broke on deployment day.
tags: [homelab, java, spring-boot, telegram, monitoring, lxc]
project: Vigía
---

> _Homelab ED50 · Vigía · 8 August 2026_ · IP addresses, hostnames, users, and paths are examples; this post contains no credentials, API keys, or identifiers in use.

In the last entry of the series I told how the NAS had spent years not running its nightly backups without anyone knowing. That sentence stuck with me. Systems do not fail loudly. They fail in silence, and you find out the day you need exactly the thing that broke. The homelab already had invoicing, family photos, and document management in production, and not a single piece watching whether all of that stayed alive. Vigía exists for that. HTTP and ping checks against the 11 services, and an alert on my phone only when something changes state.

## Goal

- Find out about an outage before I go to use the service that is down.
- Exactly one message per outage and another per recovery. A monitor that sends twenty alerts for the same incident ends up muted, and a muted monitor is the same as having nothing.
- Zero new open ports. All traffic is outbound.

## The plan I threw away

In the portfolio I had the original plan written down: a FastAPI backend with SQLite, a React frontend as a PWA, Telegram notifications. Three pieces, two languages, and a web panel to look at charts.

I discarded it for two reasons. The first is that it was the comfortable stack. One more Python project, learning little. This summer I am dedicating to Java for real, and a real project I depend on daily teaches more than any tutorial. The second is that the web panel was a lie. I know myself: I was going to look at it twice during the first week and never again. What I need is my phone ringing when something goes down and staying quiet when it does not.

With that idea the scope trimmed itself. Out went the frontend; out went the database, because state lives in memory and if the process restarts, one minute of checks brings back the truth; out went the endpoints. What remains is a process that reads a YAML file, runs checks, and sends messages.

## Isn't Spring Boot for this like killing flies with cannon fire?

Using Spring Boot for a pinger is using a country's nuclear arsenal to take out one guy. I own that. I chose it anyway, for three reasons.

First: it is a learning project with production stakes. The Java job market runs on Maven, Spring, and JUnit, and I wanted to practice that stack on something whose failure hurts me, not on a book exercise. A service you depend on teaches you systemd, unprivileged containers, secrets handling, and what happens after a reboot.

Second: the framework footprint is minimal on purpose. Only the base starter, no web server, no actuator, no Spring Data. Spring provides the bootstrap, the clean shutdown, the external configuration, and the packaging into a single jar. The monitoring engine is pure JDK: `HttpClient` for the checks, `ScheduledExecutorService` for the scheduling, `ProcessBuilder` for the ping. The state machine has not a single framework import.

Third: measured in production, the cannon fire comes out cheap. 172 MB of RAM in a 1.5 GB container, a 0.8 second startup, a 9 MB jar. And v2, with system metrics and checks for the nightly jobs, grows into the framework instead of outgrowing a shell script.

## The state machine

Each service has its own state machine in memory: UP, PENDING_DOWN, and DOWN, with a consecutive-failure counter. An isolated failure does not alert. The service moves to PENDING_DOWN and gets some slack. On the third consecutive failure it moves to DOWN and the red alert goes out. From there it can fail a hundred more times and nothing else goes out. With the first good check after DOWN it returns to UP and the green recovery message goes out.

The whole project exists to guarantee that a sustained outage produces exactly one notification.

## Problems found

1. **ICMP in unprivileged containers.** The first real incident arrived on deployment day. Everything green locally; in the LXC, the ping check failed with exit code 2. It turns out Debian ships `ping_group_range` as `65534 65534` inside the container: only that group can open ICMP sockets without privileges, and the service user is left out. The fix is widening the range with a persisted sysctl, with the caveat that in an unprivileged container the upper bound cannot go past the mapped GIDs (65535), because the kernel rejects the usual full range.
2. **Spring Boot 4 no longer ships SnakeYAML.** The base starter dropped it as a dependency. To read the services YAML you have to declare it explicitly in the pom.
3. **`@SpringBootTest` executes `ApplicationRunner` beans.** My runner fails fast if you do not give it the YAML path, so the context test died with it. The fix was giving the test a minimal configuration in its resources.
4. **Formatters that touch javac internals do not work on JDK 25.** Neither Palantir's nor Google's even start: they use internal compiler APIs that no longer exist. The Eclipse formatter embeds its own compiler and works on any JDK.

## Verifications

- Round trip with a real service: I stopped Paperless by hand, waited out the three failures, and the red alert arrived. One minute down without a single repeated message. I started it again and the green one arrived with the first good check, with its measured latency.
- Container reboot with `pct reboot`: the service comes back on its own (`systemctl is-active` answers `active`).
- Test mutation: I broke the state machine threshold on purpose and 9 tests across two separate suites went red. A test that does not go red when you break the code is not testing anything.
- External port scan: it sees the same before and after the project, that is, nothing.

## What comes next

v2: checks for the nightly jobs (vzdump, rsync, Hyper Backup, and the PostgreSQL dumps), a weekly self-monitoring heartbeat to know Vigía itself stays alive, and disk, RAM, and load metrics.
