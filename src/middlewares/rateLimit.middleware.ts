import rateLimit from 'express-rate-limit';

export const admissionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many admission requests, please try again later',
      statusCode: 429,
    },
  },
});