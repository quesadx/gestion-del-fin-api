import { z } from 'zod';

/**
 * ID parameter schema for route-level validation.
 *
 * Validates that `:id` is a positive integer at the Zod middleware layer.
 * This runs BEFORE controllers — providing early, structured validation errors.
 *
 * Controllers ALSO call `parseIdParam()` for defense-in-depth:
 * if the schema is ever removed or bypassed, `parseIdParam` catches invalid IDs
 * at the service boundary with a consistent "id must be a positive integer" error.
 *
 * The double-check is intentional and not harmful in production.
 */
export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
