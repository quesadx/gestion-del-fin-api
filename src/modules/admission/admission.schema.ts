import { z } from 'zod';

export const finalDecisionEnum = z.enum(['ACCEPTED', 'REJECTED']);

export const createAdmissionSchema = z.object({
  applicant_name: z.string().min(1).max(150),
  applicant_age: z.number().int().min(0).max(255).optional(),
  applicant_skills: z.string().optional(),
  health_notes: z.string().optional(),
  background_notes: z.string().optional(),
  photo_url: z.string().url().optional(),
  id_card_url: z.string().url().optional(),
});

export type CreateAdmissionDTO = z.infer<typeof createAdmissionSchema>;

export const reviewAdmissionSchema = z.object({
  final_decision: finalDecisionEnum,
});

export type reviewAdmissionDTO = z.infer<typeof reviewAdmissionSchema>;
