import { loadDeps } from '../lib/deps';
import { calendarFeed } from '../lib/handlers/calendar';
import { createHandler } from '../lib/http';

export const handler = createHandler(['GET'], (event) => calendarFeed(event, loadDeps()));
