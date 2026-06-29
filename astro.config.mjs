// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Build the Blog sidebar manually so it follows each post's `date:` frontmatter
// (most recent first), matching the order on the /blog landing page. Starlight's
// `autogenerate` only sorts alphabetically, so we read and sort the posts here.
const blogDir = fileURLToPath(new URL('./src/content/docs/blog', import.meta.url));

function blogSidebarItems() {
	const toTime = (d) => {
		const t = new Date(d).getTime();
		return Number.isNaN(t) ? 0 : t;
	};
	return fs
		.readdirSync(blogDir)
		.filter((f) => /\.(md|mdx)$/.test(f) && !/^index\.(md|mdx)$/.test(f))
		.map((file) => {
			const raw = fs.readFileSync(path.join(blogDir, file), 'utf-8');
			const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
			const title = (block.match(/^title:\s*(.+)$/m)?.[1] ?? file)
				.trim()
				.replace(/^['"]|['"]$/g, '');
			const date = block.match(/^date:\s*(.+)$/m)?.[1]?.trim() ?? '';
			return { label: title, link: `/blog/${file.replace(/\.(md|mdx)$/, '')}/`, date };
		})
		.sort((a, b) => toTime(b.date) - toTime(a.date))
		.map(({ label, link }) => ({ label, link }));
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