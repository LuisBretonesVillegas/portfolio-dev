// Static checks run in CI on every pull request (see .github/workflows/check.yml).
// 1. Every doc in src/content/docs has a `title:` in its frontmatter.
// 2. The sequence "em dash + space" never appears in content or source.
// 3. Every internal href/src in the built site (dist/) resolves, anchors included.
// Run after `npm run build`: node scripts/check-site.mjs
import fs from 'node:fs';
import path from 'node:path';

const errors = [];

function walk(dir, filter, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(p, filter, out);
		else if (filter(p)) out.push(p);
	}
	return out;
}

// 1. Frontmatter titles.
for (const file of walk('src/content/docs', (p) => /\.mdx?$/.test(p))) {
	const fm = fs.readFileSync(file, 'utf-8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
	if (!/^title:\s*\S/m.test(fm)) errors.push(`${file}: missing title in frontmatter`);
}

// 2. Banned "em dash + space".
const banned = '— ';
const sources = [
	...walk('src', (p) => /\.(md|mdx|astro|ts|js|mjs|css)$/.test(p)),
	'astro.config.mjs',
];
for (const file of sources) {
	fs.readFileSync(file, 'utf-8')
		.split('\n')
		.forEach((line, i) => {
			if (line.includes(banned)) errors.push(`${file}:${i + 1}: contains an em dash followed by a space`);
		});
}

// 3. Internal links in the built site.
const dist = 'dist';
if (!fs.existsSync(dist)) {
	errors.push('dist/ not found: run `npm run build` first');
} else {
	const decode = (s) =>
		s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
	for (const file of walk(dist, (p) => p.endsWith('.html'))) {
		const html = fs.readFileSync(file, 'utf-8');
		// Redirect stubs only point elsewhere.
		if (/http-equiv="refresh"/i.test(html) && html.length < 2000) continue;
		const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
		for (const [, raw] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
			const url = decode(raw);
			const page = '/' + path.relative(dist, file);
			if (url.startsWith('#')) {
				const id = decodeURIComponent(url.slice(1));
				if (id && id !== '_top' && !ids.has(id)) errors.push(`${page}: broken anchor ${url}`);
				continue;
			}
			if (!url.startsWith('/') || url.startsWith('//')) continue;
			const target = path.join(dist, decodeURIComponent(url.split(/[?#]/)[0]));
			const ok =
				(fs.existsSync(target) && fs.statSync(target).isFile()) ||
				fs.existsSync(path.join(target, 'index.html'));
			if (!ok) errors.push(`${page}: broken link ${url}`);
		}
	}
}

if (errors.length) {
	console.error(errors.join('\n'));
	console.error(`\n${errors.length} problem(s) found.`);
	process.exit(1);
}
console.log('Site checks passed.');
