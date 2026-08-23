import { inngest } from '../../../config/inngest.js';
import logger from '../../utils/logger.js';

const errorCaptured = inngest.createFunction(
  { id: 'error-captured', triggers: { event: 'error/captured' } },
  async ({ event, step }) => {
    await step.run('log-received', async () => {
      logger.info('Inngest: error/captured received', { data: event.data });
    });
  }
);

export { errorCaptured };
