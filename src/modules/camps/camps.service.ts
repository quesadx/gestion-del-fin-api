import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { CreateCampDto, UpdateCampDto } from './camps.schema.js';

export async function createCamp(data: CreateCampDto) {
  try {
    return await prisma.camps.create({
      data: {
        name: data.name.trim(),
        location: data.location?.trim(),
        status: data.status ?? 'ACTIVE',
        ai_context_prompt: data.ai_context_prompt?.trim(),
      },
    });
  } catch (error: any) {
    // Unique constraint (Prisma error code P2002)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] ?? 'unique field';
      throw new AppError(`${field} already exists`, 409);
    }
    throw error;
  }
}

export async function updateCamp(id: number, data: Partial<UpdateCampDto>) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);

  const { name, location, status, ai_context_prompt } = data;

  try {
    return await prisma.camps.update({
      where: { id },
      data: {
        name: name?.trim(),
        location: location?.trim(),
        status,
        ai_context_prompt: ai_context_prompt?.trim(),
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] ?? 'unique field';
      throw new AppError(`${field} already exists`, 409);
    }
    throw error;
  }
}

export async function getCamp(id: number) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);
  return camp;
}

export async function getAllCamps() {
  return await prisma.camps.findMany();
}

export async function deleteCamp(id: number) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);
  await prisma.camps.delete({ where: { id } });
  return { message: `Camp with id ${id} has been deleted` };
}
