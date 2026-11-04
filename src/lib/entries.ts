import type { CollectionEntry } from 'astro:content';

type Doc = CollectionEntry<'docs'>;

/** Docs in a section (e.g. "projects"), without its index page, newest first. */
export function sectionEntries(allDocs: Doc[], section: string): Doc[] {
	const index = new RegExp(`^${section}/index\\.mdx?$`);
	return allDocs
		.filter((e) => e.id.startsWith(`${section}/`) && !index.test(e.id))
		.sort((a, b) => time(b.data.date) - time(a.data.date));
}

/** URL of a doc entry, e.g. "projects/vigia.md" → "/projects/vigia/". */
export const entryUrl = (entry: Doc) => `/${entry.id.replace(/\.mdx?$/, '')}/`;

export const time = (d: Date | undefined) => (d ? new Date(d).getTime() : 0);

export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * "Started …" label for a project or course card. Entries with a progress.json
 * get their "Updated" date client-side (see showUpdatedDates); the rest take it
 * from their latest blog write-up, matched through the posts' `project` field.
 */
export function dateLabel(data: Doc['data'], allDocs: Doc[]): string {
	if (!data.date) return '';
	const started = formatDate(data.date);
	if (data.progressUrl) return `Started ${started}`;
	const times = sectionEntries(allDocs, 'blog')
		.filter((p) => p.data.project === data.title && p.data.date)
		.map((p) => time(p.data.date));
	if (times.length) {
		const updated = Math.max(...times);
		if (updated > time(data.date)) return `Started ${started} · Updated ${formatDate(new Date(updated))}`;
	}
	return started;
}
