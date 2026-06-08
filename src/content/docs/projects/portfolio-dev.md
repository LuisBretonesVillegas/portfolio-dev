---
title: Building My Personal Portfolio
---

A personal portfolio site built from scratch with Astro and Starlight, designed to document projects, blog posts, and my professional profile. The design is inspired by [Maxime Haegeman's portfolio](https://maximehaegeman.com) — minimal, typographic, and warm.

## Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Astro v4+ with Starlight |
| **Styling** | Custom CSS with Starlight CSS custom properties |
| **Typography** | Playfair Display (headings), DM Sans (body), JetBrains Mono (metadata/code) |
| **Deployment** | GitHub Actions → GitHub Pages |
| **Domain** | luisbretones.dev |

## Design System

The visual identity is built around a warm cream palette with a plant green accent. No external UI libraries — every component is handwritten CSS.

### Color tokens

```css
--bg:        #f5f0e8   /* warm cream background */
--bg-card:   #ede8df   /* slightly darker for cards */
--text:      #111111   /* near-black body text */
--text-muted:#6b7280   /* secondary text */
--accent:    #1a5c00   /* plant green */
--border:    #e5e7eb   /* hairline borders */
```

### Typography scale

- **Headings:** Playfair Display 700–800, tight letter-spacing
- **Body:** DM Sans 400–600, generous line-height
- **Labels / tags / metadata:** JetBrains Mono, uppercase, tracked

## Architecture

Starlight handles routing and content rendering for individual project and blog pages. All index and custom pages (`/`, `/projects/`, `/blog/`, `/contact/`) override the Starlight routes with custom Astro pages under `src/pages/`, sharing a single `Portfolio.astro` layout.

```
src/
├── pages/
│   ├── index.astro                  ← homepage (custom)
│   ├── contact.astro                ← contact page (custom)
│   ├── projects/index.astro         ← projects listing (custom)
│   └── blog/index.astro             ← blog listing (custom)
├── layouts/
│   └── Portfolio.astro              ← shared nav + footer + global CSS
├── content/docs/
│   ├── projects/                    ← individual project pages (Starlight)
│   └── blog/                        ← individual blog posts (Starlight)
├── components/
│   ├── Footer.astro                 ← Starlight override (empty — custom footer in layout)
│   ├── SiteTitle.astro              ← Starlight override
│   └── ThemeSelect.astro            ← Starlight override (forces light mode)
└── styles/
    └── custom.css                   ← Starlight CSS custom property overrides
```

## Key Features

### Hero section

Two-column grid: text left, circular avatar right. On mobile it collapses to a single column. The avatar uses `object-fit: cover` with `object-position: center top` to keep the face centered regardless of crop.

### Skills grid

A 3×2 CSS grid where the container background acts as the divider color (`#b8b3ab`) and cells sit on a slightly lighter warm gray (`#eae6de`). Each column has a distinct accent color for its category title and tag borders.

### Certifications

Four cards in a 4-column grid — active certifications get a green top border and accent-colored acronym; planned ones use muted styling to indicate future goals.

### Navigation

Fixed, frosted-glass nav with `backdrop-filter: blur(12px)`. Three-column grid on desktop: name + subtitle left, links center, social icons right. On mobile it collapses to a single row.

### Dark mode removal

Starlight detects system preference and sets `data-theme` via JavaScript. Since this site is light-only, the `ThemeSelect` component was replaced with an empty override that injects an inline script:

```js
document.documentElement.setAttribute('data-theme', 'light');
```

This runs synchronously before paint, preventing any dark flash.

## Deployment

A GitHub Actions workflow builds the site on every push to `main` and deploys the `dist/` folder to GitHub Pages.

```yaml
jobs:
  build:
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
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/deploy-pages@v4
```

## Challenges

### Starlight version compatibility

Starlight v0.39 dropped support for `autogenerate` at the top level of a sidebar group. The correct syntax wraps it inside `items`:

```js
// ✗ Starlight < 0.39
{ label: 'Projects', autogenerate: { directory: 'projects' } }

// ✓ Starlight ≥ 0.39
{ label: 'Projects', items: [{ autogenerate: { directory: 'projects' } }] }
```

### Custom pages coexisting with Starlight

Placing a file at `src/pages/index.astro` shadows Starlight's generated route for `/`. The same applies to `/projects/` and `/blog/`. This lets the custom Portfolio layout own those routes while Starlight still handles the individual content pages.

### Skills grid dividers via CSS

Rather than using `gap` (which shows the background), the grid uses `background` on the container as the divider color and `overflow: hidden` with per-cell borders to control which edges show. The last row and last column cells have their bottom/right borders removed via `:nth-child` selectors.
