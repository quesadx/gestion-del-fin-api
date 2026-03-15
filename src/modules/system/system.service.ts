import { serverTime } from '../../shared/utils/server-time.js';

export function getServerTime() {
  return {
    now: serverTime.now(),
    iso: serverTime.nowISO(),
    today: serverTime.today(),
  };
}
