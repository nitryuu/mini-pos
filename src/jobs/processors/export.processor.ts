import { config } from "@/config";
import { db } from "@/lib/db";
import { orders } from "@/models";
import { Job } from "bullmq";
import dayjs from "dayjs";
import { between } from "drizzle-orm";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";

export type ExportJobData = {
  startDate: string;
  endDate: string;
  userId: number;
};

export type ExportJobResult = {
  filename: string;
  url: string;
};

export const exportProcessor = async (
  job: Job<ExportJobData>,
): Promise<ExportJobResult> => {
  const { startDate, endDate } = job.data;

  const allOrders = await db.query.orders.findMany({
    where: between(
      orders.createdAt,
      dayjs(startDate).startOf("day").toDate(),
      dayjs(endDate).endOf("day").toDate(),
    ),
    with: { items: true },
  });

  await job.updateProgress(25);

  const rows = [
    "Order Number,Date,Buyer,Total,Paid,Balance,Status,Items",
    ...allOrders.map((order) =>
      [
        order.orderNumber,
        dayjs(order.createdAt).format("YYYY-MM-DD HH:mm"),
        order.buyerId ?? "Walk-in",
        order.total,
        order.items.map((i) => `${i.name} x${i.qty}`).join(" | "),
      ].join(","),
    ),
  ].join("\n");

  await job.updateProgress(75);

  const dir = join(config.upload.dir, "exports");
  const filename = `orders-${dayjs(startDate).isSame(endDate) ? dayjs(startDate).format("YYYYMMDD") : dayjs(startDate).format("YYYYMMDD")}-${dayjs(endDate).format("YYYYMMDD")}.csv`;
  const filepath = join(dir, filename);

  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(filepath, rows);

  await job.updateProgress(100);

  return { filename, url: `/uploads/exports/${filename}` };
};
