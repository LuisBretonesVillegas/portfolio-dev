---
title: Enterprise Network
date: 2026-06-29
description: Designing and building a segmented, self-hosted network to centralize services and storage for real client data, with security and GDPR compliance baked in from the start.
tags: [networking, homelab, opnsense, proxmox, self-hosting, security]
---

An ongoing project to design and build a proper enterprise-style network from scratch: segmented VLANs, a real firewall at the edge, a hypervisor running self-hosted services, and private cloud storage for files and photos. The detail that raises the bar is that it holds real client data, so security, encryption, and GDPR compliance drive every decision rather than being an afterthought.

The project did not stay on the v1 plan. When I put the original design (OPNsense, VLANs, new hardware) against the real budget and the client's actual needs, the scope was trimmed: the ISP router stayed, the network stayed flat, and an existing PC became the hypervisor. The "Homelab ED50" series below documents the implementation that actually went into production, from the final hardware to the offsite backup.

This is a living project. I'm documenting each phase as a blog entry, from the initial architecture and budget through to the actual build and everything that breaks along the way.

## Write-ups

The detailed posts live in the blog, grouped under this project:

- [Infrastructure: choosing and justifying the hardware](/blog/infrastructure-hardware/)
- [Planning a self-hosted service centralization (v1 architecture)](/blog/service-centralization-architecture/)
- [Homelab ED50 (1/4): final hardware, Immich, and a verified 3-2-1 backup strategy](/blog/homelab-ed50-hardware-immich-backup/)
- [Homelab ED50 (2/4): domains and TLS with Caddy, invoice management with Paperless-ngx](/blog/homelab-ed50-caddy-paperless/)
- [Homelab ED50 (3/4): TicketBot, receipt digitization via Telegram](/blog/homelab-ed50-ticketbot/)
- [Homelab ED50 (4/4): self-hosted invoicing and offsite backup on Hetzner](/blog/homelab-ed50-invoicing-offsite-backup/)

More entries will land as the project keeps evolving.
