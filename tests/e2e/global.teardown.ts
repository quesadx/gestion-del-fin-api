/**
 * Global teardown for Playwright E2E tests.
 *
 * Runs once after ALL E2E spec files complete to clean up test artifacts.
 * Does NOT truncate the database — truncation is done on the NEXT setup run
 * (truncate-on-next-run pattern is safer: if teardown fails, the DB is not
 * left in an unknown partially-truncated state).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalTeardown(): Promise<void> {
  const tokensFile = path.join(__dirname, '.auth', 'tokens.json');
  if (fs.existsSync(tokensFile)) {
    fs.unlinkSync(tokensFile);
    console.log('Teardown: removed tokens.json');
  }

  const authDir = path.join(__dirname, '.auth');
  if (fs.existsSync(authDir)) {
    const remaining = fs.readdirSync(authDir);
    if (remaining.length === 0) {
      fs.rmdirSync(authDir);
      console.log('Teardown: removed .auth directory');
    }
  }

  console.log('E2E teardown complete');
}

export default globalTeardown;
