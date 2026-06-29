---
title: "Moving from Arch to Debian: dual-booting with Windows 11"
date: 2026-06-17
description: Why the Atomic Arch AUR supply chain attack finally pushed me onto Debian, and how I set up a clean dual-boot from scratch.
tags: [debian, arch-linux, dual-boot, linux, security]
---

I'd been running Arch on my main machine for the better part of a year and I genuinely liked it. Rolling release, AUR for basically everything, that feeling of actually knowing what was on my system. But a couple of weeks ago two things lined up and I decided it was time to move on. One, I wanted real hands-on time with Debian, since that's what most of the infrastructure I'll end up working on actually runs. Two, the Atomic Arch thing happened.

## What the Atomic Arch campaign was

On June 11th security researchers started flagging something weird going on with AUR packages. Over the next few days it became clear this was a coordinated supply chain attack, now being called the **Atomic Arch campaign**, and that it had been quietly running since at least December 2025.

The attack was actually pretty clever. The AUR has this concept of "orphaned" packages, ones whose original maintainer walked away. Anyone can adopt them through a normal request process. So that's exactly what the attackers did. They systematically claimed hundreds of abandoned packages and then quietly tweaked their `PKGBUILD` scripts to pull in two malicious npm packages, `atomic-lockfile` and `js-digest`.

Once installed, those dropped an **eBPF rootkit** and a credential harvester onto the system. The rootkit hid its own processes by dressing them up as legitimate kernel threads, so tools like `ps` or `htop` wouldn't show you anything out of place. The harvester went after the good stuff: SSH private keys, cloud credentials, container tokens, messaging session data.

By the time it was all documented, somewhere between 400 and 1,500 packages were affected, depending on which source you trust. On June 15th the AUR maintainers disabled new account registrations to slow the cleanup down.

And here's the thing, this isn't even the first time something like this has hit the AUR. The repo has always been community-maintained and unreviewed by design. You're supposed to read the PKGBUILD before you install anything. In practice nobody does that for every update of every package. I definitely didn't. That's the tradeoff you sign up for, and for a while I was fine with it. But once you're dealing with credentials and SSH keys for actual projects, the risk and the reward start to look pretty different.

So, Debian 13. More stable, packages get reviewed, and it forces me to actually learn the ecosystem.

## The plan

I'm doing a full clean install on my Dell Precision 3580, dual-booting with Windows 11. The disk is around 465 GiB so I split it roughly in half.

### Phase 1: backing everything up

Before touching anything I built a USB with **Ventoy** (the tool that lets you boot a whole pile of ISOs off a single drive, and if you haven't used it, it's great). Dropped both the Windows 11 and the Debian 13 netinst ISOs onto it.

Then I backed up my user environment:

```bash
tar -czvf dotfiles.tar.gz ~/.bashrc ~/.gitconfig ~/.ssh/ ~/projects/ ~/captures/
```

I left out anything X-related since I'm rebuilding the graphical setup from scratch anyway. Copied the archive to the root of the Ventoy USB along with a browser bookmarks export.

### Phase 2: BIOS

On the Precision 3580 I had to change two things:

- **Storage > SATA/NVMe Operation** → set to AHCI/NVMe (it shipped in some Intel RAID mode)
- **Secure Boot** → disabled

Both needed a reboot to take. Nothing dramatic.

### Phase 3: Windows 11

Booted from Ventoy, picked the Windows ISO, wiped the partitions, and made a new primary partition using exactly half the space (about 232 GiB). Installed Windows there.

Two things to sort out right after install, before you go anywhere near Debian:

1. **Disable Fast Startup.** This one's critical. If Windows hibernates instead of properly shutting down, it locks the EFI partition and Debian can't write to it cleanly. You'll find it under Control Panel > Power Options > "Choose what the power buttons do".
2. **Check that BitLocker is off.** If it's active on the system drive it'll break the moment you touch the boot configuration. It's in the BitLocker Drive Encryption settings.

### Phase 4: Debian 13 and EFI isolation

Back into Ventoy, picked the Debian 13 netinst ISO, and went with manual partitioning on the free space that was left.

The layout I used:

| Mount | Size | Type |
|-------|------|------|
| EFI System Partition | 512 MB | ESP, boot flag |
| `/` | rest | ext4 |

The important bit here is that the existing Windows EFI partition has to be marked **"do not use"**. If you let Debian's installer write to it, you're basically asking to break the Windows bootloader. Giving Debian its own separate ESP keeps both systems completely isolated down at the firmware level.

For the tasksel software selection I only ticked Debian desktop environment, GNOME, and standard system utilities.

### Phase 5: NVIDIA drivers and GRUB dual-boot

This was the part I was most nervous about. The Precision 3580 has an NVIDIA RTX A500 and Debian's default repos don't ship the proprietary driver. First thing after logging in:

```bash
# Add non-free repos
sudo nano /etc/apt/sources.list
# append: contrib non-free non-free-firmware to the existing lines

sudo apt update
sudo apt install nvidia-driver firmware-misc-nonfree linux-headers-amd64
```

Then to get GRUB to actually see Windows:

```bash
sudo apt install os-prober
sudo nano /etc/default/grub
# uncomment or add: GRUB_DISABLE_OS_PROBER=false
sudo update-grub
```

Reboot, and the GRUB menu showed both Debian and Windows 11. That one worked first try, which made a nice change.

### Phase 6: restoring the environment

Mounted the Ventoy USB, pulled the backup out, and put everything back where it belonged. Then worked through the software list:

- **Vesktop** via Flatpak, a Discord client without the telemetry
- **OnlyOffice Desktop**, the `.deb` from their site, handles `.docx` and `.xlsx` fine
- **OneDrive**, `sudo apt install onedrive` for the daemon plus OneDriveGUI as a frontend
- **KVM/QEMU**, `sudo apt install qemu-kvm libvirt-daemon-system virt-manager`, my VMware replacement
- **Wireshark** and Cisco Packet Tracer for the networking projects
- **VS Code** and **JetBrains Toolbox** for dev tooling
- **Obsidian** and **Anki**, Flatpak for both

Git setup:

```bash
sudo apt install git build-essential
git config --global user.name "Luis Bretones"
git config --global user.email "lbretonesvillegas@gmail.com"
```

## Where I'm at now

The machine's been running for a few days now and everything's stable so far. NVIDIA drivers work, dual boot works, dotfiles are restored, projects compile. The Debian package ecosystem feels slower than rolling Arch, but honestly right now that feels more like a feature than a bug.

As far as I can tell the AUR incident didn't actually hit me. I went digging through my install history and none of the compromised packages were there. Still, it was a solid reminder that "it probably won't happen to me" isn't a security model.

---

Sources on the Atomic Arch campaign:
- [Arch Linux's AUR Sees More Than 400 Packages Compromised With Malware - Phoronix](https://www.phoronix.com/news/Arch-Linux-AUR-400-Compromised)
- [Over 400 Arch Linux packages compromised to push rootkit, infostealer - BleepingComputer](https://www.bleepingcomputer.com/news/security/over-400-arch-linux-packages-compromised-to-push-rootkit-infostealer/)
- [Atomic Arch Supply Chain Attack Hits 1,500 AUR Packages - SecurityWeek](https://www.securityweek.com/atomic-arch-supply-chain-attack-hits-1500-aur-packages/)
