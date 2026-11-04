---
title: "CCNA notes (1/5): IPv4 subnetting and VLSM"
date: 2026-11-04
description: The block-size method I use to subnet in my head, how I design VLSM schemes largest-first, and 14 exercises with full worked solutions.
tags: [ccna, networking, subnetting, ipv4]
project: CCNA 200-301 Study Notes
---

This is the first post in a series of study notes for the CCNA (200-301). I'm writing them as I go through the blueprint, mostly to force myself to explain each topic properly. Subnetting comes first because almost everything else in the series (VLAN addressing, OSPF `network` statements, the final Packet Tracer lab) depends on it.

The blueprint item is "Configure and verify IPv4 addressing and subnetting". In the exam you don't get a calculator, so the goal is to be fast and reliable by hand.

## The basics I need to have automatic

An IPv4 address is 32 bits. The prefix length (`/n`) says how many of those bits are the network part; the remaining `32 - n` bits are the host part.

- **Hosts per subnet**: `2^h - 2`, where `h` is the number of host bits. The two addresses removed are the network address (all host bits 0) and the broadcast address (all host bits 1).
- **Number of subnets**: `2^s`, where `s` is the number of bits borrowed from the original host part.
- **Exceptions**: a `/31` has 2 usable addresses on point-to-point links (RFC 3021), and a `/32` identifies a single host (typical for loopbacks).

The mask values for a single octet are worth memorising, because every calculation below uses them:

| Bits in the octet | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Mask value | 128 | 192 | 224 | 240 | 248 | 252 | 254 | 255 |
| Block size | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |

And the host counts for the most common prefixes:

| Prefix | Mask | Usable hosts |
|---|---|---|
| /30 | 255.255.255.252 | 2 |
| /29 | 255.255.255.248 | 6 |
| /28 | 255.255.255.240 | 14 |
| /27 | 255.255.255.224 | 30 |
| /26 | 255.255.255.192 | 62 |
| /25 | 255.255.255.128 | 126 |
| /24 | 255.255.255.0 | 254 |
| /23 | 255.255.254.0 | 510 |
| /22 | 255.255.252.0 | 1022 |

## My method: block size in the interesting octet

I don't convert whole addresses to binary. I only look at one octet.

1. **Find the interesting octet**: the one where the mask is neither 255 nor 0. For a /27 it's the fourth octet; for a /21 it's the third.
2. **Block size** = `256 - mask value` in that octet. For a /27 the mask octet is 224, so the block size is 32.
3. **Network address**: the largest multiple of the block size that is less than or equal to the address's value in that octet. Octets to the left are copied; octets to the right become 0.
4. **Broadcast address**: next network minus one. Octets to the right become 255.
5. **Usable range**: network + 1 up to broadcast - 1.

Example: `192.168.1.200/26`. Mask octet 192, block 64. Multiples of 64: 0, 64, 128, 192. The largest one that fits under 200 is 192, so the network is `192.168.1.192`, the broadcast is `192.168.1.255`, and the hosts go from `.193` to `.254`.

## VLSM: largest subnet first

Variable Length Subnet Masking means each subnet gets the prefix that fits its own requirement instead of one size for everything. The method I follow:

1. Sort the requirements from largest to smallest.
2. For each one, pick the smallest subnet where `2^h - 2` is greater than or equal to the hosts required.
3. Allocate it at the first free address that is a multiple of its block size.
4. Move the pointer to the next address after its broadcast and repeat.

Going largest first guarantees that every allocation starts on a valid boundary, so the subnets never overlap and the address space stays contiguous.

## Exercises

I try to solve each one before reading the solution. Solutions use the block-size method above.

### Exercise 1

Find the network, broadcast, usable range and number of hosts for `172.16.45.130/27`.

**Solution.** /27 means the fourth octet is interesting, mask 224, block 32. Multiples of 32: 0, 32, 64, 96, 128, 160. 130 falls in the block starting at 128.

- Network: `172.16.45.128`
- Broadcast: `172.16.45.159` (160 - 1)
- Usable range: `172.16.45.129` to `172.16.45.158`
- Hosts: 2^5 - 2 = 30

### Exercise 2

Same questions for `10.1.77.200/21`.

**Solution.** /21 means 16 bits in the first two octets plus 5 in the third, so the third octet is interesting with mask 248 and block 8. Multiples of 8 around 77: 72, 80. The network starts at 72.

- Network: `10.1.72.0`
- Broadcast: `10.1.79.255` (third octet 80 - 1, fourth octet 255)
- Usable range: `10.1.72.1` to `10.1.79.254`
- Hosts: 2^11 - 2 = 2046

### Exercise 3

Same questions for `192.168.5.77` with mask `255.255.255.248`.

**Solution.** 248 is a /29, block 8. Multiples of 8: 72, 80. The address 77 is in the 72 block.

- Network: `192.168.5.72/29`
- Broadcast: `192.168.5.79`
- Usable range: `192.168.5.73` to `192.168.5.78`
- Hosts: 6

### Exercise 4

What is the longest prefix (smallest subnet) that supports at least 500 hosts?

**Solution.** I need `2^h - 2 >= 500`. 2^8 - 2 = 254 is too small, 2^9 - 2 = 510 works. So `h = 9`, prefix `32 - 9 = /23`, mask `255.255.254.0`.

### Exercise 5

Split `192.168.100.0/24` into at least 6 equal subnets. Give the new prefix, hosts per subnet and the first 6 subnets.

**Solution.** 2^2 = 4 is not enough, 2^3 = 8 is. Borrow 3 bits: /24 + 3 = /27, block 32, 30 hosts each.

| # | Subnet | Usable range | Broadcast |
|---|---|---|---|
| 1 | 192.168.100.0/27 | .1 to .30 | .31 |
| 2 | 192.168.100.32/27 | .33 to .62 | .63 |
| 3 | 192.168.100.64/27 | .65 to .94 | .95 |
| 4 | 192.168.100.96/27 | .97 to .126 | .127 |
| 5 | 192.168.100.128/27 | .129 to .158 | .159 |
| 6 | 192.168.100.160/27 | .161 to .190 | .191 |

Two more /27s (`.192` and `.224`) are left free for growth.

### Exercise 6

A company has `10.0.0.0/8` and needs at least 1000 subnets of equal size. What prefix do they use and how many hosts fit in each subnet?

**Solution.** 2^9 = 512 is not enough, 2^10 = 1024 is. Borrow 10 bits: /8 + 10 = /18. Host bits: 32 - 18 = 14, so 2^14 - 2 = 16,382 hosts per subnet.

### Exercise 7

Are `10.0.15.200/20` and `10.0.17.5/20` in the same subnet?

**Solution.** /20 puts the interesting octet in the third position: mask 240, block 16. Blocks: 0 to 15, 16 to 31. 15 is in the first block (network `10.0.0.0/20`) and 17 is in the second (network `10.0.16.0/20`). **No**, they are in different subnets, so they need a router to talk to each other.

### Exercise 8

`172.20.0.0/16` is divided into /22 subnets. How many subnets are there, how many hosts per subnet, and what are the network and broadcast addresses of the 10th subnet?

**Solution.** Borrowed bits: 22 - 16 = 6, so 2^6 = 64 subnets. Host bits: 10, so 2^10 - 2 = 1022 hosts.

The block size in the third octet is 256 - 252 = 4. The subnets are `172.20.0.0`, `172.20.4.0`, `172.20.8.0`... The 10th subnet has index 9, so its third octet is 9 x 4 = 36.

- 10th subnet: `172.20.36.0/22`
- Broadcast: `172.20.39.255`

### Exercise 9

Write the wildcard masks for a /19 and for `255.255.255.240`. Then write the OSPF `network` statement that matches exactly the subnet `10.4.32.0/19` in area 0.

**Solution.** The wildcard is `255.255.255.255` minus the mask, octet by octet.

- /19 is `255.255.224.0`, wildcard `0.0.31.255`
- `255.255.255.240` gives wildcard `0.0.0.15`

```text
router ospf 1
 network 10.4.32.0 0.0.31.255 area 0
```

Wildcards come back in posts 4 and 5, so it's worth being fluent with them.

### Exercise 10

Which of these can be assigned to a host?

1. `192.168.1.64/26`
2. `192.168.1.127/26`
3. `192.168.1.95/27`
4. `10.0.0.255/23`

**Solution.**

1. **No.** /26 has block 64, so 64 is the network address of `192.168.1.64/26`.
2. **No.** It's the broadcast of the same subnet (128 - 1).
3. **No.** /27 has block 32: the subnet is `.64` to `.95`, so `.95` is its broadcast.
4. **Yes.** /23 has block 2 in the third octet, so the subnet is `10.0.0.0` to `10.0.1.255`. `10.0.0.255` is in the middle of the range. This is the classic trap: an address ending in `.255` is not always a broadcast.

### Exercise 11

Summarise the networks `172.16.8.0/24` through `172.16.15.0/24` in a single route.

**Solution.** In binary, 8 is `00001000` and 15 is `00001111`. The first 5 bits of the third octet are common (`00001`), so the summary is 16 + 5 = /21: `172.16.8.0/21`. As a check: a /21 has block 8 in the third octet, and 8 is a multiple of 8, so the range 8 to 15 is exactly one block.

### Exercise 12 (VLSM)

Design a VLSM scheme from `192.168.50.0/24` for these requirements:

- Sales: 100 hosts
- Engineering: 50 hosts
- Management: 25 hosts
- Servers: 10 hosts
- Two point-to-point WAN links: 2 hosts each

**Solution.** Already sorted from largest to smallest. Smallest fitting prefix for each one:

- 100 hosts: /25 (126)
- 50 hosts: /26 (62)
- 25 hosts: /27 (30)
- 10 hosts: /28 (14)
- 2 hosts: /30 (2)

| Segment | Subnet | Usable range | Broadcast |
|---|---|---|---|
| Sales | 192.168.50.0/25 | .1 to .126 | .127 |
| Engineering | 192.168.50.128/26 | .129 to .190 | .191 |
| Management | 192.168.50.192/27 | .193 to .222 | .223 |
| Servers | 192.168.50.224/28 | .225 to .238 | .239 |
| WAN 1 | 192.168.50.240/30 | .241 to .242 | .243 |
| WAN 2 | 192.168.50.244/30 | .245 to .246 | .247 |

Free space: `192.168.50.248/29`. Each subnet starts on a multiple of its block size (128, 64, 32, 16, 4), which is what largest-first guarantees.

### Exercise 13 (VLSM)

Design a VLSM scheme from `10.10.0.0/22` for:

- Site A: 400 hosts
- Site B: 200 hosts
- Site C: 120 hosts
- Site D: 60 hosts
- Three point-to-point links

**Solution.** Prefixes: 400 needs /23 (510), 200 needs /24 (254), 120 needs /25 (126), 60 needs /26 (62), links use /30.

| Segment | Subnet | Usable range | Broadcast |
|---|---|---|---|
| Site A | 10.10.0.0/23 | 10.10.0.1 to 10.10.1.254 | 10.10.1.255 |
| Site B | 10.10.2.0/24 | 10.10.2.1 to 10.10.2.254 | 10.10.2.255 |
| Site C | 10.10.3.0/25 | 10.10.3.1 to 10.10.3.126 | 10.10.3.127 |
| Site D | 10.10.3.128/26 | 10.10.3.129 to 10.10.3.190 | 10.10.3.191 |
| Link 1 | 10.10.3.192/30 | .193 to .194 | .195 |
| Link 2 | 10.10.3.196/30 | .197 to .198 | .199 |
| Link 3 | 10.10.3.200/30 | .201 to .202 | .203 |

Free space: `10.10.3.204` to `10.10.3.255`. If I had allocated Site D first, at `10.10.0.0/26`, Site A could no longer start at `10.10.0.0/23`, which is why the order matters.

### Exercise 14

On a point-to-point link between two routers, why would I use a /31 instead of a /30?

**Solution.** A /30 has 4 addresses but only 2 usable, so half of each link's space is wasted on the network and broadcast addresses. RFC 3021 allows a /31 on point-to-point links: both addresses are usable because there's no need for a broadcast between two endpoints. Cisco IOS accepts `ip address 10.0.0.0 255.255.255.254` on such interfaces (with a warning on Ethernet). In the exam, /30 is still the default answer for "smallest subnet for a point-to-point link" unless /31 is offered or mentioned explicitly.

## What I take from this

Subnetting stopped being slow for me once I stopped thinking in binary for every address and started thinking in block sizes. The next post uses these subnets for something real: VLANs and trunks, where each VLAN gets its own subnet and a router or a Layer 3 switch routes between them.
