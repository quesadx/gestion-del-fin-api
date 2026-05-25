import { z } from 'zod';

export const finalDecisionEnum = z.enum(['ACCEPTED', 'REJECTED']);
export const aiDecisionEnum = z.enum(['ACCEPTED', 'PENDING', 'REJECTED']);

export const admissionAIResultSchema = z.object({
  ai_decision: aiDecisionEnum,
  ai_reasoning: z.string().describe('Detailed explanation step by step about the decision'),
  ai_confidence: z.number().min(0).max(1),
  ai_suggested_profession: z.string().max(80).describe('Suggested profession within the camp'),
  ai_profession_id: z.coerce.number().int(),
});

export type AdmissionAIResult = z.infer<typeof admissionAIResultSchema>;

export const createAdmissionSchema = z.object({
  applicant_name: z.string().min(1).max(150),
  applicant_age: z.number().int().min(0).max(255).optional(),
  applicant_skills: z.string().optional(),
  health_notes: z.string().optional(),
  background_notes: z.string().optional(),
  photo_url: z.url().max(500).optional(),
  id_card_url: z.url().max(500).optional(),
});

export type CreateAdmissionDTO = z.infer<typeof createAdmissionSchema>;

export const reviewAdmissionSchema = z.object({
  final_decision: finalDecisionEnum,
  corrected_profession_id: z.coerce.number().int().positive().optional(),
  correction_reason: z.string().max(255).optional(),
});

export type ReviewAdmissionDTO = z.infer<typeof reviewAdmissionSchema>;
