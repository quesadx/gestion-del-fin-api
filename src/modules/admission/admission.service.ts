import { prisma } from '../../lib/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AdmissionAIResult, CreateAdmissionDTO, ReviewAdmissionDTO } from './admission.schema.js';
import { evaluateAdmission } from '../../ai/admission-evaluator.js';
import { createPerson } from '../people/people.service.js';
import { AppError } from '../../shared/utils/appError.js';

function prepareAdmissionCreateData(
  campId: number,
  data: CreateAdmissionDTO,
  aiData: AdmissionAIResult,
): Prisma.admission_requestsCreateInput {
  const aiProfessionId = aiData.ai_profession_id ?? null;

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
    ai_profession_id: aiProfessionId,
    created_at: new Date(),
  };
}

export async function createAdmission(campId: number, data: CreateAdmissionDTO) {
  const camp = await prisma.camps.findUnique({
    where: { id: campId },
  });
  if (!camp) throw new AppError(`Camp not found ${campId}`, 404);

  const professions = await prisma.professions.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
  });
  if (professions.length === 0) throw new AppError('Professions not found', 404);

  const campContext = camp.ai_context_prompt;

  const aiResult = await evaluateAdmission(
    data,
    campContext ?? 'No context defined for this camp',
    professions,
  );

  return prisma.admission_requests.create({
    data: prepareAdmissionCreateData(campId, data, aiResult),
  });
}

export async function getAdmissions(campId: number, page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const [records, total] = await Promise.all([
    prisma.admission_requests.findMany({
      where: { camp_id: campId },
      skip,
      take: effectiveLimit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.admission_requests.count({ where: { camp_id: campId } }),
  ]);

  return {
    data: records,
    pagination: {
      page,
      pageSize: effectiveLimit,
      total,
      hasNextPage: page * effectiveLimit < total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
  };
}

export async function getAdmissionsById(id: number) {
  return prisma.admission_requests.findUniqueOrThrow({
    where: { id },
  });
}

export async function reviewAdmission(id: number, reviewedBy: number, data: ReviewAdmissionDTO) {
  return prisma.$transaction(async (tx) => {
    const admission = await tx.admission_requests.update({
      where: { id },
      data: {
        final_decision: data.final_decision,
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
      },
    });

    if (data.final_decision === 'ACCEPTED') {
      if (!admission.ai_profession_id) {
        throw new AppError('Cannot create person without a profession assigned by AI', 400);
      }

      await createPerson(
        admission.camp_id,
        {
          full_name: admission.applicant_name,
          age: admission.applicant_age ?? undefined,
          skills_summary: admission.applicant_skills ?? undefined,
          profession_id: admission.ai_profession_id,
          camp_id: admission.camp_id,
          admitted_at: new Date().toISOString(),
        },
        tx,
      );
    }
    return admission;
  });
}
