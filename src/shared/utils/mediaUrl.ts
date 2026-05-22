import { cloudinary } from '../../lib/cloudinary-provider.js';

const DEFAULT_MEDIA_URL_TTL_SECONDS = 600;

function getMaxSignedMediaUrlTtlSeconds() {
  const raw = process.env.CLOUDINARY_SIGNED_URL_MAX_TTL_SECONDS;

  if (!raw) {
    return DEFAULT_MEDIA_URL_TTL_SECONDS;
  }

  const ttlSeconds = Number(raw);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    return DEFAULT_MEDIA_URL_TTL_SECONDS;
  }

  return ttlSeconds;
}

function resolveExpiry(exp?: number) {
  const now = Math.floor(Date.now() / 1000);
  const maxTtlSeconds = getMaxSignedMediaUrlTtlSeconds();

  if (exp && exp > now) {
    return Math.min(exp, now + maxTtlSeconds);
  }

  return now + maxTtlSeconds;
}

export function extractCloudinaryPublicId(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl);
    if (!parsedUrl.hostname.includes('cloudinary.com')) {
      return null;
    }

    const authenticatedMatch = parsedUrl.pathname.match(
      /\/image\/authenticated\/(?:s--[^/]+--\/)?v\d+\/(.+?)(?:\.[^.\/]+)?$/,
    );
    if (authenticatedMatch?.[1]) {
      return authenticatedMatch[1];
    }

    const uploadMarker = '/upload/';
    const markerIndex = parsedUrl.pathname.indexOf(uploadMarker);
    if (markerIndex === -1) {
      return null;
    }

    const afterUpload = parsedUrl.pathname.slice(markerIndex + uploadMarker.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const withoutExtension = withoutVersion.replace(/\.[^.]+$/, '');

    return withoutExtension || null;
  } catch {
    return null;
  }
}

export function signCloudinaryUrl(sourceUrl: string, tokenExp?: number) {
  const publicId = extractCloudinaryPublicId(sourceUrl);
  if (!publicId) {
    return sourceUrl;
  }

  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: 'authenticated',
    resource_type: 'image',
    expires_at: resolveExpiry(tokenExp),
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function signMediaUrls<T>(value: T, tokenExp?: number): T {
  if (Array.isArray(value)) {
    return value.map((item) => signMediaUrls(item, tokenExp)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = { ...value };

  for (const [key, currentValue] of Object.entries(result)) {
    if (typeof currentValue === 'string' && (key === 'photo_url' || key === 'id_card_url')) {
      result[key] = signCloudinaryUrl(currentValue, tokenExp);
      continue;
    }

    if (Array.isArray(currentValue) || isPlainObject(currentValue)) {
      result[key] = signMediaUrls(currentValue, tokenExp);
    }
  }

  return result as T;
}
