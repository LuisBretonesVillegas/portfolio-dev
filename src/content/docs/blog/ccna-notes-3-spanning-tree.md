---
title: "CCNA notes (3/5): Spanning Tree, RSTP, PortFast and BPDU Guard"
date: 2026-11-04
description: How STP elects a root bridge and assigns port roles, how RSTP speeds it up, and the edge protections (PortFast, BPDU Guard, Root Guard, Loop Guard), with a full election worked out step by step on a four-switch topology.
tags: [ccna, networking, stp, rstp, switching, cisco-ios]
project: CCNA 200-301 Study Notes
---

Third post in my CCNA study notes. In the [VLANs post](/blog/ccna-notes-2-vlans-trunking/) every switch had a single path to every other switch. Real networks add redundant links, and at Layer 2 redundancy creates loops. Spanning Tree is what prevents them.

The blueprint item is "Interpret basic operations of Rapid PVST+ Spanning Tree Protocol": root port, root bridge (primary and secondary), other port names, port states and roles, PortFast, and Root Guard, Loop Guard, BPDU Filter and BPDU Guard.

## Why loops are a problem at Layer 2

An Ethernet frame has no TTL. If two switches are connected by two links, a broadcast leaves SW1 through both, SW2 floods each copy back through the other link, and the frames circulate forever. The result is a **broadcast storm** (links saturated, CPUs at 100%), **MAC address table instability** (the same source MAC learned alternately on different ports) and **duplicate frames** delivered to hosts.

STP (IEEE 802.1D) solves it by putting some ports in a blocking state so that the active topology is a loop-free tree. If an active link fails, a blocked port can take over.

## The Bridge ID

Every switch has a **Bridge ID (BID)** of 8 bytes:

- **Priority** (4 bits) + **extended system ID** (12 bits, equal to the VLAN number) = 2 bytes. The priority can only be set in multiples of 4096, from 0 to 61440. The default is 32768, so a switch in VLAN 1 shows priority 32769 and in VLAN 10 shows 32778.
- **MAC address** (6 bytes), the switch's base MAC.

Lower is better everywhere in STP: lower BID, lower cost, lower port ID.

## Port costs

The **root path cost** is the sum of port costs along the path to the root. The root advertises a cost of 0 in its BPDUs; each switch adds the cost of the port on which it received the BPDU and advertises the result downstream. With the short (16-bit) method, the default on classic Catalyst switches such as the 2960:

| Speed | Short cost | Long cost |
|---|---|---|
| 10 Mbps | 100 | 2,000,000 |
| 100 Mbps | 19 | 200,000 |
| 1 Gbps | 4 | 20,000 |
| 10 Gbps | 2 | 2,000 |

Newer IOS-XE platforms default to the long method (`spanning-tree pathcost method long`). The exam uses the short values unless it says otherwise.

## The election, in three steps

### 1. Elect the root bridge

The switch with the **lowest BID** becomes the root bridge: first the lowest priority, then the lowest MAC address as a tiebreaker. All ports on the root bridge are designated ports and forward.

### 2. Each non-root switch picks one root port

The root port is the port with the best path to the root. Tiebreakers in order:

1. Lowest **root path cost**.
2. Lowest **neighbor BID** (the switch that sent the BPDU).
3. Lowest **neighbor port priority** (default 128).
4. Lowest **neighbor port number**.

Steps 3 and 4 use the neighbor's port ID, not the local one. This only matters when two switches are connected by parallel links.

### 3. Each segment picks one designated port

On every link, the port that offers the lowest root path cost to that segment becomes the designated port and forwards. Ties are broken by the lowest BID of the switch owning the port, then by the lowest port ID.

Every port that is neither a root port nor a designated port is blocked (in RSTP terms, an alternate or backup port).

## Worked example: four switches

All switches run the default priority in VLAN 1 (32769), so the MAC address decides the root.

| Switch | Priority | MAC |
|---|---|---|
| SW1 | 32769 | aaaa.aaaa.0001 |
| SW2 | 32769 | aaaa.aaaa.0002 |
| SW3 | 32769 | aaaa.aaaa.0003 |
| SW4 | 32769 | aaaa.aaaa.0004 |

Links:

| Link | Ports | Speed | Cost |
|---|---|---|---|
| A | SW1 Gi0/1 to SW2 Gi0/1 | 1 Gbps | 4 |
| B | SW1 Gi0/2 to SW3 Gi0/1 | 1 Gbps | 4 |
| C | SW2 Gi0/2 to SW4 Gi0/1 | 1 Gbps | 4 |
| D | SW3 Fa0/24 to SW4 Fa0/24 | 100 Mbps | 19 |
| E | SW2 Gi0/3 to SW3 Gi0/3 | 1 Gbps | 4 |

```text
            SW1 (root)
          Gi0/1   Gi0/2
           |  A      |  B
          Gi0/1     Gi0/1
           SW2 Gi0/3--E--Gi0/3 SW3
          Gi0/2               Fa0/24
           |  C                 |  D
          Gi0/1               Fa0/24
           SW4 ----------------+
```

**Step 1, root bridge.** Equal priorities, lowest MAC is `aaaa.aaaa.0001`. **SW1 is the root.** Its Gi0/1 and Gi0/2 are designated.

**Step 2, root ports.**

- **SW2**: direct via Gi0/1 costs 4; via SW3 (Gi0/3, then SW3 to SW1) costs 4 + 4 = 8. Root port **Gi0/1**.
- **SW3**: direct via Gi0/1 costs 4; via SW2 costs 8; via SW4 costs far more. Root port **Gi0/1**.
- **SW4**: via Gi0/1 (SW2 then SW1) costs 4 + 4 = 8; via Fa0/24 (SW3 then SW1) costs 19 + 4 = 23. Root port **Gi0/1**.

**Step 3, designated ports for the segments without a root bridge port.**

- **Link C (SW2 to SW4)**: SW2 advertises a root cost of 4, SW4 advertises 8. **SW2 Gi0/2** is designated. SW4 Gi0/1 is already its root port.
- **Link D (SW3 to SW4)**: SW3 advertises 4, SW4 advertises 8. **SW3 Fa0/24** is designated, **SW4 Fa0/24 blocks**.
- **Link E (SW2 to SW3)**: both advertise 4, so it's a tie on cost. The lower BID wins: SW2 (`...0002`) beats SW3 (`...0003`). **SW2 Gi0/3** is designated, **SW3 Gi0/3 blocks**.

Result:

| Switch | Port | Role | State |
|---|---|---|---|
| SW1 | Gi0/1, Gi0/2 | Designated | Forwarding |
| SW2 | Gi0/1 | Root | Forwarding |
| SW2 | Gi0/2, Gi0/3 | Designated | Forwarding |
| SW3 | Gi0/1 | Root | Forwarding |
| SW3 | Fa0/24 | Designated | Forwarding |
| SW3 | Gi0/3 | Alternate | Blocking |
| SW4 | Gi0/1 | Root | Forwarding |
| SW4 | Fa0/24 | Alternate | Blocking |

Five links, four switches, two blocked ports: three links stay active, which is exactly a tree (n - 1 links for n switches). Traffic from SW3 to SW4 goes SW3, SW1, SW2, SW4 (cost 12) instead of over the 100 Mbps link D, which is what the costs say should happen.

What `show spanning-tree vlan 1` would show on SW4 with Rapid PVST+ (on a 2960 with 24 FastEthernet ports, Fa0/24 is port 24 and Gi0/1 is port 25):

```text
SW4# show spanning-tree vlan 1

VLAN0001
  Spanning tree enabled protocol rstp
  Root ID    Priority    32769
             Address     aaaa.aaaa.0001
             Cost        8
             Port        25 (GigabitEthernet0/1)
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     aaaa.aaaa.0004
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Gi0/1               Root FWD 4         128.25   P2p
Fa0/24              Altn BLK 19        128.24   P2p
```

### A tiebreaker variation: parallel links

Suppose SW1 (root) and SW2 are connected by two links, SW1 Gi0/1 to SW2 Gi0/2 and SW1 Gi0/2 to SW2 Gi0/1. Cost is equal (4) and the neighbor BID is the same (SW1) on both, so the decision goes to the **neighbor's** port ID. SW1 Gi0/1 has a lower port ID than SW1 Gi0/2, so SW2's root port is **Gi0/2**, the one connected to SW1 Gi0/1, even though SW2's own Gi0/1 has the lower local number. This is the classic exam trap.

## Choosing the root on purpose

Leaving the election to the lowest MAC usually means the oldest switch in the network becomes root, which is rarely the one I want. I set it explicitly, usually per VLAN on the distribution switches:

```text
DSW1(config)# spanning-tree vlan 10,20 root primary
DSW2(config)# spanning-tree vlan 10,20 root secondary
```

`root primary` is a macro: it sets the priority to 24576, or to 4096 below the current root's priority if the current root is already lower than that. `root secondary` sets 28672. I can also set the value directly:

```text
DSW1(config)# spanning-tree vlan 10 priority 4096
```

Since this is per VLAN (PVST+ and Rapid PVST+ run one instance per VLAN), I can make DSW1 root for VLAN 10 and DSW2 root for VLAN 20, so both uplinks carry traffic.

Port cost and port priority can also be changed to influence root port and designated port selection:

```text
SW4(config)# interface fastEthernet 0/24
SW4(config-if)# spanning-tree vlan 1 cost 2
SW4(config-if)# spanning-tree vlan 1 port-priority 64
```

## Classic STP port states and timers

802.1D has five states:

| State | Forwards frames | Learns MACs | Duration |
|---|---|---|---|
| Blocking | No | No | Up to Max Age (20 s) |
| Listening | No | No | Forward Delay (15 s) |
| Learning | No | Yes | Forward Delay (15 s) |
| Forwarding | Yes | Yes | Stable |
| Disabled | No | No | Shut down |

Timers: Hello 2 s, Forward Delay 15 s, Max Age 20 s. A blocked port that has to start forwarding after an indirect failure takes 20 + 15 + 15 = **50 seconds**; after a direct failure, 30 seconds. That's the main reason RSTP exists.

## RSTP (802.1w) and Rapid PVST+

Rapid PVST+ is Cisco's per-VLAN implementation of RSTP and the version the blueprint focuses on. The election logic is the same; the differences are in roles, states and convergence.

**States** are reduced to three: **discarding** (merges disabled, blocking and listening), **learning** and **forwarding**.

**Roles**:

- **Root port** and **designated port**, as before.
- **Alternate port**: a discarding port that receives a superior BPDU from another switch. It's a ready-made replacement for the root port. SW3 Gi0/3 and SW4 Fa0/24 in the example are alternate ports.
- **Backup port**: a discarding port that receives a superior BPDU from **its own switch**, which only happens when two ports of the same switch connect to a shared segment (a hub). Rare today, but it's an exam question.

**Why it converges faster**:

- If the root port fails, an alternate port moves straight to forwarding without waiting for timers.
- On point-to-point links (full duplex), switches use a **proposal/agreement** handshake to move a designated port to forwarding in a second or less.
- Every switch generates its own BPDUs every Hello time, and a neighbor is considered lost after 3 missed Hellos (6 s) instead of waiting 20 s of Max Age.
- **Edge ports** (the RSTP name for PortFast ports) go to forwarding immediately.

Link types: full duplex is treated as **point-to-point**, half duplex as **shared**. Rapid convergence only works on point-to-point links. That's the `P2p` in the `Type` column above.

Enabling it, on every switch:

```text
SW1(config)# spanning-tree mode rapid-pvst
```

## Edge protections

### PortFast

A port connected to a PC, printer or server doesn't need to go through listening and learning: there is no switch behind it that could create a loop. PortFast moves it straight to forwarding, which avoids the 30 seconds in which a booting PC fails to get a DHCP lease.

```text
SW1(config)# interface range fastEthernet 0/1 - 20
SW1(config-if-range)# spanning-tree portfast
```

Or globally, for every access port:

```text
SW1(config)# spanning-tree portfast default
```

PortFast on a port facing another switch is dangerous, because the port forwards before STP can detect a loop.

### BPDU Guard

BPDU Guard covers that danger. If a port with BPDU Guard receives any BPDU, the switch puts it in **err-disabled** state immediately. I always pair it with PortFast.

```text
SW1(config-if-range)# spanning-tree bpduguard enable
```

Or globally, applied to every PortFast-enabled port:

```text
SW1(config)# spanning-tree portfast bpduguard default
```

To recover a port, I fix the cause and then bounce it with `shutdown` followed by `no shutdown`, or let the switch do it automatically:

```text
SW1(config)# errdisable recovery cause bpduguard
SW1(config)# errdisable recovery interval 300
```

### Root Guard, Loop Guard and BPDU Filter

The 200-301 v1.1 blueprint also lists these three, so I keep a short summary:

- **Root Guard** (`spanning-tree guard root`): on a designated port, typically facing access switches or a customer. If a superior BPDU arrives (someone trying to become root), the port goes **root-inconsistent** and stops forwarding. Unlike BPDU Guard, it recovers on its own when the superior BPDUs stop.
- **Loop Guard** (`spanning-tree guard loop`): on root and alternate ports. If BPDUs stop arriving (for example, because of a unidirectional link), the port goes **loop-inconsistent** instead of wrongly becoming designated and forwarding.
- **BPDU Filter**: applied on an interface (`spanning-tree bpdufilter enable`), the port stops sending and processing BPDUs, which effectively disables STP on it. Applied globally (`spanning-tree portfast bpdufilter default`), PortFast ports stop sending BPDUs, but if one receives a BPDU it loses its PortFast status and runs STP normally. The interface version is the risky one.

## Verification commands

```text
SW1# show spanning-tree
SW1# show spanning-tree vlan 10
SW1# show spanning-tree summary
SW1# show spanning-tree interface fastEthernet 0/1 detail
SW1# show interfaces status err-disabled
```

`show spanning-tree vlan X` answers most exam questions: who is the root (and whether this switch is the root, marked with "This bridge is the root"), the root port and cost, and the role and state of every port.

Next post: routing between subnets dynamically with OSPF.
