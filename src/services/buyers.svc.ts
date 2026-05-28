import { AppError } from "@/lib/error";
import { Buyer } from "@/models";
import { IBuyersRepository } from "@/repositories/buyers.repo";
import {
  BuyerInput,
  ListBuyersInput,
  ListBuyersResponse,
} from "@/schemas/buyer.schema";

export interface IBuyersService {
  list(input: ListBuyersInput): Promise<ListBuyersResponse>;
  create(input: BuyerInput): Promise<Buyer>;
  getById(id: number): Promise<Buyer>;
  updateById(id: number, input: BuyerInput): Promise<Buyer>;
  deleteById(id: number): Promise<Buyer>;
}

export const ERROR = {
  NOT_FOUND: new AppError("Buyer not found", 404),
};

export class BuyersService implements IBuyersService {
  constructor(private repo: IBuyersRepository) { }

  list(input: ListBuyersInput): Promise<ListBuyersResponse> {
    return this.repo.list(input);
  }

  create(input: BuyerInput): Promise<Buyer> {
    return this.repo.create(input);
  }

  async getById(id: number): Promise<Buyer> {
    const buyer = await this.repo.getById(id);
    if (!buyer) throw ERROR.NOT_FOUND;
    return buyer;
  }

  async updateById(id: number, input: BuyerInput): Promise<Buyer> {
    const buyer = await this.repo.updateById(id, input);
    if (!buyer) throw ERROR.NOT_FOUND;
    return buyer;
  }

  async deleteById(id: number): Promise<Buyer> {
    const buyer = await this.repo.deleteById(id);
    if (!buyer) throw ERROR.NOT_FOUND;
    return buyer;
  }
}
