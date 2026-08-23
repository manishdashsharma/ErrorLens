import { getWriteDB, getReadDB } from '../../../config/databases.js';
import { generateApiKey } from '../../../shared/index.js';

const PROJECT_SELECT = {
  id: true,
  name: true,
  webhookUrl: true,
  webhookProvider: true,
  githubOwner: true,
  githubRepo: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const API_KEY_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  isActive: true,
  lastUsedAt: true,
  createdAt: true,
};

const createProjectService = async (data) => {
  const db = getWriteDB();
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const created = await db.project.create({
    data: {
      name: data.name,
      webhookUrl: data.webhookUrl,
      webhookProvider: data.webhookProvider,
      githubOwner: data.githubOwner,
      githubRepo: data.githubRepo,
      apiKeys: {
        create: { name: 'default', keyHash, keyPrefix },
      },
    },
    select: {
      ...PROJECT_SELECT,
      apiKeys: { select: API_KEY_SELECT },
    },
  });

  const { apiKeys, ...project } = created;
  const [apiKey] = apiKeys;

  return { project, apiKey: { ...apiKey, key: rawKey } };
};

const getProjectsService = async ({ page, limit }) => {
  const db = getReadDB();
  const skip = (page - 1) * limit;

  const [total, projects] = await Promise.all([
    db.project.count({ where: { isActive: true } }),
    db.project.findMany({
      where: { isActive: true },
      select: PROJECT_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const totalPage = Math.ceil(total / limit);
  const nextPage = page < totalPage ? page + 1 : null;

  return { projects, pagination: { page, limit, totalPage, nextPage } };
};

const getProjectByIdService = async (projectId) => {
  const db = getReadDB();

  const project = await db.project.findFirst({
    where: { id: projectId, isActive: true },
    select: {
      ...PROJECT_SELECT,
      apiKeys: {
        where: { isActive: true },
        select: API_KEY_SELECT,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return { project };
};

const createApiKeyService = async (projectId, data) => {
  const db = getWriteDB();

  const project = await db.project.findFirst({
    where: { id: projectId, isActive: true },
    select: { id: true },
  });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const apiKey = await db.apiKey.create({
    data: { projectId, name: data.name, keyHash, keyPrefix },
    select: API_KEY_SELECT,
  });

  return { apiKey: { ...apiKey, key: rawKey } };
};

const revokeApiKeyService = async (projectId, apiKeyId) => {
  const db = getWriteDB();

  const existing = await db.apiKey.findFirst({
    where: { id: apiKeyId, projectId, isActive: true },
    select: { id: true },
  });

  if (!existing) {
    const error = new Error('API key not found');
    error.statusCode = 404;
    throw error;
  }

  const apiKey = await db.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false },
    select: API_KEY_SELECT,
  });

  return { apiKey };
};

export {
  createProjectService,
  getProjectsService,
  getProjectByIdService,
  createApiKeyService,
  revokeApiKeyService,
};
