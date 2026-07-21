---
title: "Homelab ED50 (3/4): TicketBot, receipt digitization via Telegram"
date: 2026-07-19
description: A Telegram bot that turns the photo of a paper receipt into an archived, classified fiscal document in Paperless-ngx in about 15 seconds, built with n8n, a vision model, and the Paperless API.
tags: [homelab, n8n, telegram, paperless-ngx, automation, gemini]
project: Enterprise Network
---

> _Homelab ED50 · Entry 3 of 4 · 19 July 2026_ · IP addresses, hostnames, users, and paths are examples; this post contains no credentials, API keys, or identifiers in use.

> Paper expense receipts are the document nobody digitizes, because digitizing them costs more than ignoring them. This entry is the piece of the whole series I am most proud of. A Telegram bot that turns the photo of a receipt into an archived, classified fiscal document with its proof of payment in about 15 seconds, built with n8n, a vision model, and the Paperless API.

## TicketBot ED50: fiscal digitization of receipts via Telegram

### Goal

In a small consultancy, simplified invoices (purchase receipts) pile up on paper. Digitizing them with the document manager's scanning app required manually typing the title, date, correspondent, and type for every receipt, which is enough for nobody to do it. On top of that, accounting needs to know which card each receipt was paid with (company vs personal) and requires the card terminal slip as proof of payment, something no conventional OCR handles.

### The receipt-reading bot

Here a problem came up: every bot published on Telegram is public, meaning anyone who knows the bot's name can search for it. To solve this and prevent anyone from sending files, a whitelist of allowed users is created with each person's chat id; it is only visible from the n8n logs and from the logs of the LXC hosting the service. This way, if an unauthorized user sends a request, the bot will simply ignore it.

The user sends the bot a photo of a receipt, and then it:

1. Extracts all the data with a vision model (date, time, supplier, legal name, NIF, simplified invoice number, taxable base, VAT rate and amount, total, payment method, and the last 4 digits of the card).
2. Classifies the account automatically from the card digits (company/personal/cash), and asks with buttons when it can't.
3. Asks for the card terminal slip on card payments (with an escape button, "I don't have the slip"). It cross-checks: if the slip's digits contradict the chosen account, it warns and corrects.
4. Validates with the user through a summary with ✅/✏️ buttons and a text correction loop (`total: 13,50`).
5. Merges receipt + slip into a 2-page PDF (a PDF generator written by hand in pure JS, no dependencies); it does this exclusively in the case where a slip is available.
6. Archives into Paperless-ngx via the API: title, fiscal date, correspondent (creating it if new), document type, account and accounting-justification tags, and every amount as filterable custom fields.
7. Confirms by sending the direct Paperless link to the document.

Time per receipt for the user: ~15 seconds and zero typing. From pocket to fiscal archive, with quarterly views in Paperless separating what is justified from what is pending its proof of payment.

### Architecture

```
Telegram (authorized users)
      │  polling getUpdates every 10 s (100% outbound traffic)
      ▼
┌─────────────────────────────────┐     fire-and-forget      ┌──────────────────────────────┐
│  n8n · MAIN workflow            │ ───────────────────────▶ │  n8n · ARCHIVER workflow     │
│  (fast, always < 10 s)          │   Execute Workflow       │  (slow, 15–30 s)             │
│  · persistent offset            │                          │  · id lookups via API        │
│  · chat_id whitelist filter     │                          │  · correspondent creation    │
│  · Gemini extraction (schema)   │                          │  · 2-page PDF merge          │
│  · state machine per chat       │                          │  · multipart upload          │
│  · inline buttons and correction│                          │  · OCR task polling          │
└─────────────────────────────────┘                          │  · PATCH fields + tags       │
      │                                                      └──────────────┬───────────────┘
      ▼                                                                     ▼
  Gemini API (extraction with                                   Paperless-ngx (LXC, Docker)
  response_schema: JSON guaranteed)                             PostgreSQL · OCR · PDF/A
```

**Infrastructure**: Proxmox VE · unprivileged Debian 13 LXC (nesting) per service · Docker Compose with pinned versions · Caddy as reverse proxy with a DNS-01 wildcard certificate (IONOS API) · Tailscale for remote access · **zero open ports on the router** (hence the choice of polling over a webhook).

The tokens (Telegram, Gemini, Paperless) live as environment variables of the container, never inside the workflows; the workflow JSONs are exportable and versionable. Credential rotation practiced during the project via `/revoke`.

### Notable design decisions

**Polling instead of a webhook**: All communication is outbound. An external port scan sees the same before and after the project, that is, nothing.

**Two-workflow architecture**: The poller consolidates the offset in < 10 s and delegates the archiving (slow due to Paperless's OCR) to a sub-workflow without waiting for it. This eliminated a real race condition detected in production. Executions were overlapping, re-reading the same offset and duplicating documents.

**`response_schema` in Gemini**: The validity of the extraction JSON is guaranteed by the API's contract, not by prompt obedience. It eliminated the intermittent parsing failures at the root.

**Dependency-free PDF generator**: Instead of installing libraries in the container, a code node builds the PDF by hand. ~40 lines, zero dependency maintenance.

**The bot decides, not the machine learning**: All Paperless types and tags on the "None" algorithm; classification is always explicit (from the workflow or from the user), never learned, an important detail in a fiscal context. **State per chat**: a state machine (choosing account → waiting for slip → validating → correcting) stored in n8n's static data, indexed by chat_id. Multi-user without interference. **Data privacy**: the API's free tier only during calibration with test receipts; billing enabled before real use to exclude the fiscal data from the provider's training (real cost: < 1 €/month).

### Technical problems solved

|Problem|Diagnosis|Solution|
|---|---|---|
|Gemini was receiving the string "filesystem-v2" instead of the image|n8n with binary storage on disk: `binary.data.data` is a reference, not the content|`this.helpers.getBinaryDataBuffer()`, agnostic to the storage mode|
|Intermittently malformed extraction JSON|Unescaped quotes in model-generated values|`response_schema` + `response_mime_type` (constrained generation)|
|Duplicated messages and documents in bursts|The offset is transactional with the execution: any node failing downstream caused a replay of the entire batch; in addition, slow executions overlapped with the 10 s trigger|Poller/archiver separation with Execute Workflow in fire-and-forget mode|
|The upload to Paperless "failed" with a correct request|The endpoint returns the task UUID as plain text; the node expected JSON|Response Format: Text + normalization in code|
|Telegram buttons unresponsive|In manual n8n executions the static data does not persist (the pending state evaporated)|Testing protocol: always in Active mode from the real client|

### Evolution (versioned in n8n)

`v0.1` polling skeleton with echo → `v0.2` extraction with vision → `v0.3` validation with inline buttons and correction loop → `v0.5` full archiving into Paperless via API → `v0.6` poller/archiver split (concurrency fix) → `v0.7` slip flow with cross-check and 2-page PDF → `v1.2` (archiver) accounting-justification tags.

Each version published with a changelog in n8n's history; revert = re-import the previous version.

### Result

System in production with two users. Fully automatic dual document pipeline: invoices by email → IMAP → Paperless (typed and tagged by mail rule); receipts by Telegram → bot → Paperless (typed, classified by account, justified, and with fiscal metadata). Quarterly views by account and by justification status, ready for accounting.
