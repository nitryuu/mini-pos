import { Payment } from "@/models";
import { IPaymentsRepository } from "@/repositories/payments.repo";

export interface IPaymentsService {
  list(): Promise<Payment[]>;
}

export class PaymentsService implements IPaymentsService {
  constructor(private repo: IPaymentsRepository) {}

  list(): Promise<Payment[]> {
    return this.repo.list();
  }
}
