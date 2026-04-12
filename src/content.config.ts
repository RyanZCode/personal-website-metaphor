import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const memorandum = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    pinned: z.boolean().default(false),
    subtitle: z.string(),
    pages: z.array(
      z.object({
        imageSrc: z.string(),
        imageAlt: z.string(),
        imagePosition: z.string().optional(),
        imageZoom: z.number().positive().optional(),
        imageTilt: z.number().optional(),
        body: z.array(z.string().min(1)).min(1),
      })
    ).min(1),
  }),
});

export const collections = {
  memorandum,
};
