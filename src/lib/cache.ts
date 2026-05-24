import { createClient } from 'redis';
import { logger } from '../logger/logger.js';

const cacheUrl = process.env.VALKEY_URL;
const cacheEnabled =
  process.env.CACHE_ENABLED !== 'false' && !!cacheUrl && process.env.NODE_ENV !== 'test';

let client: ReturnType<typeof createClient> | null = null;
let connectPromise: Promise<void> | null = null;

export async function initCache(): Promise<void> {
  if (!cacheEnabled || client) return;

  client = createClient({ url: cacheUrl });

  client.on('error', (error) => {
    logger.warn(`Cache connection error: ${String(error)}`);
  });

  client.on('reconnecting', () => {
    logger.warn('Cache reconnecting...');
  });

  connectPromise = client.connect().then(() => undefined);
  try {
    await connectPromise;
    logger.info('Cache connected.');
  } catch (error) {
    logger.warn(`Cache connection failed: ${String(error)}`);
  }
}

export async function closeCache(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch (error) {
    logger.warn(`Cache shutdown failed: ${String(error)}`);
    try {
      await client!.disconnect(); // force disconnect on failed graceful shutdown
    } catch {
      // Ignore — connection already dead or unreachable
    }
  } finally {
    client = null;
    connectPromise = null;
  }
}

function isReady(): boolean {
  return !!client && client.isReady;
}

async function ensureConnected(): Promise<void> {
  if (!cacheEnabled) return;
  if (client && client.isReady) return;
  if (connectPromise) {
    await connectPromise;
    return;
  }
  await initCache();
}

export async function getCacheJson<T>(key: string): Promise<T | null> {
  if (!cacheEnabled) return null;
  await ensureConnected();
  if (!isReady()) return null;

  try {
    const value = await client!.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.warn(`Cache get failed for ${key}: ${String(error)}`);
    return null;
  }
}

export async function setCacheJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (!cacheEnabled) return;
  await ensureConnected();
  if (!isReady()) return;

  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await client!.set(key, payload, { EX: ttlSeconds });
    } else {
      await client!.set(key, payload);
    }
  } catch (error) {
    logger.warn(`Cache set failed for ${key}: ${String(error)}`);
  }
}

export async function getOrSetCacheJson<T>(
  key: string,
  ttlSeconds: number,
  getter: () => Promise<T>,
): Promise<T> {
  const cached = await getCacheJson<T>(key);
  if (cached !== null) return cached;

  const value = await getter();
  void setCacheJson(key, value, ttlSeconds);
  return value;
}

export async function deleteKeys(keys: string[]): Promise<void> {
  if (!cacheEnabled || keys.length === 0) return;
  await ensureConnected();
  if (!isReady()) return;

  try {
    await client!.del(keys);
  } catch (error) {
    logger.warn(`Cache delete failed for keys: ${String(error)}`);
  }
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  if (!cacheEnabled) return;
  await ensureConnected();
  if (!isReady()) return;

  try {
    let cursor = 0;
    do {
      const result = await client!.scan(cursor, {
        MATCH: `${prefix}*`,
        COUNT: 100,
      });
      cursor = Number(result.cursor);
      if (result.keys.length > 0) {
        await client!.del(result.keys);
      }
    } while (cursor !== 0);
  } catch (error) {
    logger.warn(`Cache delete by prefix failed for ${prefix}: ${String(error)}`);
  }
}
