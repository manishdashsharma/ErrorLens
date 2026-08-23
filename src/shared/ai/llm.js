import { getAiClient } from '../../config/ai.js';
import config from '../../config/index.js';
import { buildErrorAnalysisPrompt } from './prompts/error-analysis.prompt.js';

const analyzeError = async (errorEvent) => {
  const completion = await getAiClient().chat.completions.create({
    model: config.ai.model,
    messages: buildErrorAnalysisPrompt(errorEvent),
    temperature: 0.2,
  });

  return completion.choices[0]?.message?.content || null;
};

export { analyzeError };
