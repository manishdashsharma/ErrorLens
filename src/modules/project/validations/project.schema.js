import { z } from 'zod';
import { EWebhookProvider } from '../../../shared/index.js';

export const createProjectSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    webhookUrl: z.url({ message: 'webhookUrl must be a valid URL' }).optional(),
    webhookProvider: z.enum(Object.values(EWebhookProvider)).optional(),
    githubOwner: z.string().min(1).optional(),
    githubRepo: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.webhookUrl) === Boolean(data.webhookProvider), {
    message: 'webhookUrl and webhookProvider must be provided together',
    path: ['webhookProvider'],
  });

export const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
});
