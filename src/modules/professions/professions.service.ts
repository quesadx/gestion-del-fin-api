import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateProfessionDto, UpdateProfessionDto } from './professions.schema.js';
import { deleteByPrefix, deleteKeys, getOrSetCacheJson } from '../../lib/cache.js';
import { cacheKeys, cacheTtl } from '../../shared/cache/cacheKeys.js';

function prepareProfessionCreateData(data: CreateProfessionDto) {
  return {
    name: data.name.trim(),
    description: data.description?.trim(),
  };
}

function prepareProfessionalUpdateData(data: UpdateProfessionDto) {
  return {
    name: data.name?.trim(),
    description: data.description?.trim(),
  };
}

async function invalidateProfessionCache(professionId?: number) {
  const keys: string[] = [cacheKeys.professionResources];
  if (professionId) keys.push(cacheKeys.profession(professionId));
  await deleteKeys(keys);
  await deleteByPrefix(cacheKeys.professionsListPrefix);
}

export async function createProfession(data: CreateProfessionDto) {
  try {
    const created = await prisma.professions.create({
      data: prepareProfessionCreateData(data),
    });
    await invalidateProfessionCache(created.id);
    return created;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateProfession(id: number, data: UpdateProfessionDto) {
  const profession = await prisma.professions.findUnique({ where: { id } });
  if (!profession) throw new AppError(`Profession not found: ${id}`, 404);

  try {
    const updated = await prisma.professions.update({
      where: { id },
      data: prepareProfessionalUpdateData(data),
    });
    await invalidateProfessionCache(id);
    return updated;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getProfession(id: number) {
  const cacheKey = cacheKeys.profession(id);
  return getOrSetCacheJson(cacheKey, cacheTtl.professions, async () => {
    const profession = await prisma.professions.findUnique({ where: { id } });
    if (!profession) throw new AppError(`Profession not found: ${id}`, 404);
    return profession;
  });
}

export async function getProfessions(page = 1, pageSize = 20) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const cacheKey = cacheKeys.professionsList(page, effectiveLimit);
  return getOrSetCacheJson(cacheKey, cacheTtl.professions, async () => {
    const [records, total] = await Promise.all([
      prisma.professions.findMany({ skip, take: effectiveLimit }),
      prisma.professions.count(),
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
  });
}

export async function deleteProfession(id: number) {
  const profession = await prisma.professions.findUnique({ where: { id } });
  if (!profession) throw new AppError(`Profession not found: ${id}`, 404);

  try {
    await prisma.professions.delete({ where: { id } });
    await invalidateProfessionCache(id);
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}

export async function getProfessionResourceAmounts() {
  const cacheKey = cacheKeys.professionResources;
  return getOrSetCacheJson(cacheKey, cacheTtl.professionResources, async () => {
    return prisma.professions_resources_amounts.findMany({
      select: {
        profession_id: true,
        resource_type_id: true,
        amount: true,
        created_at: true,
        professions: {
          select: {
            id: true,
            name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        resource_type: {
          select: {
            id: true,
            name: true,
            unit: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      orderBy: [{ profession_id: 'asc' }, { resource_type_id: 'asc' }],
    });
  });
}
