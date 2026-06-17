---
title: Moving from Arch to Debian - dual-booting with Windows 11
date: 2026-06-17
description: Why the Atomic Arch AUR supply chain attack pushed me to finally make the switch to Debian, and how I set up a clean dual-boot from scratch.
tags: [debian, arch-linux, dual-boot, linux, security]
---

I've been running Arch on my main machine for the better part of a year. I liked it - rolling release, AUR for everything, felt like I actually understood what was on my system. But a couple of weeks ago two things lined up that made me decide it was time to move on: I wanted real hands-on time with Debian (since thats what most of the infrastructure I'll end up working on actually runs), and then the Atomic Arch thing happened.

## What the Atomic Arch campaign was

On June 11th, security researchers started flagging something weird with AUR packages. Over the following days it became clear this was a coordinated supply chain attack - now being called the **Atomic Arch campaign** - that had been in progress since at least December 2025.

The attack was actually pretty clever. The AUR has a concept of "orphaned" packages: packages whose original maintainer stopped maintaining them. Anyone can adopt them through a normal request process. The attackers did exactly that, systematically claiming hundreds of abandoned packages, then quietly modifying their `PKGBUILD` scripts to pull in two malicious npm packages: `atomic-lockfile` and `js-digest`.

Once installed, those packages dropped an **eBPF rootkit** and a credential harvester onto the system. The rootkit hid its processes by making them look like legitimate kernel threads, so tools like `ps` or `htop` wouldn't show anything suspicious. The harvester went after SSH private keys, cloud credentials, container tokens, and messaging session data.

By the time it was fully documented, somewhere between 400 and 1,500 packages were affected - numbers varied depending on the source. On June 15th the AUR maintainers disabled new account registrations to slow down the cleanup.

The thing is, this isnt even the first time something like this has happened on AUR. The repository has always been community-maintained and unreviewed by design - you're supposed to inspect PKGBUILDs before installing. In practice, nobody does that for every update of every package. I definitely didn't. That's the tradeoff you make, and for a while I was fine with it. But when you're dealing with credentials and SSH keys for actual projects, the risk/reward starts looking different.

So: Debian 13. More stable, packages are reviewed, and it forces me to actually learn the ecosystem.

## The plan

I'm doing a full clean install on my Dell Precision 3580, dual-booting with Windows 11. The disk is around 465 GiB so I'm splitting it roughly 50/50.

### Phase 1 - Backing everything up

Before touching anything I prepared a USB with **Ventoy** (the tool that lets you boot multiple ISOs from a single drive, if you haven't used it - it's great). Copied both the Windows 11 and Debian 13 netinst ISOs onto it.

Then I backed up my user environment:

```bash
tar -czvf dotfiles.tar.gz ~/.bashrc ~/.gitconfig ~/.ssh/ ~/projects/ ~/captures/
```

Excluded anything X-related since I'm rebuilding the graphical setup anyway. Copied the archive to the Ventoy USB root along with a browser bookmarks export.

### Phase 2 - BIOS

On the Precision 3580 I had to change two things:

- **Storage > SATA/NVMe Operation** → set to AHCI/NVMe (was in some Intel RAID mode by default)
- **Secure Boot** → disabled

Both required a reboot to take effect. Nothing dramatic.

### Phase 3 - Windows 11

Booted from Ventoy, selected the Windows ISO, wiped all partitions, and created a new primary partition using exactly half the available space (~232 GiB). Installed Windows there.

Two things to do right after installation before touching Debian:

1. **Disable Fast Startup** - this is critical. If Windows hibernates instead of fully shutting down it locks the EFI partition and Debian can't write to it properly. It's in Control Panel > Power Options > "Choose what the power buttons do".
2. **Verify BitLocker is off** - if BitLocker is active on the system drive it will break after you modify the boot configuration. Check it in the BitLocker Drive Encryption settings.

### Phase 4 - Debian 13 and EFI isolation

Booted back into Ventoy, selected the Debian 13 netinst ISO, and chose manual partitioning on the remaining free space.

The partition layout I used:

| Mount | Size | Type |
|-------|------|------|
| EFI System Partition | 512 MB | ESP, boot flag |
| `/` | rest | ext4 |

The important part here: the existing Windows EFI partition must be marked **"do not use"**. If you let Debian's installer write to it, you risk breaking the Windows bootloader. Creating a separate ESP for Debian keeps both systems completely isolated at the firmware level.

For the software selection in tasksel I only checked: Debian desktop environment, GNOME, and standard system utilities.

### Phase 5 - NVIDIA drivers and GRUB dual-boot

This was the part I was most worried about. The Precision 3580 has an NVIDIA RTX A500 and Debian's default repos don't include the proprietary driver. First thing after login:

```bash
# Add non-free repos
sudo nano /etc/apt/sources.list
# append: contrib non-free non-free-firmware to the existing lines

sudo apt update
sudo apt install nvidia-driver firmware-misc-nonfree linux-headers-amd64
```

Then to make GRUB detect Windows:

```bash
sudo apt install os-prober
sudo nano /etc/default/grub
# uncomment or add: GRUB_DISABLE_OS_PROBER=false
sudo update-grub
```

Reboot, and the GRUB menu showed both Debian and Windows 11. That part actually worked first try, which was a nice change.

### Phase 6 - Restoring the environment

Mounted the Ventoy USB, extracted the backup, and moved everything back to where it belonged. Then went through the software list:

- **Vesktop** via Flatpak - Discord client without telemetry
- **OnlyOffice Desktop** - `.deb` from their site, handles `.docx`/`.xlsx` fine
- **OneDrive** - `sudo apt install onedrive` for the daemon, OneDriveGUI as a frontend
- **KVM/QEMU** - `sudo apt install qemu-kvm libvirt-daemon-system virt-manager`, replaces VMware
- **Wireshark** + Cisco Packet Tracer - needed for the networking projects
- **VS Code** + **JetBrains Toolbox** - dev tooling
- **Obsidian** + **Anki** - Flatpak for both

Git setup:

```bash
sudo apt install git build-essential
git config --global user.name "Luis Bretones"
git config --global user.email "lbretonesvillegas@gmail.com"
```

## Where I'm at now

The machine's been running for a few days, everything stable so far. NVIDIA drivers work, dual boot works, dotfiles restored, projects compiling. The Debian package ecosystem feels slower than rolling Arch but honestly right now that feels more like a feature than a bug.

The AUR incident didn't directly hit me as far as I know - I haven't found any of the compromised packages in my install history. But it was a good reminder that "it probably won't happen to me" isn't a security model.

---

Sources on the Atomic Arch campaign:
- [Arch Linux's AUR Sees More Than 400 Packages Compromised With Malware - Phoronix](https://www.phoronix.com/news/Arch-Linux-AUR-400-Compromised)
- [Over 400 Arch Linux packages compromised to push rootkit, infostealer - BleepingComputer](https://www.bleepingcomputer.com/news/security/over-400-arch-linux-packages-compromised-to-push-rootkit-infostealer/)
- [Atomic Arch Supply Chain Attack Hits 1,500 AUR Packages - SecurityWeek](https://www.securityweek.com/atomic-arch-supply-chain-attack-hits-1500-aur-packages/)
