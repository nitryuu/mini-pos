import { payments } from "@/models";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

export const paymentSchema = createInsertSchema(payments);

export type PaymentInput = z.infer<typeof paymentSchema>;
