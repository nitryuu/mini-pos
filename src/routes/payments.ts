import { createPaymentsController } from "@/controllers/payments.ctrl";
import { db } from "@/lib/db";
import { PaymentsRepository } from "@/repositories/payments.repo";
import { PaymentsService } from "@/services/payments.svc";
import { Hono } from "hono";

const repo = new PaymentsRepository(db);
const svc = new PaymentsService(repo);
const ctrl = createPaymentsController(svc);

export const paymentsRoutes = new Hono();
paymentsRoutes.get("/", ...ctrl.list);
