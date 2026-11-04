// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import starlight from '@astrojs/starlight';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Build the Blog sidebar manually so it mirrors the /blog landing page: posts
// that share a `project:` frontmatter field are grouped under that project, and
// groups and standalone posts are ordered together by date (most recent first).
// Starlight's `autogenerate` only sorts alphabetically and can't group, so we
// read and arrange the posts here.
const blogDir = fileURLToPath(new URL('./src/content/docs/blog', import.meta.url));

function readBlogFrontmatter(file) {
	const raw = fs.readFileSync(path.join(blogDir, file), 'utf-8');
	const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
	const get = (key) =>
		block
			.match(new RegExp('^' + key + ':\\s*(.+)$', 'm'))?.[1]
			?.trim()
			.replace(/^['"]|['"]$/g, '');
	return {
		title: get('title') ?? file,
		date: get('date') ?? '',
		project: get('project'),
	};
}

function blogSidebarItems() {
	const toTime = (d) => {
		const t = new Date(d).getTime();
		return Number.isNaN(t) ? 0 : t;
	};

	const posts = fs
		.readdirSync(blogDir)
		.filter((f) => /\.(md|mdx)$/.test(f) && !/^index\.(md|mdx)$/.test(f))
		.map((file) => {
			const fm = readBlogFrontmatter(file);
			return {
				label: fm.title,
				link: `/blog/${file.replace(/\.(md|mdx)$/, '')}/`,
				date: fm.date,
				project: fm.project,
			};
		});

	const groups = new Map();
	const standalone = [];
	for (const p of posts) {
		if (p.project) {
			const list = groups.get(p.project) ?? [];
			list.push(p);
			groups.set(p.project, list);
		} else {
			standalone.push(p);
		}
	}

	const blocks = [];
	for (const p of standalone) {
		blocks.push({ date: toTime(p.date), item: { label: p.label, link: p.link } });
	}
	for (const [name, list] of groups) {
		list.sort((a, b) => toTime(b.date) - toTime(a.date));
		blocks.push({
			date: toTime(list[0].date),
			item: {
				label: name,
				collapsed: false,
				items: list.map((p) => ({ label: p.label, link: p.link })),
			},
		});
	}

	return blocks.sort((a, b) => b.date - a.date).map((b) => b.item);
}

// https://astro.build/config
export default defineConfig({
	site: 'https://luisbretones.dev',
	// Self-hosted fonts (woff2 files from Google Fonts, latin and latin-ext
	// subsets, in src/assets/fonts) instead of loading Google Fonts at runtime.
	// <Font /> in Portfolio.astro and Head.astro emits the @font-face rules and
	// sets these CSS variables.
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'DM Sans',
			cssVariable: '--font-body',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/dm-sans-400-italic-latin-ext.woff2'],
						weight: '400',
						style: 'italic',
						unicodeRange: ['U+0100-02BA', 'U+02BD-02C5', 'U+02C7-02CC', 'U+02CE-02D7', 'U+02DD-02FF', 'U+0304', 'U+0308', 'U+0329', 'U+1D00-1DBF', 'U+1E00-1E9F', 'U+1EF2-1EFF', 'U+2020', 'U+20A0-20AB', 'U+20AD-20C4', 'U+2113', 'U+2C60-2C7F', 'U+A720-A7FF'],
					},
					{
						src: ['./src/assets/fonts/dm-sans-400-italic-latin.woff2'],
						weight: '400',
						style: 'italic',
						unicodeRange: ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'],
					},
					{
						src: ['./src/assets/fonts/dm-sans-300-700-normal-latin-ext.woff2'],
						weight: '300 700',
						style: 'normal',
						unicodeRange: ['U+0100-02BA', 'U+02BD-02C5', 'U+02C7-02CC', 'U+02CE-02D7', 'U+02DD-02FF', 'U+0304', 'U+0308', 'U+0329', 'U+1D00-1DBF', 'U+1E00-1E9F', 'U+1EF2-1EFF', 'U+2020', 'U+20A0-20AB', 'U+20AD-20C4', 'U+2113', 'U+2C60-2C7F', 'U+A720-A7FF'],
					},
					{
						src: ['./src/assets/fonts/dm-sans-300-700-normal-latin.woff2'],
						weight: '300 700',
						style: 'normal',
						unicodeRange: ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'],
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'Playfair Display',
			cssVariable: '--font-display',
			fallbacks: ['serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/playfair-display-700-800-normal-latin-ext.woff2'],
						weight: '700 800',
						style: 'normal',
						unicodeRange: ['U+0100-02BA', 'U+02BD-02C5', 'U+02C7-02CC', 'U+02CE-02D7', 'U+02DD-02FF', 'U+0304', 'U+0308', 'U+0329', 'U+1D00-1DBF', 'U+1E00-1E9F', 'U+1EF2-1EFF', 'U+2020', 'U+20A0-20AB', 'U+20AD-20C4', 'U+2113', 'U+2C60-2C7F', 'U+A720-A7FF'],
					},
					{
						src: ['./src/assets/fonts/playfair-display-700-800-normal-latin.woff2'],
						weight: '700 800',
						style: 'normal',
						unicodeRange: ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'],
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'JetBrains Mono',
			cssVariable: '--font-mono',
			fallbacks: ['monospace'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/jetbrains-mono-400-500-normal-latin-ext.woff2'],
						weight: '400 500',
						style: 'normal',
						unicodeRange: ['U+0100-02BA', 'U+02BD-02C5', 'U+02C7-02CC', 'U+02CE-02D7', 'U+02DD-02FF', 'U+0304', 'U+0308', 'U+0329', 'U+1D00-1DBF', 'U+1E00-1E9F', 'U+1EF2-1EFF', 'U+2020', 'U+20A0-20AB', 'U+20AD-20C4', 'U+2113', 'U+2C60-2C7F', 'U+A720-A7FF'],
					},
					{
						src: ['./src/assets/fonts/jetbrains-mono-400-500-normal-latin.woff2'],
						weight: '400 500',
						style: 'normal',
						unicodeRange: ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'],
					},
				],
			},
		},
	],
	// These pages moved to Learning; keep the old URLs working.
	redirects: {
		'/projects/java-summer-2026': '/learning/java-summer-2026/',
		'/projects/java-masterclass': '/learning/java-masterclass/',
		'/learning/ccna-exam-delay': '/blog/ccna-exam-delay/',
		// Study plans and practice tests moved to their own subdomain.
		...Object.fromEntries(
			['SSII', 'pgpi'].map(
				(page) => [`/${page}`, `https://study.luisbretones.dev/${page}/`],
			),
		),
	},
	integrations: [
		starlight({
			title: 'Luis Bretones',
			// The 404 page lives in src/pages/404.astro with the portfolio layout.
			disable404Route: true,
			customCss: ['./src/styles/custom.css'],
			// Share previews and the blog feed on the Starlight-rendered pages too.
			head: [
				{ tag: 'meta', attrs: { property: 'og:image', content: 'https://luisbretones.dev/avatar.jpeg' } },
				{ tag: 'meta', attrs: { property: 'og:image:alt', content: 'Luis Bretones' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
				{
					tag: 'link',
					attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'Luis Bretones', href: '/rss.xml' },
				},
			],
			components: {
				Footer: './src/components/Footer.astro',
				Head: './src/components/Head.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			sidebar: [
				{ label: 'Home', link: '/' },
				{
					label: 'Projects',
					items: [
						{ label: 'Projects', link: '/projects/' },
						{ autogenerate: { directory: 'projects' } },
					],
				},
				{
					label: 'Learning',
					items: [
						{ label: 'Learning', link: '/learning/' },
						{ autogenerate: { directory: 'learning' } },
					],
				},
				{
					label: 'Blog',
					items: blogSidebarItems(),
				},
				{ label: 'About', link: '/about/' },
				{ label: 'CV', link: '/cv/' },
			],
		}),
	],
});