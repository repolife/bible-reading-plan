import { loadDeps } from '../lib/deps';
import { inviteMember } from '../lib/handlers/members';
import { createHandler } from '../lib/http';

export const handler = createHandler(['POST'], (event) => inviteMember(event, loadDeps()));
