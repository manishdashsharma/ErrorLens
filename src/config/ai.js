import OpenAI from 'openai';
import config from './index.js';

let ai;

function getAiClient() {
  if (!ai) {
    ai = new OpenAI({
      apiKey: config.ai.apiKey,
      baseURL: config.ai.baseUrl,
    });
  }
  return ai;
}

export { getAiClient };
