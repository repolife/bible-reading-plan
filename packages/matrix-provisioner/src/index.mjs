import { createProvisioner } from './server.mjs';
import { openStore } from './store.mjs';
import { createSynapseClient } from './synapse.mjs';

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable ${name}`);
    process.exit(1);
  }
  return value;
}

const config = {
  host: process.env.BIND_HOST || '127.0.0.1',
  port: Number(process.env.PORT || 8787),
  serverName: process.env.MATRIX_SERVER_NAME || 'ozark-fellowship.netlify.app',
  hmacSecret: required('PROVISIONER_HMAC_SECRET'),
  stateFile: process.env.STATE_FILE || '/var/lib/matrix-provisioner/state.json',
};

if (config.hmacSecret.length < 32) {
  console.error('PROVISIONER_HMAC_SECRET must be at least 32 characters');
  process.exit(1);
}
if (!['127.0.0.1', '::1', 'localhost'].includes(config.host)) {
  console.error('Refusing to bind to a non-loopback address; expose the service through the reverse proxy only');
  process.exit(1);
}

const synapse = createSynapseClient({
  baseUrl: process.env.SYNAPSE_URL || 'http://127.0.0.1:8008',
  registrationSharedSecret: required('SYNAPSE_REGISTRATION_SHARED_SECRET'),
  adminToken: required('SYNAPSE_ADMIN_TOKEN'),
});

const store = await openStore(config.stateFile);
const server = createProvisioner({ config, store, synapse });
server.listen(config.port, config.host, () => {
  console.log(`matrix-provisioner listening on ${config.host}:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
