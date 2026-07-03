import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// Optional blog post date, shown in the blog listing.
				date: z.coerce.date().optional(),
				// Optional list of tags, shown as chips in the blog listing.
				tags: z.array(z.string()).optional(),
				// Optional URL to a progress.json; if set, the blog listing shows a
				// dynamic "Updated" date pulled from that file's latest log entry.
				progressUrl: z.string().optional(),
				// Optional project this post belongs to. Must match a project page
				// title; when set, the blog listing groups the post under that project.
				project: z.string().optional(),
			}),
		}),
	}),
};
