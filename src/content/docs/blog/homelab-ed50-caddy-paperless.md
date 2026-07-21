---
title: "Homelab ED50 (2/4): domains and TLS with Caddy, invoice management with Paperless-ngx"
date: 2026-07-18
description: Caddy as a reverse proxy with a wildcard Let's Encrypt certificate and zero open ports, plus Paperless-ngx as the invoice document manager with automatic intake over IMAP.
tags: [homelab, caddy, tls, paperless-ngx, reverse-proxy, self-hosting]
project: Enterprise Network
---

> _Homelab ED50 · Entry 2 of 4 · 18 July 2026_ · IP addresses, hostnames, users, and paths are examples; this post contains no credentials, API keys, or identifiers in use.

> With the base services running, it was time to solve two real annoyances. Stop memorizing IPs and ports, and stop piling up invoices on paper and in mail folders. The answer was Caddy as a reverse proxy with a wildcard certificate, without opening a single port, and Paperless-ngx as a document manager with automatic intake over IMAP. Here is the full deployment and the incidents that came up along the way.

## Domains, certificates, and redirection with Caddy

### Goal

To avoid having to memorize the IPs and ports of each service, and to stop the browser from flagging access to the page as insecure. The proposed solution is to use Caddy.

Caddy acts like an office receptionist. You, as the user, arrive at the front desk and tell Caddy (which has an IP we'll call 192.168.1.20), "look, I want to talk to synology.ed50.es"; you are talking to Caddy's IP, and it is this service that says "of course, come with me" and redirects you to 192.168.1.X:xxxx. This is configured for every included service.

The goal is to have access to every service through its own subdomain (`servicio.ed50.es`) with valid Let's Encrypt TLS certificates, achieving zero ports open to the outside and remote access exclusively over Tailscale.

This was prioritized over other items out of convenience when configuring things; I don't like having many tabs open, nor having to type out the IPs and ports.

Of course, every service that gets added has to be added manually:

```caddyfile
@servicio host servicio.ed50.es
handle @servicio {
    reverse_proxy 192.168.1.X:xxxx
}
```

### Solution architecture

Wildcard certificate `*.ed50.es` from Let's Encrypt, obtained through the ACME DNS-01 challenge. Validation is performed by publishing a temporary TXT record via the registrar's DNS API (IONOS), with no need for the server to be reachable from the Internet.

Caddy as a reverse proxy in a dedicated LXC container (Debian 13, 1 vCPU, 512 MB RAM), built with the `caddy-dns/ionos` module through caddyserver.com's build service. It manages automatic certificate issuance and renewal and routes by hostname to each backend.

Name resolution through public "A" records in the registrar's DNS pointing to the proxy's private IP. From the Internet the names lead to no service; from the LAN or the VPN they resolve correctly.

Heterogeneous backends: plain HTTP services (Immich) and services with their own self-signed HTTPS (Proxmox :8006, DSM :5001), the latter proxied with internal TLS verification disabled only on the proxy-to-backend leg.

**Remote access**: Proxmox node as a Tailscale subnet router (`--advertise-routes` for the LAN subnet, with IP forwarding enabled via a persistent sysctl), so the same domains work identically inside and outside the network.

### Incidents diagnosed and resolved

1. Broken DNS resolution in the freshly created container: the LXC inherited the host's Tailscale MagicDNS configuration (resolver 100.100.100.100), unreachable from a container without Tailscale. Diagnosed by elimination with staged pings (gateway → public IP → name) and inspection of `/etc/resolv.conf`. Resolved by setting an explicit DNS in the CT configuration. Documented as behavior to keep in mind for every future container.
2. Google Safe Browsing false positive on a freshly created subdomain with a login page (a common pattern for new self-hosted services). Identified as a reputation issue and not a technical one, with a resolution path through Search Console.
3. NAS mobile interface hung behind the proxy. Systematic diagnosis with DevTools in mobile emulation and Caddy's JSON access log, which revealed that the 404s came from DSM's own nginx over resources of a legacy framework (Sencha Touch) absent from the firmware, a vendor defect (probably intentional; they have a mobile app and are probably not allocating resources to this) that the proxy only made visible, not a proxy failure. Documented with its workaround (desktop UI from the phone or Synology's native apps).
4. Asymmetric routing detected in the logs (LAN clients entering via the subnet router instead of the direct route), identified through the `remote_ip` in the access log. Noted down to adjust the LAN access option on the VPN clients.

### Results

- Every service accessible by name with valid TLS, without browser warnings, with the same behavior on the LAN and remotely via VPN.
- The Internet exposure surface stays at zero open ports. The entire chain operates without any inbound traffic from the outside.
- Adding a new service is reduced to two steps taking minutes. An A record and a proxy block.
- Added cost of the solution: 0 €. Free software (Caddy, Let's Encrypt) and the registrar's API at no cost.

## Invoice document management with Paperless-ngx

### Goal

Deploy a document management system for a consultancy's invoices, integrated into the homelab, with two automated intake paths (email and a consume folder), OCR in Spanish, secure remote access with no open ports, and automatic classification by supplier, account, invoice type (simplified or received), and with or without proof of payment (for the simplified ones).

### Deployed architecture

```
(outside home: Tailscale → subnet router)
Client ─ https://facturas.ed50.es ──► Caddy (LXC, .20) ──► LXC Paperless (.21:8000)
                                                                  
                                              ┌─────────────────────┼──────────────────┐
|                                        │  Docker Compose     
|                                        │  paperless-ngx ─ PostgreSQL 17 ─ Redis 8
|                                        |      └─────────────────────┬──────────────────┘
                    Intake 1: IMAP (facturas@ mailbox) 
                    Intake 2: consume folder / web upload
                    Intake 3: Telegram bot (for receipts)
```

### Implementation

#### LXC container

Unprivileged Debian 13 LXC with `nesting=1` to run Docker, 2 vCPU, 2 GB RAM, 25 GB of disk, static IP.

Since the Proxmox host uses Tailscale with MagicDNS, new LXCs inherit its `resolv.conf` with the `100.100.100.100` nameserver, which does not work inside containers without Tailscale. Solution: set an explicit DNS (1.1.1.1) in the CT configuration before first boot, verified with `cat /etc/resolv.conf` and a real resolution before continuing.

#### Deployment with Docker Compose

Services with **pinned versions**:

- `paperlessngx/paperless-ngx:2.20.15`
- `postgres:17`
- `redis:8`

Relevant service configuration:

```yaml
environment:
  PAPERLESS_URL: https://facturas.ed50.es   # CSRF correcto tras el proxy
  PAPERLESS_TIME_ZONE: Europe/Madrid
  PAPERLESS_OCR_LANGUAGE: spa
```

PostgreSQL password and `PAPERLESS_SECRET_KEY` generated and kept safe in a password manager.

#### Email intake (IMAP)

Dedicated mailbox `facturas@ed50.es` at the domain provider, used exclusively as an intake queue for machines.

Mail rule in Paperless:

- Provider's IMAP server, port 993, SSL/TLS.
- Processes **attachments only**, with a `*.pdf` filter (avoids ingesting logos and signature images).
- **"Mark as read"** action instead of deleting. This is to preserve the mailbox with its full history as a safety net.
- **Automatic correspondent from the sender**: every supplier becomes a correspondent with no manual maintenance.
- The document title is the email subject.

The check cycle runs every 10 minutes (adjustable via `PAPERLESS_EMAIL_TASK_CRON`).

#### Manual intake

Upload from the web interface and a consume folder watched with inotify (`/opt/paperless/consume`), mounted as a bind mount. This second path is left ready as the integration point for automating the collection of receipts photographed from a phone.

#### Receipt bot

I will cover this section in the next entry of the series, since it is a part where I am going to go into quite some detail.

#### Publishing on the reverse proxy

With a prior backup of the Caddyfile, validation (`caddy validate`) before reloading, and a hot reload without cutting off the services already published. TLS terminated at Caddy; the backend serves plain HTTP reachable only on the LAN.

### Document organization

- **Creation date.** Extracted by OCR from the invoice content as the fiscal axis. It is the issue date, the one that determines the quarter for VAT purposes, regardless of when the email arrives.
- **Saved views per quarter.**
    Zero maintenance (Paperless has the creation-date filters), impossible to forget, and the quarterly export for the accountants comes down to opening the view and downloading the selection.
- Correspondents generated automatically from the email senders; it uses the name and, if not available (it doesn't exist), it uses the email address.

### Problems found

#### Email wasn't getting ingested

The first test emails did not show up in Paperless.

**Cause 1, operator interference:** opening the email in the webmail to verify its arrival marked it as read, and the "don't process read mails" rule silently discarded it on the automatic passes. No error in any log: correct behavior with an incorrect state.

**Cause 2, self-inflicted permissions:** when forcing the pass manually with `docker compose exec ... mail_fetcher`, the command ran as **root** (the default user for `exec`), creating the temporary download directories in `/tmp/paperless/paperless-mail-*` owned by root. The consumer, which runs as the `paperless` user, then failed with `[Errno 13] Permission denied`. Each failure, in addition, left the email marked as read, preventing the automatic retry.

Fixing both causes was simply cleaning up root's temporary files and always executing manually with the correct user:

```bash
docker compose exec -u paperless webserver python3 manage.py mail_fetcher
```

### Verifications

- Document uploaded via web: OCR correct, inner text findable from the search box.
- Document dropped into the consume folder (via `pct push`): consumed and indexed automatically.
- Email with a PDF attachment: detected by the IMAP rule, attachment consumed, correspondent created automatically from the sender, email preserved and marked as read.
- HTTPS access with a valid certificate via `facturas.ed50.es`, inside and outside the LAN (mobile app included, configured against the domain URL).
