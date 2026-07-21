---
title: "Homelab ED50 (1/4): final hardware, Immich, and a verified 3-2-1 backup strategy"
date: 2026-07-17
description: How the v1 plan got trimmed against the real budget, the final hardware, self-hosted photo management with Immich, and a 3-2-1 backup strategy verified end to end, including the migration of ~145 GB of family photos.
tags: [homelab, proxmox, immich, backup, tailscale, synology]
project: Enterprise Network
---

> _Homelab ED50 · Entry 1 of 4 · 17 July 2026_ · IP addresses, hostnames, users, and paths are examples; this post contains no credentials, API keys, or identifiers in use.

> The original plan called for OPNsense, VLANs, and new hardware. As soon as I put it on the table next to the real budget and the company's real needs, the scope changed. Less iron, more service. This entry covers that trim and the final hardware, and then the first block in production: family photo management with Immich and a 3-2-1 backup strategy verified end to end, including the migration of ~145 GB of family archive.

## Final software and hardware

After handing the proposal to my father, the server hardware turned out to be over budget. We also realized that in August we would be installing solar panels at home, so we didn't need to worry much about energy consumption. At that point I proposed another option: dropping the mini PC that runs OPNsense. I asked him to tell me which services he needed for his company, and the table ended up like this:

| Area                 | Decision                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| Firewall             | Drop OPNsense, keep the ISP's                                                |
| Hypervisor           | Old PC (high energy consumption, but it doesn't matter)                      |
| File cloud           | Synology Drive                                                               |
| Photo cloud          | Immich                                                                       |
| ERP                  | Dropped (too much for the service we wanted to implement)                    |
| ERP replacement      | Paperless + FacturaScripts                                                   |
| Receipt automation   | n8n                                                                          |
| Storage              | Synology DS718+ NAS, RAID1, 2x10 TB (9.1 TB usable) and 1 TB SSD (hypervisor) |
| DNS/adblock          | AdGuard + Unbound                                                            |
| Remote access        | Tailscale                                                                    |
| Backup               | Hetzner cloud                                                                |
| Fault tolerance      | APC Back-UPS 950 UPS                                                         |
| WiFi AP              | TP-Link Archer BE550 (WiFi 7)                                                |
| Domain               | ed50.es                                                                      |

As you can see, there have been plenty of hardware cuts. The decision not to segment the network with VLANs comes from the business owner's request not to do so. This cuts costs considerably, since the PoE switch is no longer needed; the mini PC that carried OPNsense is also expendable, there are no rack expenses anymore, and the hypervisor is already bought. The total hardware cost of the project is 8 euros (the thermal paste for servicing the old PC).

### The hypervisor

The PC is an ASUS gaming machine; the specs are:

- i5-8400
- 32 GB DDR4
- 1 TB SSD
- NVIDIA GeForce GTX 1050 Ti

## Self-hosted photo management and 3-2-1 backup strategy

### Project summary

Complete design and implementation of a self-hosted home infrastructure on my own hardware, with three goals:

1. **Self-hosted family photo management** with Immich, including the verified migration of ~145 GB of family photo archive (2004 to present).
2. **Secure remote access** to every service without opening ports on the router, through a WireGuard mesh network (Tailscale).
3. **3-2-1 backup strategy**: production data (hypervisor SSD) → local copy (NAS) → copy on a Hetzner Storage Box.

### Architecture

```
                       ┌──────────────────────────────┐
                       │  CLOUD (offsite, encrypted)  │  
                       └──────────▲───────────────────┘
                                  │ Hyper Backup
                                  │
┌───────────────┐   NFS/rsync  ┌──┴────────────────────────┐
│ HYPERVISOR    │ ───────────► │  SYNOLOGY NAS             │
│ Proxmox VE 9  │              │  · Main storage           │
│ i5 / 32 GB /  │              │  · Backup hub             │
│ 1 TB SSD      │              └──────▲────────────────────┘
│               │                     │
│ └─ Debian VM  │◄─ manual upload     │
│    (Docker +  │   from phone/web    │
│    Immich)    │                     │
└───────▲───────┘                     │
        │            Tailscale (mesh WireGuard, MagicDNS)
        └────────────── phones · laptop · administration
```

Designing it brought up important decisions to keep in mind:

1. **One Tailscale per machine** (VM, host, NAS, clients) instead of a subnet router: direct P2P access, no single point of failure, per-node ACLs, and MagicDNS names.
2. **VM disks live on the local SSD** (LVM-Thin); the NAS NFS share is used exclusively as a backup target (it backs up the VM running Immich and the entire Proxmox into 2 separate folders).
3. **Manual, deliberate photo uploads.** Immich as a curated archive, not a dump; multi-user shared albums for family events.
4. **Read-only NFS mounts** during the migration: physical immunity of the originals against any error in the process. (Nothing gets deleted until the photos meet the 3-2-1 rule.)

### Implementation phases

#### Phase 1: hypervisor with Proxmox VE

- Proxmox VE 9 installed from ISO, management network configured with a static IP and FQDN.
- **Incident resolved, IP conflict**: the web interface would not respond even though the host answered pings. Diagnosed via TTL (replies with TTL=128 → a Windows machine answering instead of the hypervisor; TTL=64 expected on Linux): two devices shared the same static IP. Fixed by editing `/etc/network/interfaces` and `/etc/hosts` towards a free IP, followed by DHCP reservations by MAC on the router for the whole fleet.
- ISOs downloaded directly to the hypervisor (Debian 13 ISO).

#### Phase 2: services VM (Debian 13 + Docker)

- QEMU/KVM VM: 4 vCPU (_host_ type), 8 GB RAM, 300 GB on LVM-Thin with _discard_, VirtIO for network and disk, QEMU Guest Agent.
- Minimal Debian 13 install (SSH + standard utilities, no desktop environment).
- Docker Engine: Immich deployed with Docker Compose (server, machine learning, PostgreSQL, Redis), configuring `UPLOAD_LOCATION` and DB credentials via `.env`.
- Immich's storage template enabled: physical on-disk structure by `user/year/month` with original file names, so the library stays browsable and useful even without Immich (resilience over 15 years, proven).

#### Phase 3: remote access with Tailscale

- Tailscale deployed on the VM, the Proxmox host, and the mobile clients, authenticated against the same tailnet; MagicDNS for access by name; key expiry disabled on the infrastructure nodes.
- The management interface (8006) and the photo service (2283) are only reachable from the LAN or the tailnet.
- Immich mobile app connected through the server's MagicDNS name.

#### Phase 4: backup strategy

|Schedule|Task|Mechanism|Destination|Retention|
|---|---|---|---|---|
|Daily 01:30|Photo library mirror|`rsync -a --delete` over SSH with key authentication|Dedicated NAS folder|Mirror + NAS snapshots|
|Daily 02:00|PostgreSQL dump (Immich)|`pg_dumpall` in the container + gzip, via cron|VM disk (included in vzdump)|14 days (rotation with `find -mtime`)|
|Weekly Sun 03:00|Full image of all VMs|vzdump in _snapshot_ mode, ZSTD compression|NAS NFS storage|Last 4|

- NAS NFS export restricted by source IP and with the minimum capability needed (the backup share only accepts the hypervisor; the historical photo shares are read-only for the VM).
- rsync authentication with a passphrase-less key pair for automation; hardening of the remote home directory's permissions (an sshd requirement) documented as a typical DSM incident.
- **Every backup was tested with a real, verified run** before being considered operational.
- The offsite copy, client-side encrypted with Hyper Backup → Hetzner Storage Box.

#### Phase 5: migrating the photo archive (~145 GB, 2004-2026)

**Tool**: `immich-go` against the Immich API.

**Methodology**:

1. **Read-only NFS mounts** of the NAS source folders on the VM, persisted in `/etc/fstab` (`ro,nofail`) after detecting the loss of manual mounts on a reboot.
2. **Pilot run** with a small folder before the full volume: validation of album creation, EXIF date reading, and counts.
3. **Batch migration** with shell loops (one album per source folder, `--no-ui` for unattended execution, `tee` to per-batch logs).
4. **Layered verification protocol**:
    - _Layer 1, logs_: `grep` sweep for errors across all migration logs.
    - _Layer 2, convergence_: re-running each batch until a full pass reports 0 uploads and 0 errors.
    - _Layer 3, independent count_: comparing the actual unique contents at the source (MD5 hashing, excluding Synology's `@eaDir` metadata) against each album's item count, with tolerance only for non-media files.

##### Findings and resolution during verification

- First passes systematically incomplete (e.g. 98/149 in the pilot; 162 files rescued in a second pass of another batch); multi-pass convergence proved essential.
- Count discrepancies explained by hidden NAS metadata (`@eaDir`) inflating the source totals, exact intra-folder duplicates deduplicated by hash on the server, and non-media files correctly discarded. The final arithmetic matched the archive.
- 6 transient server errors (under thumbnail-generation load) resolved on re-run.
- Immich job queue management during the mass ingest. Thumbnails/metadata were prioritized and facial recognition and smart search were temporarily paused to avoid saturating the CPU.

**Result**: full archive (17 historical folders + camera + recent events) migrated to Immich with one album per source folder, correct EXIF dates on the timeline, verified deduplication, and full traceability through logs. Originals intact on the NAS (read-only during the entire process).

### Security applied

No services are exposed to the Internet; remote access is exclusively over WireGuard/Tailscale.

Least privilege on NFS: exports by IP, read-only where it sufficed, and temporary exports removed once their job was done.

Key-based authentication (ed25519) for automation, no passwords in scripts or crontabs.

API keys with a temporary scope, revoked after use (this was used with Immich).

Backups with retention and automatic rotation. With real verification of restorability.

---

**Homelab ED50 series** · Part 1 of 4 · Next: [Domains and TLS with Caddy, invoice management with Paperless-ngx](/blog/homelab-ed50-caddy-paperless/) · Project: [Enterprise Network](/projects/enterprise-network/)

_Written by **Luis Bretones Villegas** · © 2026 · All rights reserved._
