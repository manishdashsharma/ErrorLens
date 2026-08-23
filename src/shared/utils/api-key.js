import { randomBytes, createHash } from 'crypto';

const API_KEY_PREFIX = 'el';
const API_KEY_PREFIX_LENGTH = 12;

const hashApiKey = (rawKey) => createHash('sha256').update(rawKey).digest('hex');

const generateApiKey = () => {
  const secret = randomBytes(24).toString('base64url');
  const rawKey = `${API_KEY_PREFIX}_${secret}`;

  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, API_KEY_PREFIX_LENGTH),
  };
};

export { generateApiKey, hashApiKey };
