---
title: Getting started with usbmon on Arch Linux
date: 2026-06-08
description: Setting up Wireshark and usbmon to capture USB traffic on Arch Linux without running as root.
tags: [arch-linux, usb, wireshark]
---

While I was poking at the protocol analysis of a Corsair wireless audio dongle, I needed to capture raw USB traffic on Arch Linux with Wireshark, and I really didn't want to run the whole thing as root just to do it. Here's the setup that ended up working.

## Load the usbmon kernel module

```bash
sudo modprobe usbmon
```

To persist it across reboots:

```bash
echo "usbmon" | sudo tee /etc/modules-load.d/usbmon.conf
```

## Set permissions with a udev rule

By default the `/dev/usbmon*` nodes are only readable by root. Create a udev rule to hand them to the `wireshark` group:

```bash
sudo nano /etc/udev/rules.d/99-usbmon.rules
```

Add this line:

```
SUBSYSTEM=="usbmon", GROUP="wireshark", MODE="0640"
```

Reload and apply immediately:

```bash
sudo udevadm control --reload-rules && sudo udevadm trigger
```

## Add your user to the wireshark group

```bash
sudo usermod -aG wireshark $USER
```

Log out and back in for the group change to take effect.

## Find which bus your device is on

```bash
lsusb
# Bus 002 Device 003: ID 1b1c:1b3c Corsair ...
```

The bus number maps directly to the capture interface: Bus 002 uses `usbmon2`.

## Start capturing

Open Wireshark as a normal user, pick `usbmon2` (or whichever bus your device landed on), and start the capture. That's it, no sudo in sight.

---

This setup is part of the [Protocol Analysis of Wireless Audio Transceivers](/projects/protocol-analysis-wireless-audio-transceivers/) project.
