import IORedis from "ioredis";
export const redis = new IORedis(process.env.REDIS_URL);

export const workerRedis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});