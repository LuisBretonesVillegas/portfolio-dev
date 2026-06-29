# portfolio-dev

Personal portfolio and developer log of **Luis Bretones**, a Computer Engineering student at UAL focused on networking and cloud infrastructure. It's where I document the projects I build and the things I learn along the way.

**Live site:** [luisbretones.dev](https://luisbretones.dev/)

## Tech stack

- [Astro](https://astro.build/) as the framework
- [Starlight](https://starlight.astro.build/) for the content layer and theming
- Custom CSS layered on top of Starlight's design tokens
- Deployed to GitHub Pages via GitHub Actions on every push to `main`

## Project structure

```
.
├── public/              # Static assets and CNAME
├── src/
│   ├── assets/          # Images
│   ├── components/      # Component overrides and widgets
│   ├── content/docs/    # All site content
│   │   ├── projects/    # One page per project
│   │   ├── blog/        # Dev log, auto-sorted by date
│   │   ├── about.md
│   │   └── index.mdx    # Home / hero
│   └── styles/          # Custom CSS
├── astro.config.mjs     # Astro + Starlight config (sidebar, theming, site URL)
└── package.json
```

Content lives in `src/content/docs/` as `.md` and `.mdx` files. Each file becomes a route based on its name.

## Local development

All commands run from the project root:

| Command           | Action                                          |
| :---------------- | :---------------------------------------------- |
| `npm install`     | Install dependencies                            |
| `npm run dev`     | Start the local dev server at `localhost:4321`  |
| `npm run build`   | Build the production site to `./dist/`          |
| `npm run preview` | Preview the production build locally            |

## Sections

- **Home:** what I do, plus skills and certifications in progress
- **Projects:** write-ups of the things I've built
- **Blog:** a running log of builds and things I learn, newest first
- **About / Contact:** background and how to reach me

## License

Content and code © Luis Bretones. Feel free to take inspiration from the structure.
