import { loadDeps } from '../lib/deps';
import { adminMatrix } from '../lib/handlers/adminMatrix';
import { createHandler } from '../lib/http';

export const handler = createHandler(['POST'], (event) => adminMatrix(event, loadDeps()));
