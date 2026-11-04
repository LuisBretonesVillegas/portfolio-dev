// Fails if any built page scrolls horizontally at phone width (375px).
// Needs `npm run preview` running on port 4321 and Playwright available.
// Run: node scripts/check-mobile.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// require() so a globally installed Playwright (NODE_PATH) works too.
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.env.BASE_URL ?? 'http://localhost:4321';
const pages = [];
(function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(p);
		else if (entry.name === 'index.html') {
			const html = fs.readFileSync(p, 'utf-8');
			if (/http-equiv="refresh"/i.test(html) && html.length < 2000) continue;
			const rel = path.relative('dist', dir).split(path.sep).join('/');
			pages.push(rel ? `/${rel}/` : '/');
		}
	}
})('dist');

const browser = await chromium.launch();
const failures = [];
for (const url of pages) {
	const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
	// Only the site itself: external fonts and APIs are not needed to measure layout.
	await page.route('**/*', (route) =>
		route.request().url().startsWith(base) ? route.continue() : route.abort(),
	);
	await page.goto(base + url, { waitUntil: 'load' });
	const { scrollWidth, clientWidth } = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
	}));
	if (scrollWidth > clientWidth) failures.push(`${url}: ${scrollWidth}px wide at ${clientWidth}px`);
	await page.close();
}
await browser.close();

if (failures.length) {
	console.error('Horizontal overflow at 375px:\n' + failures.join('\n'));
	process.exit(1);
}
console.log(`No horizontal overflow at 375px on ${pages.length} pages.`);
