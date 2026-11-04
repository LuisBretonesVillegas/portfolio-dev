---
title: Building My Personal Portfolio
date: 2026-06-08
description: Designing and building this site from scratch with Astro and Starlight, a custom CSS design system, and GitHub Actions deployment.
tags: [astro, starlight, css, github-actions]
---

A personal portfolio site built from scratch with Astro and Starlight. This page documents the full process: design decisions, technical challenges, iteration history, and every meaningful choice made along the way. The site is live at [luisbretones.dev](https://luisbretones.dev).

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Astro 6 with Starlight 0.39 |
| **Styling** | Handwritten CSS, Starlight CSS custom properties |
| **Fonts** | Playfair Display · DM Sans · JetBrains Mono (Google Fonts) |
| **Deployment** | GitHub Actions → GitHub Pages |
| **Domain** | luisbretones.dev |

---

## Phase 1 - Foundation

### Why Astro + Starlight

The goal was a site that could serve both as a portfolio and as a place to write technical documentation for projects. Starlight (a documentation framework built on Astro) covers the content rendering side - syntax highlighting, markdown processing, sidebar navigation - while Astro's island architecture lets you layer custom pages on top without fighting the framework.

The tradeoff: Starlight is opinionated. Its default layout (sidebar + breadcrumbs + "Edit this page" links) is designed for docs, not portfolios. Most of the work in this project was learning where to override it and where to stay out of its way.

### Project structure

```
src/
├── pages/                 ← custom routes that shadow Starlight
│   ├── index.astro
│   ├── about.astro
│   ├── contact.astro
│   ├── cv.astro
│   ├── rss.astro          ← how to follow the blog
│   ├── rss.xml.ts         ← hand-rolled RSS 2.0 feed
│   ├── 404.astro
│   ├── projects/index.astro
│   ├── learning/index.astro
│   └── blog/index.astro
├── layouts/
│   └── Portfolio.astro    ← shared nav, footer, design tokens, global CSS
├── content/docs/
│   ├── projects/          ← individual project pages (Starlight)
│   ├── learning/          ← course trackers (Starlight MDX)
│   └── blog/              ← blog posts (Starlight)
├── components/
│   ├── Footer.astro       ← Starlight component overrides
│   ├── SiteTitle.astro
│   ├── ThemeSelect.astro
│   ├── EntryList.astro    ← shared listing for /projects/ and /learning/
│   └── JavaProgress.astro ← progress grid + devlog for the course trackers
├── lib/
│   └── entries.ts         ← sorting, URLs and date labels shared by the landing pages
├── scripts/
│   └── progressUpdated.js ← "last updated" date from the tracker repo's latest commit
└── styles/
    └── custom.css         ← Starlight CSS custom property overrides
```

The key insight: placing a file at `src/pages/index.astro` shadows Starlight's generated `/` route. The same applies to `/projects/`, `/learning/` and `/blog/`. This means the custom `Portfolio.astro` layout owns those landing pages while Starlight still handles individual content pages at `/projects/some-project/`, `/learning/some-course/` and `/blog/some-post/`. The 404 page works the same way: Starlight's own 404 route is disabled with `disable404Route: true` and `src/pages/404.astro` uses the portfolio layout.

---

## Phase 2 - Design System

### Visual reference

The design is directly inspired by [Maxime Haegeman's portfolio](https://maximehaegeman.com) - a minimal, typographic site with a warm cream background, a muted color palette, and clean section separators. The goal was to replicate that aesthetic with my own content, not copy it verbatim.

Key patterns taken from that reference:
- Warm off-white background (not pure white, not gray)
- A single strong accent color used sparingly
- JetBrains Mono for all metadata, tags, and section labels
- Serif font for headings to contrast with the sans-serif body
- No borders on cards - instead, subtle background differences
- Thin `1px` hairline separators between sections

### Color palette

The palette went through several iterations. The green started as a generic `#2d6a4f`, moved through a few shades, and settled at `#1a5c00` after identifying the exact value from Maxime's site using browser dev tools. It reads as "plant green" - dark enough to be legible on the cream background at small sizes, saturated enough to feel intentional.

```css
:root {
  --bg:         #f5f0e8;   /* warm cream - the canvas for everything */
  --bg-card:    #ede8df;   /* slightly darker for elevated surfaces */
  --text:       #111111;   /* near-black, not pure black */
  --text-muted: #6b7280;   /* secondary text, labels, descriptions */
  --accent:     #1a5c00;   /* plant green - used for links, tags, borders */
  --border:     #e5e7eb;   /* hairline separators */
}
```

These are applied as CSS custom properties on `:root` in `Portfolio.astro` for custom pages (together with a few extra tokens for the hover state and the skills grid, so no page hardcodes a color), and mirrored as Starlight CSS custom properties in `custom.css` for Starlight-rendered pages:

```css
/* custom.css - maps portfolio tokens to Starlight's own variables */
:root[data-theme='light'],
:root[data-theme='dark'] {
  --sl-color-bg:          #f5f0e8;
  --sl-color-accent:      #1a5c00;
  --sl-color-text:        #111111;
  /* ... */
}
```

Overriding both `light` and `dark` selectors with identical values is how dark mode is disabled - see Phase 5.

### Typography

Three fonts, each with a distinct role:

**Playfair Display** - headings only. Serif, high contrast, elegant. Used for `h1`, `h2`, and the card and post titles on the landing pages. Contrast with the sans-serif body makes section titles land with weight without needing large font sizes.

**DM Sans** - body text. A geometric humanist sans-serif that stays readable at small sizes. Used for all prose, descriptions, nav links, and body copy.

**JetBrains Mono** - metadata and labels. Used for section titles (`SKILLS // CURRENT STACK`), tags (`arch-linux`), dates, the nav subtitle (`ALMERÍA`), and the buttons. The monospace rhythm gives those elements a technical, terminal-like feel that matches the networking/infrastructure content.

```css
/* Portfolio.astro loads all three with a <link> to Google Fonts.
   custom.css imports DM Sans and JetBrains Mono for the Starlight pages: */
@import url('...DM+Sans...JetBrains+Mono...');

--sl-font:      'DM Sans', sans-serif;
--sl-font-mono: 'JetBrains Mono', monospace;
```

---

## Phase 3 - Page by Page

### Homepage

The homepage is the most complex page. It has five sections:

**Hero** - two-column grid: text on the left, circular photo on the right. The photo uses `border-radius: 50%`, `object-fit: cover`, and `object-position: center top` to keep the face in frame regardless of crop. Desktop avatar: 280px. The hero padding (`5rem 0 4rem`) gives it room to breathe before the first section separator. Two buttons sit under the tagline: Projects and CV.

```css
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3rem;
  align-items: start;
  padding: 5rem 0 4rem;
}
.avatar {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center top;
}
```

**Skills grid** - a 3×2 CSS grid showing six skill categories with color-coded tags. The visual trick: the grid container's `background` is set to the desired divider color (`--grid-line`), and `overflow: hidden` clips the cells to the container. Each cell has its own background (`--bg-cell`) and borders on the right and bottom edges. The container background becomes visible between cells - acting as the divider - without any extra markup.

```css
.skill-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--grid-line);      /* this is the divider color */
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  overflow: hidden;
}
.skill-cell {
  background: var(--bg-cell);        /* cell background, slightly lighter */
  border-right: 1px solid var(--grid-line);
  border-bottom: 1px solid var(--grid-line);
  padding: 1.25rem 1.1rem;
}
/* remove borders on last column and last row */
.skill-cell:nth-child(3n)       { border-right: none; }
.skill-cell:nth-last-child(-n+3) { border-bottom: none; }
```

Each category has a color class (`.c-green`, `.c-blue`, `.c-orange`, `.c-purple`, `.c-teal`, `.c-muted`) that sets the title and tag border/text colors.

**Certifications** - originally four cards in a 4-column grid, where active certifications got a 3px green top bar via `::before` pseudo-element and a green acronym, and planned ones used muted styling. It is now a simple roadmap list where each row shows its status, name, and target exam date: the Terraform Associate, CCNA and Kubernetes certification in progress, with the AWS Solutions Architect Associate planned.

The original card style, for reference:

```css
.cert-card.active::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--accent);
}
```

**Featured projects** - two cards in a 2-column grid, picked by slug in a `FEATURED` list at the top of `index.astro`. Each card shows the project's start date (plus an "Updated" date taken from its latest blog write-up or, for tracked courses, from the repo's latest commit), title, description, a short list of measurable results from the `results` frontmatter field, and tags. It replaced an earlier terminal-style "repo feed".

**Explore** - two cards linking to the Blog and Learning sections.

### Projects page

The projects listing (`/projects/`) was redesigned from a terminal-style repo feed to a more intuitive list, sorted by start date (most recent first). Each entry has:
- The start date, plus the date of the latest related blog post
- A Playfair Display title
- A one-line description
- The `results` list, when the project has one
- Tag pills in green
- A "View project →" link whose arrow slides right on hover

The original design used `~/project-name` monospace names and `view_source →` text - visually interesting but not immediately recognizable as clickable project cards.

### Learning page

Same layout as projects, with "View log →" as the CTA. Each course tracker page reads a `progress.json` from its own repo, so the progress grid and devlog update by themselves whenever I push progress.

### Blog page

Same visual language as projects, with "Read post →" as the CTA. Posts that share a `project:` frontmatter field are grouped under that project (linking to its page), and groups and standalone posts are interleaved by date. The Blog sidebar in `astro.config.mjs` is built the same way, since Starlight's `autogenerate` can only sort alphabetically.

### Contact page

Simple list of contact methods: email, GitHub, LinkedIn. No form. Each row shows an icon and the platform name on the left, the handle in the middle, and an arrow on the right. It is linked from the footer rather than the nav.

### About, CV and RSS pages

About covers who I am, education, experience, and skills. The CV page embeds the PDF with download and open buttons (on phones the embed is hidden, because mobile browsers don't render PDFs inline reliably). The RSS page explains how to follow the blog and has a button that copies the feed URL.

---

## Phase 4 - Navigation

### Desktop

Fixed, frosted-glass navbar with `backdrop-filter: blur(12px)`. Three-column grid inside a `max-width: 860px` wrapper:

```
[Luis Bretones / ALMERÍA]   [Home  Projects  Learning  Blog  About  CV]   [GitHub  LinkedIn]
```

The `1fr auto 1fr` column layout keeps the center links truly centered regardless of the left/right content widths. The `max-width` wrapper aligns the nav with the page content.

```css
.nav-inner {
  max-width: 860px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
```

### Mobile

At 768px and below the nav switches to `display: flex; justify-content: space-between`: the name and subtitle are hidden, and the six links (smaller font) sit next to the GitHub and LinkedIn icons. At 480px and below the icons are hidden too and the links are centered, because six links and two icons don't fit on a phone; the footer still carries GitHub and LinkedIn. This replaced an earlier two-row approach that felt too tall.

### Footer

The same footer appears on both kinds of page: `Portfolio.astro` renders it on the custom pages, and the `Footer.astro` override renders it on Starlight pages. It shows the year and links to Contact, RSS, GitHub and LinkedIn.

---

## Phase 5 - Dark Mode Removal

Starlight ships with a light/dark theme toggle that reads `localStorage` and `prefers-color-scheme` on load. Since this site is light-only, three things needed to happen:

**1. Override the ThemeSelect component** - replace Starlight's built-in toggle with an empty component registered in `astro.config.mjs`:

```js
components: {
  ThemeSelect: './src/components/ThemeSelect.astro',
}
```

**2. Force light mode on every Starlight page** - the ThemeSelect override injects an inline script that runs synchronously before the browser paints:

```astro
<!-- src/components/ThemeSelect.astro -->
<script is:inline>
  document.documentElement.setAttribute('data-theme', 'light');
</script>
```

`is:inline` prevents Astro from deferring the script, ensuring there is no dark flash on page load even if the user's system is set to dark mode.

**3. Map dark theme CSS variables to light values** - as a safety net, `custom.css` overrides both `[data-theme='light']` and `[data-theme='dark']` with the same cream palette.

---

## Phase 6 - Deployment

### GitHub Actions workflow

Every push to `main` triggers a build and deploy. Node 22 is used to match the local development environment.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Domain

The custom domain `luisbretones.dev` points to GitHub Pages via a `CNAME` record. Configured in the GitHub repository settings under Pages → Custom domain.

---

## Bugs and Compatibility Issues

### Starlight v0.39 sidebar breaking change

After upgrading, the build failed with:

```
[AstroUserError] Invalid config passed to starlight integration
Hint: Found an `autogenerate` object with a `label`.
Support for autogenerated sidebar groups was removed in Starlight v0.39.0.
```

The fix was to wrap `autogenerate` inside an `items` array:

```js
// before
{ label: 'Projects', autogenerate: { directory: 'projects' } }

// after
{ label: 'Projects', items: [{ autogenerate: { directory: 'projects' } }] }
```

### `defaultTheme` not recognized

Attempted to use `defaultTheme: 'light'` in the Starlight config - this key does not exist in this version. The build failed with `Unrecognized key: "defaultTheme"`. Removed it and handled light mode purely via CSS and the ThemeSelect script override.

### Windows HMR temp file errors

During development on Windows, the Astro dev server occasionally logged:

```
ENOENT: no such file or directory, stat '...index.astro.tmp...'
```

This is a Windows-specific transient error from Astro's Hot Module Replacement watching `.tmp` files created and immediately deleted by the editor. Not a code issue - resolved by restarting the dev server when it occurred.

### Edit tool string matching failures

When editing CSS blocks with multiple similar declarations, the `old_string` in an edit operation needs to be unique in the file. Duplicate or near-duplicate CSS properties caused edit failures. Fixed by always reading the file first, then targeting a sufficiently large block of surrounding context to ensure uniqueness.

---

## Mobile Responsive Design

The site has two breakpoints: `max-width: 768px` for tablets and phones, and `max-width: 480px` for narrow phones.

**Hero:** Collapses to a single column, with a reduced avatar (88px) above the text and compressed padding.

**Skills grid:** Drops from 3 columns to 2. The `:nth-child` border selectors are overridden to account for the new column count.

**Featured projects and results:** The featured grid and each card's results list drop from 2 columns to 1.

**Cert roadmap:** Each row keeps the status and name side by side, and the target date moves under the name.

**CV:** The PDF embed is hidden; the download and open buttons remain.

**Nav:** Switches from a 3-column grid to a single-row flexbox at 768px, and drops the icons at 480px (see Phase 4).

---

## What I Would Do Differently

- **Start with the custom layout from day one.** Using Starlight's default layout for early pages (contact, about) meant migrating them to the custom Portfolio layout later, which created inconsistencies.
- **Use a single `src/pages/` file per route from the start.** Mixing Starlight content routes with custom page routes works, but requires understanding the override precedence rules upfront.
- **Version-lock Starlight.** The `v0.39` breaking change cost time during an active development session. Pinning the version in `package.json` and upgrading deliberately would have been cleaner.
