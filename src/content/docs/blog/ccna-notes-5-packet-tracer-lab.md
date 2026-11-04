---
title: "CCNA notes (5/5): Packet Tracer lab with VLANs, STP and OSPF"
date: 2026-11-04
description: A two-site Packet Tracer lab that combines the whole series. VLSM addressing, VLANs and trunks, Rapid PVST+ with PortFast and BPDU Guard, router-on-a-stick on one site, SVIs on the other, and single-area OSPF in between, with full configs and a verification plan.
tags: [ccna, networking, packet-tracer, lab, vlans, stp, ospf, cisco-ios]
project: CCNA 200-301 Study Notes
---

Last post in my CCNA study notes. The previous four covered [subnetting](/blog/ccna-notes-1-ipv4-subnetting/), [VLANs and trunking](/blog/ccna-notes-2-vlans-trunking/), [Spanning Tree](/blog/ccna-notes-3-spanning-tree/) and [OSPFv2](/blog/ccna-notes-4-ospfv2-single-area/) separately. This lab puts them in one topology, which is closer to how they appear in exam simulations: a ping fails, and the cause could be in any layer.

Everything here uses devices available in Cisco Packet Tracer: 2911 routers, 2960-24TT access switches, a 3560-24PS multilayer switch and generic PCs and servers.

## Topology

Two sites joined by two routers.

- **Site A** routes between VLANs with **router-on-a-stick** on R1. Its two access switches are connected by two parallel trunks, so STP has a loop to break.
- **Site B** routes between VLANs with **SVIs** on the multilayer switch MLS-B, which connects to R2 through a routed port.
- R1, R2 and MLS-B run **OSPF in area 0**.

```text
 SITE A                                                   SITE B

 PC-A1                                                    PC-B1 (Fa0/1, VLAN 30)
   |Fa0/1                                                   |
 SW-A1 Gi0/1 ---- Gi0/0 R1 Gi0/1 ---- Gi0/1 R2 Gi0/0 ---- Gi0/1 MLS-B
 Fa0/23 Fa0/24                                              |
   ||     ||                                              SRV-B (Fa0/11, VLAN 40)
 Fa0/23 Fa0/24
 SW-A2
 Fa0/1    Fa0/11
   |        |
 PC-A2    SRV-A
```

Cabling: copper straight-through between routers and switches and between hosts and switches; copper cross-over between the two 2960s and between R1 and R2.

## Addressing plan

I allocated everything from `172.16.0.0/23` with VLSM, largest first, exactly as in post 1.

| Segment | VLAN | Hosts needed | Subnet | Gateway |
|---|---|---|---|---|
| Users A | 10 | 100 | 172.16.0.0/25 | 172.16.0.1 (R1) |
| Users B | 30 | 100 | 172.16.0.128/25 | 172.16.0.129 (MLS-B) |
| Servers A | 20 | 25 | 172.16.1.0/27 | 172.16.1.1 (R1) |
| Servers B | 40 | 25 | 172.16.1.32/27 | 172.16.1.33 (MLS-B) |
| Management A | 98 | 10 | 172.16.1.64/28 | 172.16.1.65 (R1) |
| R1 to R2 | none | 2 | 172.16.1.80/30 | none |
| R2 to MLS-B | none | 2 | 172.16.1.84/30 | none |
| Native A | 99 | 0 | none | none |

Free space for growth: `172.16.1.88` to `172.16.1.255`.

Device addresses:

| Device | Interface | Address | Default gateway |
|---|---|---|---|
| R1 | Gi0/0.10 | 172.16.0.1/25 | |
| R1 | Gi0/0.20 | 172.16.1.1/27 | |
| R1 | Gi0/0.98 | 172.16.1.65/28 | |
| R1 | Gi0/1 | 172.16.1.81/30 | |
| R2 | Gi0/1 | 172.16.1.82/30 | |
| R2 | Gi0/0 | 172.16.1.85/30 | |
| MLS-B | Gi0/1 (routed) | 172.16.1.86/30 | |
| MLS-B | Vlan30 | 172.16.0.129/25 | |
| MLS-B | Vlan40 | 172.16.1.33/27 | |
| SW-A1 | Vlan98 | 172.16.1.66/28 | 172.16.1.65 |
| SW-A2 | Vlan98 | 172.16.1.67/28 | 172.16.1.65 |
| PC-A1 | NIC | 172.16.0.10/25 | 172.16.0.1 |
| PC-A2 | NIC | 172.16.0.11/25 | 172.16.0.1 |
| SRV-A | NIC | 172.16.1.10/27 | 172.16.1.1 |
| PC-B1 | NIC | 172.16.0.140/25 | 172.16.0.129 |
| SRV-B | NIC | 172.16.1.40/27 | 172.16.1.33 |

Router IDs: R1 `1.1.1.1`, R2 `2.2.2.2`, MLS-B `3.3.3.3`.

## Step 1: VLANs, trunks and STP on Site A

### SW-A1

SW-A1 is the root bridge for every VLAN on the site. Its uplink to R1 and both links to SW-A2 are trunks with native VLAN 99.

```text
enable
configure terminal
hostname SW-A1
vlan 10
 name USERS-A
vlan 20
 name SERVERS-A
vlan 98
 name MGMT-A
vlan 99
 name NATIVE
exit
spanning-tree mode rapid-pvst
spanning-tree vlan 10,20,98,99 root primary
interface gigabitEthernet 0/1
 description Trunk to R1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,98,99
 switchport nonegotiate
interface range fastEthernet 0/23 - 24
 description Trunks to SW-A2
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,98,99
 switchport nonegotiate
interface fastEthernet 0/1
 description PC-A1
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
interface vlan 98
 ip address 172.16.1.66 255.255.255.240
 no shutdown
exit
ip default-gateway 172.16.1.65
end
```

### SW-A2

SW-A2 is the secondary root. I configure every remaining access port as an edge port in VLAN 10 first and then move Fa0/11 to the servers VLAN; that also leaves Fa0/2 ready for the BPDU Guard test in step 5.

```text
enable
configure terminal
hostname SW-A2
vlan 10
 name USERS-A
vlan 20
 name SERVERS-A
vlan 98
 name MGMT-A
vlan 99
 name NATIVE
exit
spanning-tree mode rapid-pvst
spanning-tree vlan 10,20,98,99 root secondary
interface range fastEthernet 0/23 - 24
 description Trunks to SW-A1
 switchport mode trunk
 switchport trunk native vlan 99
 switchport trunk allowed vlan 10,20,98,99
 switchport nonegotiate
interface range fastEthernet 0/1 - 22
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
interface fastEthernet 0/11
 description SRV-A
 switchport access vlan 20
interface vlan 98
 ip address 172.16.1.67 255.255.255.240
 no shutdown
exit
ip default-gateway 172.16.1.65
end
```

### What STP should do here

SW-A1 has priority 24576 (from `root primary`), so in VLAN 10 its bridge priority is 24586 and it's the root. SW-A2 has 28672 + 10 = 28682. On SW-A2, both trunks have the same cost (19) to the same neighbor, so the tiebreaker is the **neighbor's** port ID: SW-A1 Fa0/23 (128.23) beats SW-A1 Fa0/24 (128.24). Expected result on SW-A2:

- Fa0/23: **Root, Forwarding**
- Fa0/24: **Alternate, Blocking**
- Fa0/1 to Fa0/22 in use: **Designated, Forwarding**, shown as `P2p Edge`

## Step 2: router-on-a-stick on R1

```text
enable
configure terminal
hostname R1
interface gigabitEthernet 0/0
 description Trunk to SW-A1
 no shutdown
interface gigabitEthernet 0/0.10
 encapsulation dot1Q 10
 ip address 172.16.0.1 255.255.255.128
interface gigabitEthernet 0/0.20
 encapsulation dot1Q 20
 ip address 172.16.1.1 255.255.255.224
interface gigabitEthernet 0/0.98
 encapsulation dot1Q 98
 ip address 172.16.1.65 255.255.255.240
interface gigabitEthernet 0/0.99
 encapsulation dot1Q 99 native
interface gigabitEthernet 0/1
 description Link to R2
 ip address 172.16.1.81 255.255.255.252
 no shutdown
end
```

Before moving on I check Site A on its own: PC-A1 should ping its gateway `172.16.0.1`, SRV-A (`172.16.1.10`, inter-VLAN through R1) and both switch management addresses.

## Step 3: Site B, SVIs on MLS-B

```text
enable
configure terminal
hostname MLS-B
ip routing
spanning-tree mode rapid-pvst
vlan 30
 name USERS-B
vlan 40
 name SERVERS-B
exit
interface gigabitEthernet 0/1
 description Routed link to R2
 no switchport
 ip address 172.16.1.86 255.255.255.252
 no shutdown
interface fastEthernet 0/1
 description PC-B1
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
interface fastEthernet 0/11
 description SRV-B
 switchport mode access
 switchport access vlan 40
 spanning-tree portfast
 spanning-tree bpduguard enable
interface vlan 30
 ip address 172.16.0.129 255.255.255.128
 no shutdown
interface vlan 40
 ip address 172.16.1.33 255.255.255.224
 no shutdown
end
```

The SVIs only come up once PC-B1 and SRV-B are connected, because an SVI needs at least one active port in its VLAN. PC-B1 should now ping SRV-B, routed internally by MLS-B.

## Step 4: R2 and OSPF

### R2

```text
enable
configure terminal
hostname R2
interface gigabitEthernet 0/1
 description Link to R1
 ip address 172.16.1.82 255.255.255.252
 no shutdown
interface gigabitEthernet 0/0
 description Link to MLS-B
 ip address 172.16.1.85 255.255.255.252
 no shutdown
router ospf 1
 router-id 2.2.2.2
 auto-cost reference-bandwidth 10000
 network 172.16.1.80 0.0.0.3 area 0
 network 172.16.1.84 0.0.0.3 area 0
end
```

R2 has no host-facing interfaces, so nothing is passive.

### R1

The subinterfaces facing the LAN are advertised but passive, so R1 doesn't send Hellos to the hosts. The native VLAN subinterface has no address, so no `network` statement matches it.

```text
configure terminal
router ospf 1
 router-id 1.1.1.1
 auto-cost reference-bandwidth 10000
 network 172.16.0.0 0.0.0.127 area 0
 network 172.16.1.0 0.0.0.31 area 0
 network 172.16.1.64 0.0.0.15 area 0
 network 172.16.1.80 0.0.0.3 area 0
 passive-interface gigabitEthernet 0/0.10
 passive-interface gigabitEthernet 0/0.20
 passive-interface gigabitEthernet 0/0.98
end
```

### MLS-B

```text
configure terminal
router ospf 1
 router-id 3.3.3.3
 auto-cost reference-bandwidth 10000
 network 172.16.1.84 0.0.0.3 area 0
 network 172.16.0.128 0.0.0.127 area 0
 network 172.16.1.32 0.0.0.31 area 0
 passive-interface vlan 30
 passive-interface vlan 40
end
```

Every wildcard here is just the inverse of the subnet mask from the addressing plan (`/25` to `0.0.0.127`, `/27` to `0.0.0.31`, `/28` to `0.0.0.15`, `/30` to `0.0.0.3`). Since `auto-cost reference-bandwidth` is the same on all three devices, the costs are consistent.

Finally, I save the configuration on every device with `copy running-config startup-config`.

## Verification plan

I go bottom-up, one layer at a time, so that if something fails I know where to look.

### Layer 2 on Site A

```text
SW-A1# show vlan brief
SW-A1# show interfaces trunk
SW-A2# show spanning-tree vlan 10
```

What I expect:

- `show vlan brief`: VLANs 10, 20, 98 and 99 exist; Fa0/1 in VLAN 10. Trunk ports are not listed.
- `show interfaces trunk` on SW-A1: Gi0/1, Fa0/23 and Fa0/24 trunking, encapsulation 802.1q, native VLAN 99, allowed 10,20,98,99. On SW-A2, the same command shows `none` for Fa0/24 under "Vlans in spanning tree forwarding state and not pruned", because STP blocks it.
- `show spanning-tree vlan 10` on SW-A2: protocol `rstp`, root ID priority 24586 with SW-A1's MAC, Fa0/23 `Root FWD`, Fa0/24 `Altn BLK`.

### Inter-VLAN routing

```text
R1# show ip interface brief
R1# show ip route connected
MLS-B# show ip interface brief
```

R1's four subinterfaces and Gi0/1 should be up/up, with a connected route for each addressed subnet. On MLS-B, Gi0/1, Vlan30 and Vlan40 should be up/up.

### OSPF

```text
R2# show ip ospf neighbor
R1# show ip route ospf
MLS-B# show ip ospf interface brief
R1# show ip protocols
```

What I expect:

- R2 has two neighbors, `1.1.1.1` on Gi0/1 and `3.3.3.3` on Gi0/0, both in `FULL`. Since these are Ethernet links, each one elects a DR and a BDR; which router gets which role depends on router IDs and on the order the routers came up.
- R1 learns, via `172.16.1.82`, the routes `O 172.16.0.128/25`, `O 172.16.1.32/27` and `O 172.16.1.84/30`.
- With a 10,000 Mbps reference, each Gigabit hop costs 10. The metric R1 sees for `172.16.0.128/25` is the sum of R1 Gi0/1, R2 Gi0/0 and MLS-B's Vlan30 cost, so 30 if the SVI is treated as a 1 Gbps interface. If the number is different, `show ip ospf interface brief` on each hop shows which cost differs.
- `show ip protocols` on R1 lists the three subinterfaces as passive.

### End to end

From PC-A1:

```text
C:\> ping 172.16.1.40
C:\> tracert 172.16.1.40
```

The first ping may lose a packet or two while ARP resolves along the path. The trace should show four hops: `172.16.0.1` (R1), `172.16.1.82` (R2), `172.16.1.86` (MLS-B) and `172.16.1.40` (SRV-B).

## Step 5: break things on purpose

Configuring a lab that works the first time teaches less than breaking it. These are the tests I run, and what each one demonstrates.

1. **STP failover.** Start a continuous ping from PC-A2 to SRV-B (`ping -t 172.16.1.40`) and shut down Fa0/23 on SW-A2. With Rapid PVST+, Fa0/24 moves from alternate to root port almost immediately, and `show spanning-tree vlan 10` confirms it. Bring Fa0/23 back with `no shutdown` afterwards.
2. **BPDU Guard.** Connect a spare 2960 to SW-A2 Fa0/2. The new switch sends BPDUs, so Fa0/2 goes to err-disabled. `show interfaces status err-disabled` shows it; recover it with `shutdown` and `no shutdown` after removing the switch.
3. **Native VLAN mismatch.** Change the native VLAN on SW-A2 Fa0/23 to 1 and watch for the CDP mismatch message on both switches. Then put it back to 99.
4. **Pruned VLAN.** Run `switchport trunk allowed vlan 10,98,99` (without `add`) on SW-A1 Gi0/1. SRV-A can no longer reach its gateway, because VLAN 20 no longer reaches R1, so it loses connectivity to everything outside its own VLAN. Restore it with `switchport trunk allowed vlan add 20`.
5. **OSPF passive mistake.** Add `passive-interface gigabitEthernet 0/1` on R2. The adjacency with R1 drops and the Site B routes disappear from R1's table. Remove it with `no passive-interface gigabitEthernet 0/1`.
6. **Missing `ip routing`.** Run `no ip routing` on MLS-B. PC-B1 can no longer reach SRV-B and OSPF on MLS-B stops; re-enable `ip routing` and reconfigure the OSPF process if it was removed.

## Closing the series

These five posts cover a large part of the Network Access and IP Connectivity domains of the 200-301 blueprint, but not all of it: IPv6, first hop redundancy, EtherChannel, wireless, NAT, ACLs and automation are still ahead. I'll keep adding notes as I work through them, and this lab is the base topology I plan to extend each time.
