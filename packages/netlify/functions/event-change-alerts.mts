import type { Config } from '@netlify/functions';
import { loadDeps } from '../lib/deps';
import { sendEventChangeAlerts } from '../lib/handlers/eventChangeAlerts';

// Posts last-minute event changes to the "Calendar alerts" Matrix room.
// Scheduled functions run only on the published production deploy.
export default async () => {
  const result = await sendEventChangeAlerts(loadDeps());
  // Counts only; never message text.
  if (result.sent || result.unchanged || result.failed) console.log('event-change-alerts', JSON.stringify(result));
  return new Response(null, { status: 204 });
};

export const config: Config = {
  schedule: '*/5 * * * *',
};
