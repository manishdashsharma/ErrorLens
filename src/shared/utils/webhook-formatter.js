import { EWebhookProvider } from '../constant/webhook.js';

const STACK_PREVIEW_LENGTH = 500;
const EMBED_TITLE_LIMIT = 256;
const BRAND_COLOR = 0x7c3aed;
const ANALYSIS_PATTERN = /Root cause:\s*([\s\S]*?)\s*Suggested fix:\s*([\s\S]*)/i;
const AI_DISCLAIMER = 'AI-suggested — please verify before applying.';
const ZERO_WIDTH_SPACE = '​';
const DISCORD_SPACER_FIELD = { name: ZERO_WIDTH_SPACE, value: ZERO_WIDTH_SPACE, inline: false };

const parseAiAnalysis = (aiAnalysis) => {
  if (!aiAnalysis) {
    return null;
  }

  const match = aiAnalysis.match(ANALYSIS_PATTERN);
  if (!match) {
    return { rootCause: aiAnalysis.trim(), suggestedFix: null };
  }

  return { rootCause: match[1].trim(), suggestedFix: match[2].trim() };
};

const formatSlackPayload = (errorEvent, project) => {
  const analysis = parseAiAnalysis(errorEvent.aiAnalysis);

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: errorEvent.message.slice(0, 150), emoji: false },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Project:* ${project.name}  |  *Occurrences:* ${errorEvent.occurrenceCount}  |  *Environment:* ${errorEvent.environment || 'unknown'}`,
        },
      ],
    },
  ];

  if (analysis) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*What caused it*\n${analysis.rootCause}` },
    });
    if (analysis.suggestedFix) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*How to fix it*\n${analysis.suggestedFix}\n\n_${AI_DISCLAIMER}_`,
        },
      });
    }
  }

  if (errorEvent.stackTrace) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Stack trace*\n\`\`\`${errorEvent.stackTrace.slice(0, STACK_PREVIEW_LENGTH)}\`\`\``,
      },
    });
  }

  return { blocks };
};

const formatDiscordPayload = (errorEvent, project) => {
  const analysis = parseAiAnalysis(errorEvent.aiAnalysis);
  const fields = [];

  if (analysis) {
    fields.push({ name: 'What caused it', value: analysis.rootCause, inline: false });
    if (analysis.suggestedFix) {
      fields.push(DISCORD_SPACER_FIELD);
      fields.push({
        name: 'How to fix it',
        value: `${analysis.suggestedFix}\n\n*${AI_DISCLAIMER}*`,
        inline: false,
      });
    }
  }

  if (errorEvent.stackTrace) {
    fields.push(DISCORD_SPACER_FIELD);
    fields.push({
      name: 'Stack trace',
      value: `\`\`\`\n${errorEvent.stackTrace.slice(0, STACK_PREVIEW_LENGTH)}\n\`\`\``,
      inline: false,
    });
  }

  fields.push(
    DISCORD_SPACER_FIELD,
    { name: 'Project', value: project.name, inline: true },
    { name: 'Occurrences', value: String(errorEvent.occurrenceCount), inline: true },
    { name: 'Environment', value: errorEvent.environment || 'unknown', inline: true }
  );

  return {
    embeds: [
      {
        title: errorEvent.message.slice(0, EMBED_TITLE_LIMIT),
        color: BRAND_COLOR,
        fields,
        footer: { text: 'ErrorLens' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
};

const formatTeamsPayload = (errorEvent, project) => {
  const analysis = parseAiAnalysis(errorEvent.aiAnalysis);
  const facts = [
    { name: 'Project', value: project.name },
    { name: 'Occurrences', value: String(errorEvent.occurrenceCount) },
    { name: 'Environment', value: errorEvent.environment || 'unknown' },
  ];

  const sections = [{ facts }];

  if (analysis) {
    sections.unshift({ activityTitle: 'What caused it', text: analysis.rootCause });
    if (analysis.suggestedFix) {
      sections.splice(1, 0, {
        activityTitle: 'How to fix it',
        text: `${analysis.suggestedFix}\n\n_${AI_DISCLAIMER}_`,
      });
    }
  }

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary: errorEvent.message,
    themeColor: '7C3AED',
    title: errorEvent.message,
    sections,
  };
};

const formatCustomPayload = (errorEvent, project) => {
  const analysis = parseAiAnalysis(errorEvent.aiAnalysis);

  return {
    event: 'error.captured',
    project: project.name,
    message: errorEvent.message,
    occurrenceCount: errorEvent.occurrenceCount,
    environment: errorEvent.environment,
    fingerprint: errorEvent.fingerprint,
    rootCause: analysis?.rootCause || null,
    suggestedFix: analysis?.suggestedFix || null,
  };
};

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
