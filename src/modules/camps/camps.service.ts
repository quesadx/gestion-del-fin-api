import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  handleUniqueConstraintError,
  handleForeignKeyError,
} from '../../shared/utils/handlePrismaError.js';
import { CreateCampDto, UpdateCampDto } from './camps.schema.js';
import { auditLog } from '../../shared/utils/auditLog.js';
import { deleteByPrefix, deleteKeys, getOrSetCacheJson } from '../../lib/cache.js';
import { cacheKeys, cacheTtl } from '../../shared/cache/cacheKeys.js';

function prepareCampCreateData(data: CreateCampDto) {
  return {
    name: data.name.trim(),
    location: data.location?.trim(),
    status: data.status ?? 'ACTIVE',
    ai_context_prompt: data.ai_context_prompt?.trim(),
  };
}

function prepareCampUpdateData(data: UpdateCampDto) {
  return {
    name: data.name?.trim(),
    location: data.location?.trim(),
    status: data.status,
    ai_context_prompt: data.ai_context_prompt?.trim(),
  };
}

async function invalidateCampCache(campId?: number) {
  const keys: string[] = [cacheKeys.campsCatalog];
  if (campId) keys.push(cacheKeys.camp(campId));
  await deleteKeys(keys);
  await deleteByPrefix(cacheKeys.campsListPrefix);
}

export async function createCamp(data: CreateCampDto, actorUserId: number, actorCampId: number) {
  try {
    const camp = await prisma.camps.create({
      data: prepareCampCreateData(data),
    });

    auditLog({
      userId: actorUserId,
      campId: actorCampId,
      action: 'CREATE_CAMP',
      targetType: 'camps',
      targetId: camp.id,
    });

    await invalidateCampCache(camp.id);

    return camp;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function updateCamp(
  id: number,
  data: UpdateCampDto,
  actorUserId: number,
  actorCampId: number,
) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);

  try {
    const updated = await prisma.camps.update({
      where: { id },
      data: prepareCampUpdateData(data),
    });

    auditLog({
      userId: actorUserId,
      campId: actorCampId,
      action: 'UPDATE_CAMP',
      targetType: 'camps',
      targetId: id,
    });

    await invalidateCampCache(id);

    return updated;
  } catch (error: any) {
    handleUniqueConstraintError(error);
  }
}

export async function getCamp(id: number) {
  const cacheKey = cacheKeys.camp(id);
  return getOrSetCacheJson(cacheKey, cacheTtl.camps, async () => {
    const camp = await prisma.camps.findUnique({ where: { id } });
    if (!camp) throw new AppError(`Camp not found: ${id}`, 404);
    return camp;
  });
}

export async function getAllCamps() {
  const cacheKey = cacheKeys.campsCatalog;
  return getOrSetCacheJson(cacheKey, cacheTtl.camps, async () => {
    return prisma.camps.findMany({
      where: { status: 'ACTIVE', deleted_at: null },
      select: { id: true, name: true, created_at: true, deleted_at: true },
      orderBy: { id: 'asc' },
    });
  });
}

export async function getCamps(
  page = 1,
  pageSize = 20,
  actorCampId?: number,
  isAdmin = false,
) {
  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;
  const where = isAdmin || !actorCampId ? {} : { id: actorCampId };

  const cacheKey = isAdmin || !actorCampId
    ? cacheKeys.campsList(page, effectiveLimit)
    : `${cacheKeys.campsList(page, effectiveLimit)}:camp:${actorCampId}`;
  return getOrSetCacheJson(cacheKey, cacheTtl.camps, async () => {
    const [records, total] = await Promise.all([
      prisma.camps.findMany({ where, skip, take: effectiveLimit }),
      prisma.camps.count({ where }),
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

export async function deleteCamp(id: number, actorUserId: number, actorCampId: number) {
  const camp = await prisma.camps.findUnique({ where: { id } });
  if (!camp) throw new AppError(`Camp not found: ${id}`, 404);
  try {
    await prisma.camps.delete({ where: { id } });

    auditLog({
      userId: actorUserId,
      campId: actorCampId,
      action: 'DELETE_CAMP',
      targetType: 'camps',
      targetId: id,
    });
    await invalidateCampCache(id);
  } catch (error: any) {
    handleForeignKeyError(error);
  }
}
