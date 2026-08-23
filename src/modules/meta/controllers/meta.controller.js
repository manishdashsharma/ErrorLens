import { httpResponse, responseMessage, asyncHandler } from '../../../shared/index.js';
import config from '../../../config/index.js';

const getMeta = asyncHandler(async (req, res) => {
  return httpResponse(req, res, 200, responseMessage.SUCCESS.OK, {
    name: 'ErrorLens',
    version: config.apiVersion,
    author: 'Manish Dash Sharma',
  });
});

export { getMeta };
