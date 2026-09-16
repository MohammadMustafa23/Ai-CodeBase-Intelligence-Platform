import { Queue } from "bullmq";
import { redis } from "../../../config/redis.js";

export const scanQueue = new Queue("repository-scan", {
  connection: redis,
});
