import { errorCaptured } from './error-captured.function.js';
import { errorRetention } from './error-retention.function.js';

const inngestFunctions = [errorCaptured, errorRetention];

export { inngestFunctions };
