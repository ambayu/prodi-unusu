import { z } from 'zod';
import { slugSchema } from './common.js';

export const slugParamSchema = z.object({
  slug: slugSchema.max(255),
});

export const sitemapQuerySchema = z.object({
  format: z.enum(['json', 'xml']).default('json'),
});
