import { redis } from "@/lib/redis";
import { Queue } from "bullmq";

export const exportQueue = new Queue("export", { connection: redis });
