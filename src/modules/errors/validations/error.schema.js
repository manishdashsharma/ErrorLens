import { z } from 'zod';
import { EErrorStatus } from '../../../shared/index.js';

export const ingestErrorSchema = z.object({
  message: z.string().min(1, 'message is required').max(2000, 'message must be under 2000 characters'),
  stack: z.string().max(10000, 'stack must be under 10000 characters').optional(),
  fileName: z.string().max(500, 'fileName must be under 500 characters').optional(),
  lineNumber: z.coerce.number().int().optional(),
  codeSnippet: z.string().max(5000, 'codeSnippet must be under 5000 characters').optional(),
  environment: z.string().max(100, 'environment must be under 100 characters').optional(),
});

export const listErrorsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().optional(),
  status: z.enum(Object.values(EErrorStatus)).optional(),
});
