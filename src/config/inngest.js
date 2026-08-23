import { Inngest } from 'inngest';
import config from './index.js';

const inngest = new Inngest({
  id: 'errorlens',
  eventKey: config.inngest.eventKey,
  signingKey: config.inngest.signingKey,
  baseUrl: config.inngest.baseUrl,
  isDev: false,
});

export { inngest };
