import { z } from 'zod';
import { EErrorStatus } from '../../../shared/index.js';

export const ingestErrorSchema = z.object({
  message: z.string().min(1, 'message is required'),
  stack: z.string().optional(),
  fileName: z.string().optional(),
  lineNumber: z.coerce.number().int().optional(),
  codeSnippet: z.string().optional(),
  environment: z.string().optional(),
});

export const listErrorsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().optional(),
  status: z.enum(Object.values(EErrorStatus)).optional(),
});
