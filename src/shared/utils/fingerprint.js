import { createHash } from 'crypto';

const STACK_FRAME_LIMIT = 5;

const normalizeStack = (stack) =>
  stack
    .split('\n')
    .slice(0, STACK_FRAME_LIMIT)
    .map((line) => line.replace(/:\d+:\d+/g, '').trim())
    .join('\n');

const computeFingerprint = ({ message, stack, fileName, lineNumber }) => {
  const basis = stack ? normalizeStack(stack) : `${message}|${fileName || ''}|${lineNumber || ''}`;
  return createHash('sha256').update(basis).digest('hex');
};

export { computeFingerprint };
