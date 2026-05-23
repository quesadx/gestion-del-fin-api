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
    ai_confidence: aiData.ai_confidence ?? null,
    ai_suggested_profession: aiData.ai_suggested_profession.trim(),
    ai_profession: aiProfessionId ? { connect: { id: aiProfessionId } } : undefined,
    created_at: new Date(),
  };
}

async function generateIdentificationCode(
  tx: Prisma.TransactionClient,
  professionId: number,
): Promise<string> {
  const profession = await tx.professions.findUnique({
    where: { id: professionId },
    select: { name: true },
  });

  const rawPrefix = profession?.name?.replace(/[^A-Za-z]/g, '').toUpperCase() ?? 'GEN';
  const prefix = rawPrefix.slice(0, 3).padEnd(3, 'X');
  const prefixFilter = `${prefix}-`;

  const last = await tx.people.findFirst({
    where: { identification_code: { startsWith: prefixFilter } },
    orderBy: { identification_code: 'desc' },
    select: { identification_code: true },
  });

  const lastCode = last?.identification_code ?? null;
  const lastNumber = lastCode ? Number(lastCode.replace(prefixFilter, '')) : 0;
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
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
        corrected_profession_id: data.corrected_profession_id ?? undefined,
        correction_reason: data.correction_reason?.trim(),
      },
    });

    if (data.final_decision === 'ACCEPTED') {
      if (admission.person_id) {
        return admission;
      }

      const professionId = data.corrected_profession_id ?? admission.ai_profession_id;
      if (!professionId) {
        throw new AppError('Cannot create person without a profession assigned by AI', 400);
      }

      const identificationCode = await generateIdentificationCode(tx, professionId);

      const person = await createPerson(
        admission.camp_id,
        {
          full_name: admission.applicant_name,
          age: admission.applicant_age ?? undefined,
          skills_summary: admission.applicant_skills ?? undefined,
          profession_id: professionId,
          camp_id: admission.camp_id,
          admitted_at: new Date().toISOString(),
          identification_code: identificationCode,
          photo_url: admission.photo_url ?? undefined,
        },
        tx,
      );

      return tx.admission_requests.update({
        where: { id: admission.id },
        data: { person_id: person.id },
      });
      const linkedAdmission = await tx.admission_requests.update({
        where: { id },
        data: { person_id: person.id },
      });

      return {
        ...linkedAdmission,
        created_person: person,
      };
    }

    return {
      ...admission,
      created_person: null,
    };
  });
}
