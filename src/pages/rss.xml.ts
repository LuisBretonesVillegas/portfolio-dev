import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

// Hand-rolled RSS 2.0 feed of the blog, so it needs no extra dependency.
const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET(context: APIContext) {
  const site = context.site!;
  const posts = (await getCollection('docs'))
    .filter(e => e.id.startsWith('blog/') && !e.id.match(/^blog\/index\.mdx?$/) && !e.data.draft)
    .sort((a, b) => {
      const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
      const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
      return dateB - dateA;
    });

  const items = posts
    .map(post => {
      const link = new URL(`/${post.id.replace(/\.mdx?$/, '')}/`, site).href;
      return [
        '    <item>',
        `      <title>${escape(post.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        post.data.description ? `      <description>${escape(post.data.description)}</description>` : '',
        post.data.date ? `      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>` : '',
        ...(post.data.tags ?? []).map(tag => `      <category>${escape(tag)}</category>`),
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Luis Bretones</title>
    <link>${site.href}</link>
    <description>What I build and learn on the way to DevOps and SRE: self-hosted infrastructure, monitoring, and networking.</description>
    <language>en</language>
    <atom:link href="${new URL('/rss.xml', site).href}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
