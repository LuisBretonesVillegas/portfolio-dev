---
title: "Homelab ED50 (4/4): self-hosted invoicing and offsite backup on Hetzner"
date: 2026-07-20
description: Invoice issuing with FacturaScripts, prepared for Facturae and Verifactu, and the client-side encrypted offsite copy on a Hetzner Storage Box that closes the 3-2-1, uncovering years of silently failing NAS backups along the way.
tags: [homelab, facturascripts, hetzner, backup, self-hosting, invoicing]
project: Enterprise Network
---

> _Homelab ED50 · Entry 4 of 4 · 20 July 2026_ · IP addresses, hostnames, users, and paths are examples; this post contains no credentials, API keys, or identifiers in use.

> Last entry of the series, with the two pieces that close the circle. On one side, invoice issuing with FacturaScripts, prepared for the Spanish regulatory calendar (Facturae, Verifactu) without issuing anything real until it is validated with the advisor. On the other, the offsite copy on Hetzner that completes the 3-2-1, and which along the way uncovered that the NAS had spent years not running its nightly backups without anyone knowing.

## Self-hosted invoicing

### Goal

The company is already operating on a self-hosted infrastructure over Proxmox VE with the Paperless manager, and a Telegram bot that digitizes expense receipts and archives them automatically.

The issuing piece was missing. Invoicing clients, public administrations included, with payment tracking, complying with the RGPD and the Spanish regulatory calendar.

### Requirements

1. Invoice issuing compliant with Spanish regulations, with a path prepared for FACe (signed Facturae 3.2) and Verifactu.
2. Simple payment tracking. Receipts with due dates, list of outstanding ones, monthly manual reconciliation.
3. Self-hosted, with no dependency on third-party SaaS.
4. Minimal cost: free software with one-off paid plugins only where they add value (Facturae ≈ 20 €).

#### Solution

To meet these requirements I have decided to use the software "FacturaScripts", a Spanish invoicing ERP with a free license, deployed with Docker Compose in a dedicated Proxmox LXC covered by the Caddy proxy.

### Architecture

```
Internet ─ (no open ports; remote access over Tailscale)
   │
Caddy (LXC, reverse proxy, TLS wildcard DNS-01)
   ├── paperless.domain   → Paperless-ngx (LXC)
   ├── n8n.domain         → n8n (LXC)
   └── facturas.domain    → FacturaScripts (new LXC)
                              ├── app container (official image)
                              └── MariaDB 11.8 LTS container (pinned)
```

- Unprivileged Debian LXC with nesting (2 vCPU, 2 GB RAM).
- Stack in a single directory (`/opt/facturascripts`). Compose, application and database bind mounts.
- One directory + one dump = a full backup of the service.
- Published on its own subdomain.

### Relevant technical decisions

|Decision|Reason|
|---|---|
|FacturaScripts over Odoo|For a single user, the native invoicing + receipts module covers 100% of the use case with a fraction of the complexity.|
|Verifying the PHP soap extension in the image before continuing|It is a requirement of the Verifactu plugin. Detecting it on day 1 avoids a surprise during the plugin session.|
|Separate test invoicing series (T)|The sequential numbering of the real series must be born clean. Every test of the circuit (issue → receipt → payment → PDF) is done in a disposable series.|
|No real invoice until Verifactu is validated with the tax advisor|The company is an SL. The cost of waiting is zero; the cost of issuing wrong is not.|
|Payment status only in FacturaScripts|Paperless archives the document. A single source of truth avoids state desynchronization between systems|
|MariaDB pinned by tag. The application updated from its own updater|The FacturaScripts image is runtime only. The app version lives in the volume. The difference is documented so that updates are always deliberate|

### Incidents resolved during deployment

|Incident|Diagnosis|Resolution|
|---|---|---|
|`pct create` rejects the template|Template name out of date with respect to the local store|List the available templates and use the exact name|
|The new subdomain returns the proxy's fallback page|The matcher did not exist yet in the Caddyfile. The request was correctly falling into the final `handle`|Add the matcher before the fallback, validate the configuration, and reload|
|`caddy: command not found` when validating|Custom-built binary installed outside the session's PATH|Invocation by absolute path. The systemd service is unaffected as it references the binary by full path|

### Result

- Invoicing system operational over HTTPS under the corporate domain, integrated into the existing infrastructure without modifying any service in production.
- Full circuit verified in the test series: issuing with correct VAT calculation, automatic receipt generation with a due date, payment marking, and a PDF with fiscal data and IBAN.
- Requirements of the regulatory plugins verified in advance.
- Roadmap defined: representative's digital certificate → Facturae plugin (signing and submission to face.gob.es, DIR3 codes per client) → Verifactu plugin in test mode → integration of the issued-invoices archive into Paperless-ngx.

## Cloud backup

### Goal

Close the 3-2-1 strategy with the offsite copy. Production (hypervisor SSD / working disks) → local copy (NAS) → copy in the cloud. The requirements:

1. Automatic nightly backup of the selected NAS folders (~1.5 TB of client data, documentation, and photo archive), **client-side encrypted** before leaving the house. So that the provider never sees data in the clear, thereby complying with GDPR.
2. A second zone of the same box mounted as a network drive in the file explorer. This is for on-demand access, with no synchronization and no local replica.
3. Protection against the scenario "the attacker compromises the NAS and destroys the remote copy too", since a backup that depends on the NAS makes no sense.

### Provider choice and sizing

Hetzner Storage Box BX21 has 5 TB, hourly billing with a monthly cap, no commitment, unlimited traffic, expandable without migration. I chose this service for its price per TB (ridiculous compared with other companies), EU jurisdiction, managed snapshots out of the client's reach, and simultaneous support for rsync/SSH, WebDAV, and SMB. The offsite volume was limited to the irreplaceable. The weekly vzdumps were left out because they are rebuildable.

### Architecture

We saw this one in the first entry of the series without going into depth on it.

```
                       Storage Box BX21 (5 TB, EU)
                       ├── /sub1/  ← Hyper Backup (.hbk client-side encrypted)
                       │            not browsable, restore only
                       ├── /sub2/  ← WebDAV drive in the explorer
                       │            browsable, on-demand access
                       └── automatic weekly snapshots
                            (immutable from outside the panel)
                                  ▲
                 HTTPS/WebDAV     │
        ┌─────────────────────────┴──────────────┐
        │                                        │
  NAS Synology DS718+                      work PC
  Hyper Backup, daily 03:30                Z: drive mounted
  client encryption + compression          (Windows WebClient)
  Smart Recycle
```

**Least privilege per sub-account.** Each sub-account is jailed inside its base directory and with only the protocol it needs (sub1: backup; sub2: WebDAV). The backup and the cloud are watertight. This prevents a leak of the cloud credential from exposing the backup, and vice versa. The box's main user is reserved for administration.

The anti-ransomware defense rests on the snapshots on Hetzner's side. They are managed only from the provider's panel, so neither the NAS nor any sub-account can alter them. If an attacker with the NAS credentials encrypted or deleted the remote copy, the box is restored to the previous snapshot. Scheduled weekly at a time after the backup window, to always photograph the repository at rest and never a half-finished write.

### Implementation

1. **Storage Box** created from the Hetzner Console, with a generated password kept in the manager.
2. **Sub-accounts**: sub1 (backup) and sub2 (cloud), external reachability enabled and protocols kept to the minimum per account. The credentials are shown a single time upon creation → straight into the manager.
3. **Hyper Backup task** against sub1 over WebDAV (HTTPS). Selected folders, compression, client-side encryption (preventing possible Hetzner leaks), daily schedule at 03:30 (chained after the 01:30 rsync and the 02:00 PostgreSQL dump), weekly integrity check in the early hours, and Smart Recycle rotation.
4. **Network drive** in the explorer against sub2 (Windows native WebDAV), with on-demand access and zero local cache. Its limitations documented. The native client's 4 GB per-file cap (as an alternative I will use rclone mount), no recycle bin, and no offline access.
5. **Verification**: First full copy + integrity check passed, test restore to an alternative location, and a real drill recovering a file from a snapshot. A copy that has not been restored is not considered operational.

### Incidents diagnosed and resolved

**The NAS had spent years not running its nightly backups and nobody knew.** While planning the nightly window, an old power schedule surfaced. The NAS shut down at 21:00 and started up at 08:00, so the 01:30 rsync and the 02:00 dump were running against a machine that was off. No NAS log gave it away; the failure was silent by design.

The source was failing against a nonexistent destination. The rule was removed and the NAS moved to 24/7. The belief that motivated the shutdown ("resting extends the life of the disks") turned out to be the other way around. On an HDD the dominant wear is the start/stop cycles, not the hours of steady spinning. A NAS-grade disk is specified for continuous operation.

From now on, every scheduled task is verified against the availability calendar of its destination, not just against its own log.

**rsync discarded due to an interface limitation, not a protocol one.** Plan A was rsync over SSH (Hetzner's port 23), which requires indicating `/home/` as the backup module by typing it in manually. The installed version of Hyper Backup did not allow editing that field (dropdown only, which fails against Hetzner when listing modules). Instead of forcing the tool, I pivoted to WebDAV, supported by both ends and with an identical functional result (versioning, client-side encryption, rotation).

**"Forbidden" diagnosed layer by layer.** The first WebDAV connection attempt failed with a generic DSM error. The problem was isolated by testing the URL from an external browser. The server responded with correct TLS but returned 403 without requesting credentials, the signature of a service not enabled, not of invalid credentials. The sub-accounts table confirmed the cause. "External reachability" disabled on sub1, a very easy error to fix. The method (separating the network layer, TLS layer, authentication layer, and application layer before touching configuration) avoided redoing anything blindly.

### Results

1. The 3-2-1 is closed. Three copies, two media, one off-site and in EU jurisdiction, with end-to-end encryption under my own key. The data is protected against disk failure, accidental deletion, ransomware, and physical disaster on the premises.

2. A cloud browsable from the file explorer without a local replica, watertight with respect to the backup.

## Tech stack used so far

- **Virtualization**: Proxmox VE 9 (QEMU/KVM, unprivileged LXC with nesting, vzdump, LVM-Thin)
- **Guest operating system**: Debian 13
- **Containers**: Docker Engine + Docker Compose (pinned versions)
- **Photo management**: Immich (server + machine learning) · PostgreSQL · Redis · immich-go (migration)
- **Document management**: Paperless-ngx 2.20.15 · PostgreSQL 17 · Redis 8 · OCR in Spanish
- **Invoicing**: FacturaScripts (Docker Compose) · MariaDB 11.8 LTS · Facturae and Verifactu plugins on the roadmap
- **Automation**: n8n (TicketBot, dual poller/archiver workflow) · Telegram Bot API (polling) · Gemini API (extraction with `response_schema`)
- **Reverse proxy and TLS**: Caddy (built with `caddy-dns/ionos`) · Let's Encrypt (wildcard `*.ed50.es` via ACME DNS-01) · `ed50.es` domain (IONOS)
- **Remote access**: Tailscale (WireGuard mesh, MagicDNS, subnet router)
- **DNS/adblock**: AdGuard + Unbound
- **Storage**: Synology DS718+ NAS (DSM, RAID1 2×10 TB) · Synology Drive · NFS · 1 TB SSD in the hypervisor
- **Local backup**: rsync over SSH (ed25519 keys) · cron · `pg_dumpall` · vzdump · NAS snapshots
- **Offsite backup**: Hyper Backup → Hetzner Storage Box BX21 (5 TB, WebDAV, client-side encryption, Smart Recycle) · least-privilege sub-accounts · weekly provider snapshots
- **On-demand cloud**: WebDAV as a network drive (Windows WebClient; rclone mount as the alternative)
- **Power and network**: APC Back-UPS 950 UPS · TP-Link Archer BE550 (WiFi 7)
