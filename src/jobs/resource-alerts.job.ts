import { logger } from '../logger/logger.js';
import { getAllCamps } from '../modules/camps/camps.service.js';
import { getLowResourceAlerts } from '../modules/metrics/metrics.service.js';

async function processCampAlerts(camp: { id: number; name: string }) {
  const alerts = await getLowResourceAlerts(camp.id);

  if (alerts.length === 0) {
    return;
  }

  for (const alert of alerts) {
    const message = ` [JOB] Camp ${camp.id} (${camp.name}): ${alert.status} alert for ${alert.resource_name} (${alert.quantity_current}/${alert.quantity_min_threshold})`;

    if (alert.status === 'CRITICAL') {
      logger.error(message);
    } else {
      logger.warn(message);
    }
  }

  logger.info(` [JOB] Camp ${camp.id} (${camp.name}): ${alerts.length} resource alert(s) emitted`);
}

export async function execute() {
  const camps = await getAllCamps();

  for (const camp of camps) {
    await processCampAlerts(camp);
  }
}

export default { execute };
