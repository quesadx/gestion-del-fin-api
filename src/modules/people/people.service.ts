import { prisma } from '../../lib/prisma.js';
import { CreatePersonDto, UpdatePersonDto } from './people.schema.js';
import { AppError } from '../../shared/utils/appError.js';

// Helper to secure date parsing and validation
function parseDate(dateStr?: string) {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError(`admitted_at inválido: ${dateStr}`, 400);
  }
  return date;
}

export async function createPerson(data: CreatePersonDto) {
  try {
    // Validate camp
    const camp = await prisma.camps.findUnique({ where: { id: data.camp_id } });
    if (!camp) throw new AppError(`camp_id no existe: ${data.camp_id}`, 404);

    // Validate profession
    const profession = await prisma.professions.findUnique({
      where: { id: data.profession_id },
    });
    if (profession)
      return await prisma.persons.create({
        data: {
          full_name: data.full_name.trim(),
          age: data.age,
          identification_code: data.identification_code,
          blood_type: data.blood_type,
          skills_summary: data.skills_summary?.trim(),
          photo_url: data.photo_url,
          status: data.status ?? 'HEALTHY',
          admitted_at: parseDate(data.admitted_at)!,
          camps: { connect: { id: data.camp_id } },
          professions: { connect: { id: data.profession_id } },
        },
        include: { camps: true, professions: true },
      });
  } catch (error: any) {
    // Unique constraint
    if (error.code === 'P2002') {
      const field = error.meta?.target?.join(', ') ?? 'campo único';
      throw new AppError(`Ya existe un valor duplicado en: ${field}`, 409);
    }
    throw error;
  }
}

export async function updatePerson(id: number, data: Partial<UpdatePersonDto>) {
  const person = await prisma.persons.findUnique({ where: { id } });
  if (!person) throw new AppError(`Persona no encontrada: ${id}`, 404);

  const { camp_id, profession_id, admitted_at, ...rest } = data;

  if (camp_id) {
    const camp = await prisma.camps.findUnique({ where: { id: camp_id } });
    if (!camp) throw new AppError(`camp_id no existe: ${camp_id}`, 404);
  }

  if (profession_id) {
    const prof = await prisma.professions.findUnique({ where: { id: profession_id } });
    if (!prof) throw new AppError(`profession_id no existe: ${profession_id}`, 404);
  }

  try {
    return await prisma.persons.update({
      where: { id },
      data: {
        ...rest,
        full_name: rest.full_name?.trim(),
        skills_summary: rest.skills_summary?.trim(),
        admitted_at: admitted_at ? parseDate(admitted_at) : undefined,
        camps: camp_id ? { connect: { id: camp_id } } : undefined,
        professions: profession_id ? { connect: { id: profession_id } } : undefined,
      },
      include: { camps: true, professions: true },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.join(', ') ?? 'campo único';
      throw new AppError(`Ya existe un valor duplicado en: ${field}`, 409);
    }
    throw error;
  }
}

export async function getPerson(id: number) {
  const person = await prisma.persons.findUnique({
    where: { id },
    include: { camps: true, professions: true },
  });

  if (!person) throw new AppError(`Persona no encontrada: ${id}`, 404);

  return person;
}
export async function getPeople(page = 1, limit = 10) {
  return await prisma.persons.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: { camps: true, professions: true },
  });
}

export async function deletePerson(id: number) {
  const person = await prisma.persons.findUnique({ where: { id } });
  if (!person) throw new AppError(`Persona no encontrada: ${id}`, 404);

  return await prisma.persons.delete({ where: { id } });
}
