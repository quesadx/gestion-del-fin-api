import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const crTimeZone = 'America/Costa_Rica';

export const getCRTime = (date: Date = new Date()): Date => {
  return toZonedTime(date, crTimeZone);
};

export const formatFullDateTime = (date?: Date): string => {
  const zonedDate = getCRTime(date);
  return format(zonedDate, 'yyyy-MM-dd HH:mm:ss');
};

export const formatDate = (date?: Date): string => {
  const zonedDate = getCRTime(date);
  return format(zonedDate, 'yyyy-MM-dd');
};

export const formatTime = (date?: Date): string => {
  const zonedDate = getCRTime(date);
  return format(zonedDate, 'HH:mm:ss');
};
