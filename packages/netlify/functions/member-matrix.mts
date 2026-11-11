import { loadDeps } from '../lib/deps';
import { getMemberMatrix, memberMatrixAction } from '../lib/handlers/memberMatrix';
import { createHandler } from '../lib/http';

export const handler = createHandler(['GET', 'POST'], (event) =>
  event.httpMethod === 'GET' ? getMemberMatrix(event, loadDeps()) : memberMatrixAction(event, loadDeps()),
);
