// src/utils/server-time.ts

export const serverTime = {
  now: (): Date => new Date(),
  nowISO: (): string => new Date().toISOString(),
  today: (): string => new Date().toISOString().split('T')[0], // "2026-03-15"
};
