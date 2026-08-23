import { Inngest } from 'inngest';
import config from './index.js';

const inngest = new Inngest({
  id: 'errorlens',
  eventKey: config.inngest.eventKey,
  signingKey: config.inngest.signingKey,
  baseUrl: config.inngest.baseUrl,
  isDev: false,
});

async function checkInngestHealth() {
  const health = { connected: false, latency: null, errors: [] };

  if (!config.inngest.baseUrl) {
    return health;
  }

  try {
    const start = Date.now();
    await fetch(config.inngest.baseUrl, { signal: AbortSignal.timeout(3000) });
    health.connected = true;
    health.latency = Date.now() - start;
  } catch (error) {
    health.errors.push(`Inngest: ${error.message}`);
  }

  return health;
}

export { inngest, checkInngestHealth };
