---
title: "CCNA notes (2/5): VLANs, 802.1Q trunking and inter-VLAN routing"
date: 2026-11-04
description: Access and trunk ports, what the 802.1Q tag actually carries, why the native VLAN matters, and the two ways to route between VLANs (router-on-a-stick and SVIs), with Cisco IOS configs.
tags: [ccna, networking, vlans, switching, cisco-ios]
project: CCNA 200-301 Study Notes
---

Second post in my CCNA study notes. After [subnetting](/blog/ccna-notes-1-ipv4-subnetting/), this one covers how a switch splits one physical network into several broadcast domains, how those VLANs cross between switches, and how traffic gets from one VLAN to another.

The blueprint items are "Configure and verify VLANs (normal range) spanning multiple switches" and "Configure and verify interswitch connectivity" (trunk ports, 802.1Q, native VLAN).

## What a VLAN is

A VLAN is a Layer 2 broadcast domain defined in software. Two ports in different VLANs on the same switch behave as if they were on different switches: broadcasts, unknown unicast and multicast stay inside the VLAN. To go from one VLAN to another, traffic has to be routed at Layer 3. In practice I map **one VLAN to one IP subnet**.

VLAN ID ranges:

- **1**: default VLAN. Every port starts in it and it can't be deleted.
- **2 to 1001**: normal range, usable freely.
- **1002 to 1005**: reserved for legacy Token Ring and FDDI; they exist by default and can't be deleted.
- **1006 to 4094**: extended range.
- **0 and 4095**: reserved, not usable.

## Access ports

An access port belongs to a single data VLAN and sends and receives untagged frames. The end device has no idea VLANs exist.

```text
SW1(config)# vlan 10
SW1(config-vlan)# name USERS
SW1(config-vlan)# vlan 20
SW1(config-vlan)# name SERVERS
SW1(config-vlan)# exit
SW1(config)# interface range fastEthernet 0/1 - 10
SW1(config-if-range)# switchport mode access
SW1(config-if-range)# switchport access vlan 10
SW1(config-if-range)# exit
SW1(config)# interface fastEthernet 0/11
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 20
```

If I assign a port to a VLAN that doesn't exist yet, IOS creates it automatically ("% Access VLAN does not exist. Creating vlan 30"). I prefer to create and name VLANs explicitly anyway.

### Voice VLAN

An access port can also carry a voice VLAN for an IP phone, with the PC daisy-chained behind it. The PC's traffic is untagged in the data VLAN; the phone tags its own traffic with the voice VLAN ID (learned through CDP).

```text
SW1(config)# interface fastEthernet 0/5
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 10
SW1(config-if)# switchport voice vlan 50
```

## Trunk ports and 802.1Q

A trunk carries traffic for many VLANs over one link. To keep the VLANs separate, the switch inserts an **802.1Q tag** of 4 bytes between the source MAC address and the EtherType field:

| Field | Size | Purpose |
|---|---|---|
| TPID | 16 bits | Always `0x8100`, identifies the frame as tagged |
| PCP | 3 bits | Priority Code Point, the 802.1p CoS value (0 to 7) used for QoS |
| DEI | 1 bit | Drop Eligible Indicator (formerly CFI) |
| VID | 12 bits | VLAN ID, which is why the maximum is 4094 |

Because the frame changes, the switch recalculates the FCS when it adds or removes the tag. ISL, the old Cisco-proprietary alternative, is obsolete and isn't on the current exam.

### Configuring a trunk

```text
SW1(config)# vlan 99
SW1(config-vlan)# name NATIVE
SW1(config-vlan)# exit
SW1(config)# interface gigabitEthernet 0/1
SW1(config-if)# switchport mode trunk
SW1(config-if)# switchport trunk native vlan 99
SW1(config-if)# switchport trunk allowed vlan 10,20,99
SW1(config-if)# switchport nonegotiate
```

Notes I keep in mind:

- On switches that also support ISL (a 3560 in Packet Tracer, for example), `switchport mode trunk` is rejected until I set `switchport trunk encapsulation dot1q`. A 2960 only supports 802.1Q, so the command doesn't exist there.
- `switchport trunk allowed vlan 30` **replaces** the whole list. To add one VLAN to an existing list I use `switchport trunk allowed vlan add 30`. Forgetting `add` is a quick way to cut every other VLAN off a trunk.
- `switchport nonegotiate` turns off DTP. Hardcoding the mode and disabling negotiation is standard practice.

### DTP in one table

The Dynamic Trunking Protocol lets two Cisco switches negotiate whether a link becomes a trunk. The result for each combination of modes:

| | Access | Dynamic auto | Dynamic desirable | Trunk |
|---|---|---|---|---|
| **Access** | Access | Access | Access | Misconfigured |
| **Dynamic auto** | Access | Access | Trunk | Trunk |
| **Dynamic desirable** | Access | Trunk | Trunk | Trunk |
| **Trunk** | Misconfigured | Trunk | Trunk | Trunk |

The one that catches people out: two switches left in `dynamic auto` (the default on many current Catalyst models) never form a trunk, because neither side initiates.

## The native VLAN

On an 802.1Q trunk, frames from the native VLAN are sent **untagged**, and any untagged frame received on the trunk is placed in the native VLAN. By default the native VLAN is VLAN 1.

Two things follow from that:

1. **Both ends must agree.** If SW1 uses native VLAN 99 and SW2 uses native VLAN 1, untagged frames sent from VLAN 99 on SW1 arrive in VLAN 1 on SW2, silently joining two broadcast domains. CDP detects it and logs `%CDP-4-NATIVE_VLAN_MISMATCH`.
2. **Security.** Leaving the native VLAN as VLAN 1, with user ports also in VLAN 1, enables VLAN hopping through double tagging. Best practice is a dedicated, unused native VLAN (99 in my examples) with no hosts in it, and moving all user ports out of VLAN 1.

## Verification

```text
SW1# show vlan brief
SW1# show interfaces trunk
SW1# show interfaces gigabitEthernet 0/1 switchport
```

- `show vlan brief` lists VLANs and their **access** ports. Trunk ports don't appear here, which confused me the first time.
- `show interfaces trunk` shows the mode, encapsulation, native VLAN, the allowed list, and the VLANs actually forwarding on each trunk (allowed, active, in STP forwarding state and not pruned).
- `show interfaces ... switchport` shows the administrative and operational mode, which is the quickest way to see what DTP actually negotiated.

## Inter-VLAN routing

Hosts in VLAN 10 and VLAN 20 are in different subnets, so they need a default gateway that routes between them. Two designs are on the exam.

The addressing I use in the examples:

| VLAN | Name | Subnet | Gateway |
|---|---|---|---|
| 10 | USERS | 192.168.10.0/24 | 192.168.10.1 |
| 20 | SERVERS | 192.168.20.0/24 | 192.168.20.1 |
| 99 | NATIVE | none | none |

### Option 1: router-on-a-stick

One physical router interface is connected to a switch trunk port, and it's split into subinterfaces, one per VLAN. Each subinterface is told which VLAN tag it belongs to and gets that VLAN's gateway address.

```text
R1(config)# interface gigabitEthernet 0/0
R1(config-if)# no shutdown
R1(config-if)# exit
R1(config)# interface gigabitEthernet 0/0.10
R1(config-subif)# encapsulation dot1Q 10
R1(config-subif)# ip address 192.168.10.1 255.255.255.0
R1(config-subif)# interface gigabitEthernet 0/0.20
R1(config-subif)# encapsulation dot1Q 20
R1(config-subif)# ip address 192.168.20.1 255.255.255.0
R1(config-subif)# interface gigabitEthernet 0/0.99
R1(config-subif)# encapsulation dot1Q 99 native
```

And the switch side:

```text
SW1(config)# interface gigabitEthernet 0/1
SW1(config-if)# switchport mode trunk
SW1(config-if)# switchport trunk native vlan 99
SW1(config-if)# switchport trunk allowed vlan 10,20,99
```

Details that matter:

- The physical interface needs `no shutdown`; the subinterfaces inherit its state.
- The subinterface number (`.10`) is just a label. The `encapsulation dot1Q 10` command is what binds it to the VLAN. I match them to keep things readable.
- The `native` keyword makes the router treat untagged frames as VLAN 99, matching the switch. Without it the router would expect tagged frames for VLAN 99.

Verification on the router: `show ip interface brief` (subinterfaces up/up) and `show ip route` (one connected `C` and one local `L` route per subinterface).

The drawback: all inter-VLAN traffic goes up and back down the same link, so that link is a bottleneck and a single point of failure.

### Option 2: SVIs on a Layer 3 switch

A multilayer switch can route internally. Each VLAN gets a Switch Virtual Interface (`interface vlan X`) with the gateway address, and routing is switched in hardware.

```text
DSW1(config)# ip routing
DSW1(config)# vlan 10
DSW1(config-vlan)# name USERS
DSW1(config-vlan)# vlan 20
DSW1(config-vlan)# name SERVERS
DSW1(config-vlan)# exit
DSW1(config)# interface vlan 10
DSW1(config-if)# ip address 192.168.10.1 255.255.255.0
DSW1(config-if)# no shutdown
DSW1(config-if)# interface vlan 20
DSW1(config-if)# ip address 192.168.20.1 255.255.255.0
DSW1(config-if)# no shutdown
```

Without `ip routing` the switch has SVIs with addresses but won't route between them. That is the first thing I check when inter-VLAN routing on a Layer 3 switch doesn't work.

An SVI is only up/up when all of these are true:

1. The VLAN exists in the VLAN database.
2. At least one access port in that VLAN, or one trunk carrying it, is up and in STP forwarding state.
3. The SVI itself isn't administratively shut down. On Catalyst switches a new SVI is created shut down, so `no shutdown` is required.

A Layer 3 switch can also turn a physical port into a routed port with `no switchport`, which is how it connects to a router with a plain IP link. I use that in the [Packet Tracer lab](/blog/ccna-notes-5-packet-tracer-lab/) at the end of this series.

### Which one I'd pick

Router-on-a-stick is fine for small sites and labs and makes the concept of tagging very visible. SVIs on a Layer 3 switch are what I'd expect in a real campus: no single trunk bottleneck, and routing at wire speed. The exam expects both to be configurable from memory.

## Common faults I check for

- Host port in the wrong VLAN: `show vlan brief`.
- VLAN not allowed on the trunk, or the trunk not formed: `show interfaces trunk`.
- Native VLAN mismatch: CDP log message and `show interfaces trunk` on both sides.
- Missing `ip routing` on a Layer 3 switch, or an SVI down because there's no active port in the VLAN.
- Host with the wrong default gateway or mask.

Next post: what happens when I connect switches with redundant links, which is the problem Spanning Tree solves.
