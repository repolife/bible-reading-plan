import { loadDeps } from '../lib/deps';
import { listMembers } from '../lib/handlers/members';
import { createHandler } from '../lib/http';

export const handler = createHandler(['GET'], (event) => listMembers(event, loadDeps()));
