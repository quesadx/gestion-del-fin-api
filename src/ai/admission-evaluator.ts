import { ai } from '../lib/ai.js';
import {
  AdmissionAIResult,
  CreateAdmissionDTO,
  admissionAIResultSchema,
} from '../modules/admission/admission.schema.js';
import { AppError } from '../shared/utils/appError.js';

export async function evaluateAdmission(
  data: CreateAdmissionDTO,
  campRules: string,
  professions: string,
): Promise<AdmissionAIResult> {
  const prompt = `
    You are the admission system for a post-apocalyptic camp.
    Analyze the survivor profile and make a decision based on the camp rules.
    Reason step by step before deciding.
    Respond only with a valid JSON object using exactly this structure:

    {
      "ai_decision": "ACCEPTED" or "REJECTED",
      "ai_reasoning": "detailed explanation of the decision",
      "ai_suggested_profession": "suggested profession or role",
      "ai_profession_id": "ID of the suggested profession"
    }

    Camp rules:
    ${campRules}

    Available professions:
    ${professions}

    Survivor profile:
    - Name: ${data.applicant_name}
    - Age: ${data.applicant_age ?? 'Not specified'}
    - Health status: ${data.health_notes ?? 'No notes'}
    - Skills: ${data.applicant_skills ?? 'Not specified'}
    - Background: ${data.background_notes ?? 'No background provided'}

    IMPORTANT: The "ai_profession_id" field must be an integer
    that matches an ID from the professions list above.
    Do not invent an ID. Use only IDs shown in the list.
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
  try {
    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error('Groq returned an empty response');
    return admissionAIResultSchema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError('AI returned invalid JSON', 502);
    }
    throw new AppError('AI response validation failed', 422);
  }
}
