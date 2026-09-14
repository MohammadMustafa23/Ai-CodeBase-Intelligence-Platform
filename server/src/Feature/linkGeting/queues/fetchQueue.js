import { Queue } from "bullmq";
import { redis } from "../../../config/redis.js";

export const fetchQueue = new Queue("repository-fetch", {
  connection: redis,
});