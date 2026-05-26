import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

// Esto va en tu app principal (index.ts/app.ts), ANTES de los middlewares:
// app.set('trust proxy', 1);

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  // Leer la IP real del header que pone Railway
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() 
      || req.ip 
      || 'unknown';
  },
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
  skip: () => isTest,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim()
      || req.ip
      || 'unknown';
  },
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
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim()
      || req.ip
      || 'unknown';
  },
  message: {
    error: {
      message: 'Too many admission requests, please try again later',
      statusCode: 429,
    },
  },
});