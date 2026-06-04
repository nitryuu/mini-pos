import z from "zod";

export type MetricsResponse = {
  totalOrders: number;
  totalRevenue: number;
  topProducts: {
    productId: number | null;
    name: string;
    totalQty: number;
    totalRevenue: number;
  }[];
  updatedAt: string;
};

export const metricsSchema = z.object({
  token: z.string(),
});
