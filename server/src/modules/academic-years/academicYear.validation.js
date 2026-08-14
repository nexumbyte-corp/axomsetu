import { z } from 'zod';

export const academicYearIdParamSchema = {
  params: z.object({
    academicYearId: z.string().uuid('Invalid academic year ID format'),
  }),
};
