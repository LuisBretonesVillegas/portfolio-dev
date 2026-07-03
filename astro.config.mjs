// @ts-check
import { defineConfig } from 'astro/config';
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
	integrations: [
		starlight({
			title: 'Luis Bretones',
			customCss: ['./src/styles/custom.css'],
			components: {
				Footer: './src/components/Footer.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			sidebar: [
				{ label: 'Home', link: '/' },
				{
					label: 'Projects',
					items: [{ autogenerate: { directory: 'projects' } }],
				},
				{
					label: 'Blog',
					items: blogSidebarItems(),
				},
				{ label: 'Contact', link: '/contact/' },
			],
		}),
	],
});