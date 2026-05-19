import { Groq } from 'groq-sdk';
import { AppError } from '../shared/utils/appError.js';

let _ai: Groq | null = null;

export function getAI(): Groq {
  if (!_ai) {
    if (!process.env.GROQ_API_KEY) {
      throw new AppError('GROQ_API_KEY is not defined', 500);
    }
    _ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _ai;
}
