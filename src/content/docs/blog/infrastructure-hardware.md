---
title: "Infrastructure: choosing and justifying the hardware"
date: 2026-07-03
description: The hardware behind the enterprise network project, backups, firewall, and the Proxmox server, and the reasoning for each choice.
tags: [homelab, networking, hardware, proxmox, opnsense, synology, backup]
project: Enterprise Network
---

## 0. BACKUPS

The NAS in use is a Synology DS718+. This unit supports Active Backup for Business, the free DSM package that provides Changed Block Tracking, Resilient Change Tracking and deduplication to back up PCs, servers and virtual machines to the NAS.

Two opposite backup flows coexist in this project and must not be mixed:

- Hyper Backup pushes data from the NAS to an external USB drive, will use the "Seagate Expansion Desktop 12TB STKP12000400" as the USB drive.
- Active Backup for Business pulls data from PCs and VMs into the NAS. 

### Why Hyper Backup

The NAS is using RAID1 wich provides availability. It is not a backup, because it immediately replicates any change, including accidental deletions and ransomware encryption. To get real protection against those events comes from versioned backups. Hyper Backup produces those versions in a proprietary format (.hbk) with deduplication, allowing recovery of an earlier state after a deletion or an attack.
### Destination and configuration

1. Backup engine: Hyper Backup, included in DSM, at no cost and with no third-party dependency.
2. Destination: Seagate Expansion Desktop 12 TB external drive (STKP12000400), connected to the rear USB 3.0 port of the DS718+.
3.  Encryption enabled on the task. The encryption key is stored off the NAS and is unrecoverable if lost.
4. Nightly schedule with version rotation (Smart Recycle).
5. Backup scope: the critical dataset is backed up. With about 5 TB used out of 9.1 TB available, the full volume fits with room for versions.

### Verification

An unverified backup does not guarantee recovery. After the first full copy:

1. Run the Hyper Backup integrity check.
2. Restore a test folder to an alternative location and confirm the data is correct.
3. Repeat the test restore periodically.

### Drive verification

The 12 TB desktop drives in this range are helium-based and use CMR recording, suitable for the sustained writes of a backup; consumer SMR does not exceed 8 TB, so at 12 TB the risk is ruled out by capacity.

### Additional redundancy

To harden the system, a second external drive is considered:

- Changing the brand protects against a batch or model defect that could affect both copies at once.
- Rotation with one unit always kept off-site provides the "1" of the 3-2-1 rule: an off-site, offline copy that protects against fire, theft, flood and ransomware with control of the NAS. A drive in a drawer elsewhere cannot be encrypted by an attacker.

## 1. FIREWALL

This unit runs OPNsense as the firewall and inter-VLAN router for the whole network, and will later host Suricata (IDS/IPS).

### Appliance

A firewall appliance is chosen, not an office mini PC. The essential difference is the number of network interfaces: a consumer mini PC has only one physical port. The **Protectli VP2420** provides four Intel 2.5 Gbps Ethernet ports (i226-V), chosen after reviewing feedback from the OPNsense community for their stability over Realtek chips.

The extra cost over the generic option is the premium for European warranty and support, assumed consciously. The barebone version is purchased (no RAM or SSD). The RAM and the SSD are acquired separately.

Capacity for OPNsense and Suricata: the VP2420 uses an Intel Celeron J6412 CPU with AES-NI. It is sufficient to route at 1 Gbps with IDS/IPS active. A higher CPU is not chosen because at 1 Gbps it brings no practical advantage.

Limitation to keep in mind: the VP2420 accepts M.2 SATA storage, not NVMe. That is why the chosen SSD is SATA. For a firewall, SATA is more than enough.

### RAM

The VP2420 has a single SO-DIMM DDR4 slot, with a maximum of 32 GB. The chosen memory is a DDR4-3200 8 GB module (**Adata SO-DIMM DDR4-3200 8 GB**).

The decision to choose 8 GB is driven by budget; RAM prices are too high, and if they do not improve in the future, dropping Suricata is considered. **OPNsense** by itself runs comfortably on 8 GB. **Suricata** is what increases memory demand, because it loads the full rule set into RAM.

With a single RAM slot, upgrading means replacing, which is why dropping Suricata is considered.

### Storage

The chosen SSD (**Silicon Power 128 GB M.2 SATA III**) meets the three requirements of the VP2420:

1. M.2 SATA III interface, not NVMe. It is the type this appliance accepts. An NVMe would not boot.
2. M.2 2280 form factor, the standard for this unit.
3. 128 GB, ample capacity for OPNsense. The system takes little space and logs can be limited, so more capacity is not justified.

Pre-purchase check: confirm in the specifications that the module length is 2280 and that the interface is SATA, not PCIe/NVMe.

## 2. PROXMOX SERVER

This unit runs the Proxmox VE hypervisor and the whole service stack (Immich, Odoo, Home Assistant...), plus the occasional test virtual machine.

### Sizing

The critical resource is RAM. The real sum of the service stack is around 18-24 GB, to which the hypervisor's own consumption and a margin for some test VM are added. This sets the need at 32 GB.

### Storage and data location

The server's storage is for compute. Its NVMe holds Proxmox, the virtual machines and containers, the databases and Immich's thumbnail cache. Immich's documentation requires PostgreSQL to use local SSD and never a network share, which is why I choose 512 GB of storage.

Immich's access to the photos on the NAS generates traffic between the services VLAN and VLAN 70, which must be enabled explicitly as a registered exception.

### Network

The server connects to the central switch through a trunk port, with the Proxmox network bridge configured in VLAN-aware mode, so that each VM or container receives the tag of the VLAN it belongs to. The Proxmox management host resides in MGMT (VLAN 10); Odoo and PostgreSQL, in VLAN 70 because they contain sensitive data.

### Chosen equipment

Minisforum UM870 Slim, in a 32 GB DDR5 + 512 GB NVMe PCIe 4.0 configuration. I chose this mini PC for its CPU (AMD Ryzen 7 8745H), required so that it has headroom for the full stack; this CPU has integrated graphics, more than enough for everything it has to render.

Another of the reasons that led me to choose this model is its dual RAM slot: it is scalable. It also has a second M.2 slot in case I need to increase its storage, but it is not a feature I give much importance to, since 512 GB should be more than enough.

The port is 2.5GbE for the VLAN trunk and all the traffic with the NAS.

I chose the version already configured with 32 GB and 512 GB. With the current price of DDR5 memory, buying the equipment with the RAM included is more economical than acquiring a barebone and adding the modules separately.
