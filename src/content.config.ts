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
			}),
		}),
	}),
};
