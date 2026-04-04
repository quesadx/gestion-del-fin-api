import { prisma } from '../../lib/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AdmissionAIResult, CreateAdmissionDTO, ReviewAdmissionDTO } from './admission.schema.js';
import { evaluateAdmission } from '../../ai/admission-evaluator.js';
import { AppError } from '../../shared/utils/appError.js';

function prepareAdmissionCreateData(
  campId: number,
  data: CreateAdmissionDTO,
  aiData: AdmissionAIResult,
): Prisma.admission_requestsCreateInput {
  return {
    camps: {
      connect: { id: campId },
    },
    applicant_name: data.applicant_name,
    applicant_age: data.applicant_age ?? null,
    applicant_skills: data.applicant_skills?.trim(),
    health_notes: data.health_notes?.trim(),
    background_notes: data.background_notes?.trim(),
    photo_url: data.photo_url?.trim(),
    id_card_url: data.id_card_url?.trim(),
    ai_decision: aiData.ai_decision ?? 'PENDING',
    ai_reasoning: aiData.ai_reasoning.trim(),
    ai_suggested_profession: aiData.ai_suggested_profession.trim(),
    created_at: new Date(),
  };
}

export async function createAdmission(campId: number, data: CreateAdmissionDTO) {
  const camp = await prisma.camps.findUnique({
    where: { id: campId },
  });
  if (!camp) throw new AppError(`Camp not found ${campId}`, 404);

  const campContext = camp.ai_context_prompt;
  const aiResult = await evaluateAdmission(
    data,
    campContext ?? 'Sin contexto definido para este campamento',
  );

  return prisma.admission_requests.create({
    data: prepareAdmissionCreateData(campId, data, aiResult),
  });
}

export async function getAdmissions(campId: number) {
  return prisma.admission_requests.findMany({
    where: { camp_id: campId },
    orderBy: { created_at: 'desc' },
  });
}

export async function getAdmissionsById(id: number) {
  return prisma.admission_requests.findUniqueOrThrow({
    where: { id },
  });
}

export async function reviewAdmission(id: number, reviewedBy: number, data: ReviewAdmissionDTO) {
  return prisma.admission_requests.update({
    where: { id },
    data: {
      final_decision: data.final_decision,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    },
  });
}
