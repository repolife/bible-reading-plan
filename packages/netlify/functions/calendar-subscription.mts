import { loadDeps } from '../lib/deps';
import { getCalendarSubscription, manageCalendarSubscription } from '../lib/handlers/calendar';
import { createHandler } from '../lib/http';

export const handler = createHandler(['GET', 'POST'], (event) =>
  event.httpMethod === 'GET' ? getCalendarSubscription(event, loadDeps()) : manageCalendarSubscription(event, loadDeps()),
);
