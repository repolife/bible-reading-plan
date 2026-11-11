import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Small JSON state file: which accounts this service created, for which
 * website profile, plus recent nonces and DM rooms. Never holds passwords.
 *
 * Writes are atomic (temp file, fsync, rename) and all mutations run through
 * one in-process lock, so a single service instance is assumed.
 */
export async function openStore(path) {
  let state = { version: 1, accounts: {}, nonces: {}, linkRooms: {} };
  try {
    state = { ...state, ...JSON.parse(await readFile(path, 'utf8')) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  }

  let queue = Promise.resolve();

  async function persist() {
    const tmp = `${path}.tmp`;
    const handle = await open(tmp, 'w', 0o600);
    try {
      await handle.writeFile(JSON.stringify(state, null, 2));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmp, path);
  }

  return {
    state,
    persist,
    /** Runs fn exclusively; mutations made inside are persisted by fn itself. */
    withLock(fn) {
      const run = queue.then(fn, fn);
      queue = run.catch(() => {});
      return run;
    },
    rememberNonce(nonce, expiresAtSeconds, nowSeconds) {
      for (const [seen, expiry] of Object.entries(state.nonces)) {
        if (expiry < nowSeconds) delete state.nonces[seen];
      }
      if (state.nonces[nonce]) return false;
      state.nonces[nonce] = expiresAtSeconds;
      return true;
    },
  };
}
