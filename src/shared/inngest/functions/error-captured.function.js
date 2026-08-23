import { inngest } from '../../../config/inngest.js';
import config from '../../../config/index.js';
import logger from '../../utils/logger.js';
import { getReadDB, getWriteDB } from '../../../config/databases.js';
import { formatWebhookPayload } from '../../utils/webhook-formatter.js';
import { analyzeError } from '../../ai/index.js';

const ERROR_EVENT_SELECT = {
  id: true,
  message: true,
  stackTrace: true,
  fileName: true,
  lineNumber: true,
  codeSnippet: true,
  environment: true,
  occurrenceCount: true,
  fingerprint: true,
};

const PROJECT_SELECT = {
  id: true,
  name: true,
  webhookUrl: true,
  webhookProvider: true,
  githubOwner: true,
  githubRepo: true,
};

const errorCaptured = inngest.createFunction(
  { id: 'error-captured', triggers: { event: 'error/captured' } },
  async ({ event, step }) => {
    const { errorEventId, projectId } = event.data;

    const { errorEvent, project } = await step.run('load-context', async () => {
      const db = getReadDB();
      const [loadedErrorEvent, loadedProject] = await Promise.all([
        db.errorEvent.findUnique({ where: { id: errorEventId }, select: ERROR_EVENT_SELECT }),
        db.project.findUnique({ where: { id: projectId }, select: PROJECT_SELECT }),
      ]);
      return { errorEvent: loadedErrorEvent, project: loadedProject };
    });

    if (!errorEvent || !project) {
      logger.warn('Inngest: error-captured skipped, event or project missing', {
        errorEventId,
        projectId,
      });
      return { skipped: true };
    }

    let aiAnalysis = null;

    if (config.ai.apiKey) {
      aiAnalysis = await step.run('llm-analysis', async () => {
        const analysis = await analyzeError(errorEvent);

        if (analysis) {
          const db = getWriteDB();
          await db.errorEvent.update({
            where: { id: errorEvent.id },
            data: { aiAnalysis: analysis },
          });
        }

        return analysis;
      });
    }

    if (config.github.token && project.githubOwner && project.githubRepo) {
      await step.run('git-correlation', async () => {
        logger.info('Git correlation not yet implemented, skipping', { projectId });
      });
    }

    let delivered = false;

    if (project.webhookUrl && project.webhookProvider) {
      delivered = await step.run('deliver-webhook', async () => {
        const enrichedErrorEvent = { ...errorEvent, aiAnalysis };
        const payload = formatWebhookPayload(project.webhookProvider, enrichedErrorEvent, project);
        const response = await fetch(project.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed with status ${response.status}`);
        }

        return true;
      });
    }

    return { delivered, analyzed: Boolean(aiAnalysis) };
  }
);

export { errorCaptured };
