import { ai } from '../lib/gemini.js';
import { z } from 'zod';
import {
  AdmissionAIResult,
  CreateAdmissionDTO,
  admissionAIResultSchema,
} from '../modules/admission/admission.schema.js';

export async function evaluateAdmission(
  data: CreateAdmissionDTO,
  campRules: string,
): Promise<AdmissionAIResult> {
  const prompt = `
    Eres el sistema de admisión de un campamento post-apocalíptico. Analiza el perfil del sobreviviente y toma una decisión basándote en las reglas. Razona paso a paso antes de decidir.
    Reglas del campamento:
    ${campRules}

    Perfil del sobrevimiente:
    - Nombre: ${data.applicant_name}
    - Edad: ${data.applicant_age ?? 'No especificada'}
    - Estado de salud: ${data.health_notes ?? 'Sin notas'}
    - Habilidades: ${data.applicant_skills ?? 'No especificadas'}
    - Antecedentes: ${data.background_notes ?? 'Sin Antecedentes'}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(admissionAIResultSchema),
    },
  });

  // Parsing and evaluation via Zod after Gemini returns the string
  // Validation for posible error. However, it shouldn't happen, is just a necessary validation to avoid an error
  if (!response.text) throw new Error('Gemini returned and empty respone');
  return admissionAIResultSchema.parse(JSON.parse(response.text!));
}
