import { z } from 'zod';

export const aiDecisionEnum = z.enum(['ACCEPTED', 'REJECTED']);

export const admissionAIResultSchema = z.object({
  ai_decision: aiDecisionEnum,
  ai_reasoning: z.string().describe(''),
  ai_suggested_profession: z.string().max(80).describe(''),
});

export type AdmissionAIResult = z.infer<typeof admissionAIResultSchema>;
