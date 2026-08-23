import { getWriteDB, getReadDB } from '../../../config/databases.js';
import { getRedisClient } from '../../../config/redis.js';
import { computeFingerprint, inngest, EErrorStatus } from '../../../shared/index.js';

const DEDUP_TTL_SECONDS = 60 * 60;

const ERROR_EVENT_SELECT = {
  id: true,
  projectId: true,
  fingerprint: true,
  message: true,
  stackTrace: true,
  fileName: true,
  lineNumber: true,
  codeSnippet: true,
  environment: true,
  occurrenceCount: true,
  status: true,
  firstSeenAt: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
};

const ingestErrorService = async (project, payload) => {
  const fingerprint = computeFingerprint(payload);
  const dedupKey = `dedup:${project.id}:${fingerprint}`;

  const redis = getRedisClient();
  let isNewOccurrence = true;
  if (redis) {
    const setResult = await redis.set(dedupKey, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
    isNewOccurrence = setResult === 'OK';
  }

  const db = getWriteDB();
  const errorEvent = await db.errorEvent.upsert({
    where: { projectId_fingerprint: { projectId: project.id, fingerprint } },
    create: {
      projectId: project.id,
      fingerprint,
      message: payload.message,
      stackTrace: payload.stack,
      fileName: payload.fileName,
      lineNumber: payload.lineNumber,
      codeSnippet: payload.codeSnippet,
      environment: payload.environment,
      occurrenceCount: 1,
    },
    update: {
      occurrenceCount: { increment: 1 },
      lastSeenAt: new Date(),
      status: isNewOccurrence ? EErrorStatus.NEW : undefined,
    },
    select: ERROR_EVENT_SELECT,
  });

  if (isNewOccurrence) {
    await inngest.send({
      name: 'error/captured',
      data: { errorEventId: errorEvent.id, projectId: project.id },
    });
  }

  return { received: true, errorEventId: errorEvent.id, isNew: isNewOccurrence };
};

const getErrorsService = async ({ page, limit, projectId, status }) => {
  const db = getReadDB();
  const skip = (page - 1) * limit;
  const where = {
    isActive: true,
    ...(projectId ? { projectId } : {}),
    ...(status ? { status } : {}),
  };

  const [total, errors] = await Promise.all([
    db.errorEvent.count({ where }),
    db.errorEvent.findMany({
      where,
      select: ERROR_EVENT_SELECT,
      orderBy: { lastSeenAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const totalPage = Math.ceil(total / limit);
  const nextPage = page < totalPage ? page + 1 : null;

  return { errors, pagination: { page, limit, totalPage, nextPage } };
};

const getErrorByIdService = async (errorId) => {
  const db = getReadDB();

  const errorEvent = await db.errorEvent.findFirst({
    where: { id: errorId, isActive: true },
    select: ERROR_EVENT_SELECT,
  });

  if (!errorEvent) {
    const error = new Error('Error event not found');
    error.statusCode = 404;
    throw error;
  }

  return { errorEvent };
};

const updateErrorStatusService = async (errorId, status) => {
  const db = getWriteDB();

  const existing = await db.errorEvent.findFirst({
    where: { id: errorId, isActive: true },
    select: { id: true },
  });

  if (!existing) {
    const error = new Error('Error event not found');
    error.statusCode = 404;
    throw error;
  }

  const errorEvent = await db.errorEvent.update({
    where: { id: errorId },
    data: { status },
    select: ERROR_EVENT_SELECT,
  });

  return { errorEvent };
};

const resolveErrorService = (errorId) => updateErrorStatusService(errorId, EErrorStatus.RESOLVED);
const ignoreErrorService = (errorId) => updateErrorStatusService(errorId, EErrorStatus.IGNORED);

export {
  ingestErrorService,
  getErrorsService,
  getErrorByIdService,
  resolveErrorService,
  ignoreErrorService,
};
