---
title: Planning a self-hosted service centralization (v1 architecture)
date: 2026-06-29
description: I'd been running my self-hosted stuff in a messy, ad-hoc way and finally sat down to plan it properly. VLANs, OPNsense, Proxmox, and the headache of doing it right when there's real client data on the network.
tags: [homelab, networking, opnsense, proxmox, self-hosting, security]
---

I've had a bunch of services running for a while now and honestly it's been a bit of a mess. A NAS over here, a couple of cloud accounts over there, smart home gadgets doing whatever they feel like on a flat network where everything can see everything. It works fine day to day, but "it works" and "it's actually designed" are two very different things. So before spending a single euro on new hardware I sat down and wrote a proper plan. This is a snapshot of where that plan is right now. Call it v1.

There's one detail that bumps this out of hobby territory. Some of the data on this network is real client data, the sensitive kind, and it lives right next to personal photos and documents I really can't afford to lose. The second that's true you're not playing with a homelab anymore, you're dealing with GDPR and everything that comes with it. Pretty much every decision below was shaped by that one fact.

The idea is simple. Take everything that's scattered around and pull it onto one network that's actually segmented and thought through. In practice that's a handful of things:

- A proper firewall at the edge instead of just trusting whatever box the ISP handed me.
- A hypervisor running all the self-hosted stuff as isolated VMs and containers.
- My own cloud for files (Nextcloud) and photos (Immich), only reachable through a VPN.
- DNS-level ad blocking, single sign-on, and real network segmentation.
- Keep the storage I already trust and wrap it in encryption and backups that actually exist.

Budget's tight and I'd rather do most of it in one go, so I had to be honest with myself about what matters first.

## Network design

The whole thing rests on one rule. Nothing shares a network unless there's a reason for it. OPNsense runs on a small fanless x86 box and handles the routing between VLANs, the IDS/IPS, and QoS. A managed switch carries the tagged traffic out to everything else.

| VLAN | Name      | What lives here                         | Internet         |
| ---- | --------- | --------------------------------------- | ---------------- |
| 10   | MGMT      | Firewall, switch, hypervisor management | Limited          |
| 20   | OFFICE    | Workstations, printers, test VMs        | Yes              |
| 30   | HOME      | Trusted personal devices                | Yes              |
| 40   | IoT       | Smart home, plugs, lights               | Restricted       |
| 50   | CAMERAS   | WiFi cameras                            | **None**         |
| 60   | GUEST     | Guest WiFi                              | Yes, isolated    |
| 70   | DATA/SECURE | NAS with client data, Nextcloud, Immich | **Minimal/none** |

The rule I keep coming back to is that VLAN 70 is the crown jewels. Everything's denied by default and I only open the exact ports I need, only from places I trust. The NAS has no business reaching out to the internet on its own. The only exceptions are its own updates and the encrypted backup. And a hacked smart plug sitting on the IoT VLAN should never, ever be able to see the data VLAN.

```
Internet (fiber, PPPoE/VLAN)
        │
   [ONT/router in bridge mode]
        │
   ┌──────────┐
   │ OPNsense │  ← x86, Suricata IDS/IPS, QoS, inter-VLAN, deny-all default
   └────┬─────┘
        │ 802.1Q trunk
   ┌────┴──────────┐
   │ Managed switch │
   └─┬───┬───┬──────┘
     │   │   └── AP (SSIDs → Home / IoT / Cameras / Guest)
     │   └────── Proxmox (management + services)
     └────────── NAS  ← VLAN 70, deny-all, no inbound from internet
```

## The hardware shortlist

I went back and forth on a few of these before settling.

- **Firewall:** a small fanless Intel N100 box with four 2.5GbE ports. I did think about a Raspberry Pi and then talked myself out of it. Once you've got sensitive data you want VLANs, QoS *and* Suricata all running at once, and the Pi's flaky USB-Ethernet plus its tiny bit of headroom just don't cut it for that job.
- **Hypervisor:** a quiet mini PC (probably an N305, or an i5 with an iGPU) running Proxmox, with enough RAM to comfortably run Home Assistant, Nextcloud, Immich, Pi-hole with Unbound, and Authentik without breaking a sweat.
- **Switch:** moving up from the dumb 8-port thing to a 16-port managed switch with SFP uplinks, so VLANs and a bit of growth don't become a headache later.
- **Stuff I'm reusing:** the WiFi 7 access point drops down to being a plain AP, and the Synology NAS and the UPS stay right where they are.

## Storage: don't touch what works

The Synology has been chugging along in RAID1 for years and it's already holding the sensitive data. The big temptation on a project like this is to "upgrade" the storage. Migrate everything to TrueNAS and ZFS, rebuild the array, all of that. But here's the thing. With real client data already live, that migration is the single most dangerous moment in the whole plan. So I'm being deliberate about it: no migration for now. I keep the NAS and instead lock it down properly, with encrypted shared folders, per-user access on a least-privilege basis, 2FA, snapshots that actually stick around, and audit logging.

ZFS still tempts me for further down the line, but only once I've got a verified 3-2-1 backup I've actually restored from. Not a minute before.

## Software stack (all open source)

| Function            | Software                |
| ------------------- | ----------------------- |
| Firewall / IDS      | OPNsense + Suricata     |
| Hypervisor          | Proxmox VE              |
| Home automation     | Home Assistant          |
| Files cloud         | Nextcloud               |
| Photos cloud        | Immich                  |
| DNS + ad block      | Pi-hole + Unbound       |
| SSO / identity / 2FA | Authentik              |
| Remote access       | Tailscale               |
| UPS shutdown        | NUT                     |

For remote access it's Tailscale and nothing else. No open ports, no exceptions. Nextcloud and Immich never get pointed straight at the internet, they sit behind the VPN with Authentik (SSO and 2FA) guarding the door. The domain I own is just for internal certificates, it's not there to expose anything.

## What I still need to confirm

A plan isn't really done until you've pinned down the assumptions, and I've still got a few hanging. These are the things standing between me and a fixed budget:

- The actual fiber speed I'm getting. 1 Gbps vs 10 Gbps changes which firewall I end up buying.
- Whether the cameras I already have speak RTSP/ONVIF or are locked into some proprietary cloud. That one decides whether local recording with Frigate is even on the table.
- Whether the ISP router will behave in bridge mode so OPNsense can actually do the routing.

## Build order

The order you do this in matters just as much as the parts list:

1. OPNsense, VLANs, DNS and Suricata first. The wall goes up before anything else.
2. Managed switch trunked, VLANs flowing everywhere, VLAN 70 locked down to deny-all.
3. A verified 3-2-1 backup of the NAS before I touch anything else. This one isn't optional.
4. Proxmox and the base services (Pi-hole/Unbound, Tailscale, Authentik).
5. Nextcloud and Immich behind SSO and 2FA. Test the backups before I trust any new data to them.
6. Home Assistant and the IoT gear on their own walled-off VLAN.
7. Cameras on a VLAN with no internet at all.
8. Coordinated shutdown through the UPS with NUT, then writing the whole thing down.

## Why I'm doing it this way

If there's one honest thing I took away from writing all this down, it's that the money was never really the point. With client data the thing that actually drives every call is control and responsibility. Hosting it myself gives me the privacy and the control I want, sure, but it also makes me the one on the hook for the encryption, the backups, and keeping it all up. That's why the one line in the budget I won't cut is backup and security. If I lose or leak someone else's data to save a few euros, the bill (legal and otherwise) blows way past anything I'd have saved.

This is just v1, a plan and not a finished build. I'll write follow-ups as the hardware shows up and each piece comes online.
