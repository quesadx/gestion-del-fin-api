import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

const getKey = (req: any) => {
  const forwarded = req.headers['x-forwarded-for']?.toString().split(',')[0].trim();
  return forwarded ? ipKeyGenerator(forwarded) : ipKeyGenerator(req.ip ?? 'unknown');
};

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: () => isTest || process.env.DISABLE_RATE_LIMIT === 'true',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  message: {
    error: {
      message: 'Too many requests, please try again later',
      statusCode: 429,
    },
  },
});

export const loginRateLimit = rateLimit({
  windowMs: isTest ? 60 * 1000 : 15 * 60 * 1000,
  max: isTest ? 100 : 5,
  skip: () => isTest || process.env.DISABLE_RATE_LIMIT === 'true',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  message: {
    error: {
      message: 'Too many login attempts, please try again later',
      statusCode: 429,
    },
  },
});

export const admissionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: () => isTest || process.env.DISABLE_RATE_LIMIT === 'true',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  message: {
    error: {
      message: 'Too many admission requests, please try again later',
      statusCode: 429,
    },
  },
});
