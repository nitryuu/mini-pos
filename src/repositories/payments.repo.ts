import { DB } from "@/lib/db";
import { Payment, payments } from "@/models";
import { PaymentInput } from "@/schemas/payment.schema";

export interface IPaymentsRepository {
  create(input: PaymentInput): Promise<Payment>;
}

export class PaymentsRepository implements IPaymentsRepository {
  constructor(private db: DB) { }

  async create(input: PaymentInput): Promise<Payment> {
    const [res] = await this.db.insert(payments).values(input).returning();
    return res;
  }
}
