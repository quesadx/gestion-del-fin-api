import { ai } from '../lib/ai.js';
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
    Eres el sistema de admisión de un campamento post-apocalíptico. 
    Analiza el perfil del sobreviviente y toma una decisión basándote en las reglas. 
    Razona paso a paso antes de decidir.
    Responde únicamente con un objeto JSON válido con exactamente esta estructura:

    {
      "ai_decision": "ACCEPTED" o "REJECTED",
      "ai_reasoning": "explicación detallada de la decisión",
      "ai_suggested_profession": "profesión o cargo sugerido"
    }

    Reglas del campamento:
    ${campRules}

    Perfil del sobrevimiente:
    - Nombre: ${data.applicant_name}
    - Edad: ${data.applicant_age ?? 'No especificada'}
    - Estado de salud: ${data.health_notes ?? 'Sin notas'}
    - Habilidades: ${data.applicant_skills ?? 'No especificadas'}
    - Antecedentes: ${data.background_notes ?? 'Sin Antecedentes'}
  `;

  const response = await ai.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });

  // Parsing and evaluation via Zod after Groq returns the string
  // Validation for posible error. However, it shouldn't happen, is just a necessary validation to avoid an error
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('Groq returned an empty response');
  return admissionAIResultSchema.parse(JSON.parse(text));
}
