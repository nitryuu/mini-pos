import { DB } from "@/lib/db";
import { Payment, payments } from "@/models";
import { PaymentInput } from "@/schemas/payment.schema";

export interface IPaymentsRepository {
  list(): Promise<Payment[]>;
  create(input: PaymentInput): Promise<Payment>;
}

export class PaymentsRepository implements IPaymentsRepository {
  constructor(private db: DB) {}

  list(): Promise<Payment[]> {
    return this.db.query.payments.findMany();
  }

  async create(input: PaymentInput): Promise<Payment> {
    const [res] = await this.db.insert(payments).values(input).returning();
    return res;
  }
}
