import { inngest } from '../../../config/inngest.js';
import config from '../../../config/index.js';
import logger from '../../utils/logger.js';
import { getWriteDB } from '../../../config/databases.js';
import { EErrorStatus } from '../../constant/error-event.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const errorRetention = inngest.createFunction(
  { id: 'error-retention', triggers: { cron: '0 3 * * *' } },
  async ({ step }) => {
    const cutoff = await step.run('compute-cutoff', async () => {
      return new Date(Date.now() - (config.retention.days * MS_PER_DAY)).toISOString();
    });

    const purgedCount = await step.run('purge-old-resolved-errors', async () => {
      const db = getWriteDB();
      const result = await db.errorEvent.updateMany({
        where: {
          isActive: true,
          status: { in: [EErrorStatus.RESOLVED, EErrorStatus.IGNORED] },
          lastSeenAt: { lt: new Date(cutoff) },
        },
        data: { isActive: false },
      });
      return result.count;
    });

    logger.info('Error retention purge completed', { purgedCount, retentionDays: config.retention.days });

    return { purgedCount };
  }
);

export { errorRetention };
