import { prisma } from '../../lib/prisma.js';
import { CreatePersonDto, UpdatePersonDto } from './people.schema.js';
export async function createPerson(data: CreatePersonDto) {
  try {
    // Validate camp and profession existence
    const campExists = await prisma.camps.findUnique({ where: { id: data.camp_id } });
    if (!campExists) throw new Error(`Campamento con id ${data.camp_id} no existe`);

    const professionExists = await prisma.professions.findUnique({
      where: { id: data.profession_id },
    });
    if (!professionExists) throw new Error(`Profesión con id ${data.profession_id} no existe`);

    return await prisma.persons.create({
      data: {
        full_name: data.full_name,
        age: data.age,
        identification_code: data.identification_code,
        blood_type: data.blood_type,
        skills_summary: data.skills_summary,
        photo_url: data.photo_url,
        status: data.status ?? 'HEALTHY',
        admitted_at: new Date(data.admitted_at),
        camps: { connect: { id: data.camp_id } },
        professions: { connect: { id: data.profession_id } },
      },
      include: { camps: true, professions: true },
    });
  } catch (error: any) {
    // Prisma Unique Constraint
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') ?? 'campo único';
      throw new Error(`Ya existe un registro con ${target} duplicado.`);
    }
    throw error;
  }
}

export async function updatePerson(id: number, data: Partial<UpdatePersonDto>) {
  // Verify if person exists
  const personExists = await prisma.persons.findUnique({ where: { id } });
  if (!personExists) {
    throw new Error(`Persona con id ${id} no existe`);
  }

  const { camp_id, profession_id, admitted_at, ...rest } = data;

  // Validate camp and profession existence if they are being updated
  if (camp_id) {
    const campExists = await prisma.camps.findUnique({ where: { id: camp_id } });
    if (!campExists) throw new Error(`Campamento con id ${camp_id} no existe`);
  }

  if (profession_id) {
    const professionExists = await prisma.professions.findUnique({ where: { id: profession_id } });
    if (!professionExists) throw new Error(`Profesión con id ${profession_id} no existe`);
  }

  const admittedAtDate = admitted_at ? new Date(admitted_at) : undefined;

  try {
    return await prisma.persons.update({
      where: { id },
      data: {
        ...rest,
        admitted_at: admittedAtDate,
        camps: camp_id ? { connect: { id: camp_id } } : undefined,
        professions: profession_id ? { connect: { id: profession_id } } : undefined,
      },
      include: { camps: true, professions: true },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') ?? 'campo único';
      throw new Error(`Ya existe un registro con ${target} duplicado.`);
    }
    throw error;
  }
}

export async function getPerson(id: number) {
  const person = await prisma.persons.findUnique({
    where: { id },
    include: { camps: true, professions: true },
  });
  if (!person) throw new Error(`Persona con id ${id} no existe`);
  return person;
}

export async function getPeople() {
  return await prisma.persons.findMany({
    include: { camps: true, professions: true },
  });
}

export async function deletePerson(id: number) {
  const person = await prisma.persons.findUnique({ where: { id } });
  if (!person) throw new Error(`Persona con id ${id} no existe`);

  return await prisma.persons.delete({
    where: { id },
  });
}
