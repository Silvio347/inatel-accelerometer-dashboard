import { config } from '../config';

const p = config.topicPrefix;

export const topics = {
  all: `${p}/#`,
  data: `${p}/data`,
  sourceStatus: `${p}/source/status`,
} as const;
