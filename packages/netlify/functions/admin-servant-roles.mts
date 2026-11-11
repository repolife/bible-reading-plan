import { loadDeps } from '../lib/deps';
import { setServantRoles } from '../lib/handlers/members';
import { createHandler } from '../lib/http';

export const handler = createHandler(['POST'], (event) => setServantRoles(event, loadDeps()));
