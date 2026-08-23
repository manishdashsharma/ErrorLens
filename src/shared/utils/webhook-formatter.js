import { EWebhookProvider } from '../constant/webhook.js';

const STACK_PREVIEW_LENGTH = 500;

const formatSlackPayload = (errorEvent, project) => ({
  text: `🐛 *${errorEvent.message}*\nProject: ${project.name} | Occurrences: ${errorEvent.occurrenceCount} | Environment: ${errorEvent.environment || 'unknown'}`,
});

const formatDiscordPayload = (errorEvent, project) => ({
  embeds: [
    {
      title: `🐛 ${errorEvent.message}`.slice(0, 256),
      description: errorEvent.stackTrace
        ? `\`\`\`\n${errorEvent.stackTrace.slice(0, STACK_PREVIEW_LENGTH)}\n\`\`\``
        : undefined,
      color: 0xed4245,
      fields: [
        { name: 'Project', value: project.name, inline: true },
        { name: 'Occurrences', value: String(errorEvent.occurrenceCount), inline: true },
        { name: 'Environment', value: errorEvent.environment || 'unknown', inline: true },
      ],
      timestamp: new Date().toISOString(),
    },
  ],
});

const formatTeamsPayload = (errorEvent, project) => ({
  '@type': 'MessageCard',
  '@context': 'http://schema.org/extensions',
  summary: errorEvent.message,
  themeColor: 'ED4245',
  title: `🐛 ${errorEvent.message}`,
  sections: [
    {
      facts: [
        { name: 'Project', value: project.name },
        { name: 'Occurrences', value: String(errorEvent.occurrenceCount) },
        { name: 'Environment', value: errorEvent.environment || 'unknown' },
      ],
    },
  ],
});

const formatCustomPayload = (errorEvent, project) => ({
  event: 'error.captured',
  project: project.name,
  message: errorEvent.message,
  occurrenceCount: errorEvent.occurrenceCount,
  environment: errorEvent.environment,
  fingerprint: errorEvent.fingerprint,
});

const formatWebhookPayload = (provider, errorEvent, project) => {
  switch (provider) {
  case EWebhookProvider.SLACK:
    return formatSlackPayload(errorEvent, project);
  case EWebhookProvider.DISCORD:
    return formatDiscordPayload(errorEvent, project);
  case EWebhookProvider.TEAMS:
    return formatTeamsPayload(errorEvent, project);
  default:
    return formatCustomPayload(errorEvent, project);
  }
};

export { formatWebhookPayload };
