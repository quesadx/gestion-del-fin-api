import { prisma } from '../../lib/prisma.js';
import { GoogleGeminiAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CreateAdmissionDTO, ReviewAdmissionDTO } from './admission.schema.js';

export async function createAdmission(campId: number, data: CreateAdmissionDTO) {
  const campContext = await prisma.camps.findMany({
    where: { camp_id: campId },
  });
}
