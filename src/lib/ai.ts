// lib/ai.ts
import { Groq } from 'groq-sdk';
export const ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
