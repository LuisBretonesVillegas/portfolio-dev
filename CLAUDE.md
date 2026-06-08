# CLAUDE.md — Instrucciones para el agente

## Proyecto
Portfolio personal construido con **Astro + Starlight**.
Starlight es un tema/framework de documentación sobre Astro — NO es un sitio Astro genérico.
Toda la configuración central está en `astro.config.mjs` bajo el plugin `starlight({...})`.

## Reglas generales
- Write everything in English. Professional but approachable tone, first person.
- Do NOT translate or mix languages. If I give you content in Spanish, translate it
  to English before putting it in any file.
- Exception: do not change configuration keys, file names, or code comments
  unless I explicitly ask.
- Antes de tocar cualquier archivo, lee su contenido completo.
- Nunca elimines ni sobreescribas configuración existente sin confirmación explícita.
- Si no estás seguro de cómo hace algo Starlight, consulta la doc oficial:
  https://starlight.astro.build/reference/configuration/
- No inventes props ni opciones de configuración: Starlight tiene una API fija.

## Stack y estructura del proyecto
- Framework: Astro v4+ con integración Starlight
- Estilos: CSS custom en `src/styles/custom.css` (referenciado en `customCss` en astro.config.mjs)
- Contenido: archivos `.md` / `.mdx` en `src/content/docs/`
- Componentes override: en `src/components/` (registrados en `starlight({ components: {...} })`)
- Assets: en `src/assets/` (imágenes) y `public/` (estáticos)

## Convenciones de Starlight que DEBES respetar
1. **Frontmatter obligatorio**: todo `.md` en `src/content/docs/` necesita al menos `title:`.
2. **Sidebar**: se configura en `astro.config.mjs`, NO con archivos de configuración separados.
3. **Overrides de componentes**: solo se pueden sobreescribir los componentes listados en la doc.
   No crees componentes custom y los pongas en la sidebar directamente.
4. **i18n**: si hay carpetas de idioma (`es/`, `en/`), respétala. No muevas archivos entre carpetas de idioma.
5. **`src/content/config.ts`**: no lo modifiques salvo que sea estrictamente necesario.
6. **CSS custom**: añade estilos en `src/styles/custom.css`. Usa las custom properties de Starlight
   (`--sl-color-*`, `--sl-font-*`) para theming, no hardcodees colores.

## Mis datos personales (úsalos cuando corresponda)
- Nombre: [Luis Bretones]
- Profesión: [Computer engineering student]
- Email: [lbretonesvillegas@gmail.com]
- GitHub: [LuisBretonesVillegas]
- LinkedIn: [https://www.linkedin.com/in/luis-bretones-villegas-02b103315/]
- Descripción corta: "[Computer Engineering student at UAL. This is where I document what I build and learn.]"

## Secciones del portfolio que quiero tener
- **Home** (`src/content/docs/index.mdx`): hero page
- **Projects** (`src/content/docs/projects/`): one .md per project
- **About** (`src/content/docs/about.md`)
- **Contact** (`src/content/docs/contact.md`)

### Antes de empezar cualquier tarea
- Lee este CLAUDE.md completo.
- Lee los archivos que vas a modificar antes de tocarlos.
- Si la tarea es ambigua, pregunta UNA sola cosa concreta antes de empezar,
  no una lista de preguntas.

### Durante la tarea
- Haz UNA cosa a la vez. No encadenes cambios en múltiples archivos
  sin mostrarme el resultado intermedio.
- Si encuentras algo roto o mejorable que no te pedí, coméntalo
  pero NO lo toques sin que yo lo apruebe.
- Si algo no funciona después de 2 intentos, para y explícame
  qué está pasando en lugar de seguir probando cosas.

## Tareas pendientes / contexto actual
<!-- Actualiza esta sección antes de cada sesión de trabajo -->
## Tareas pendientes / contexto actual
<!-- Actualiza esta sección antes de cada sesión de trabajo -->
- [x] Change the hero text: title 'Luis Bretones', subtitle '[your real professional tagline]', and make the 'See my project' button link to /projects. Keep everything in English.
- [x] Fill in the About section with this text: [Fill in the About section with this exact text, do not change or invent anything:

Computer Engineering student based in Spain, focused on networking and cloud infrastructure.
I'm currently working toward my AWS Cloud Practitioner and CCNA certifications, with plans
to continue with the AWS Solutions Architect Associate and CCNP to deepen my expertise in
both cloud and enterprise networking. C1 English level. This site is where I document what
I build and learn along the way.]. Do not invent anything. Keep everything in English.
- [x] Create the page src/content/docs/projects/index.md with a list of my projects. For now just titles and one sentence each: [Protocol Analysis of Wireless Audio Transceivers]. Keep everything in English.
- [x] Create an individual .md page for each project under src/content/docs/projects/[project-name].md with its content. Keep everything in English.
- [x] Configure the sidebar in astro.config.mjs with these sections: Home, Projects, About, Contact. Each linking to its corresponding page. Keep everything in English.
- [x] Create the page about.md with my professional background. Sections: Who I am / Experience / Skills / Education. Content: [describe it]. Keep everything in English.
- [x] Create the page contact.md with my email, LinkedIn and GitHub. No form for now. Keep everything in English.
- [x] Change the theme accent color to [hex code or color description]. Edit only src/styles/custom.css using Starlight's custom properties (--sl-color-*). Do not hardcode colors anywhere else.
- [x] Change the heading font to [Google Font name]. Import it in custom.css and apply it to --sl-font. Do not touch any other files.
- [ ] Add a footer with my name, current year, and links to GitHub and LinkedIn. Use a Starlight component override if needed. Keep everything in English.
- [ ] Check that all internal sidebar links and buttons work correctly. List any that are broken and fix them one by one, showing me each fix before moving to the next.
- [ ] Remove from the sidebar any example or placeholder pages created by Starlight by default. Do not delete actual content pages.

## Lo que NO quiero que hagas
- No cambies el idioma del contenido a español, todo en inglés.
- No instales dependencias adicionales sin preguntarme.
- No toques `package.json` ni `package-lock.json` salvo que yo lo pida.
- No uses Tailwind si no está ya instalado.
- No modifiques la estructura de carpetas de `src/content/docs/` sin consultarme.