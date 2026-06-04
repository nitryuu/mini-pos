import { config } from "@/config";
import { getCached, invalidateCachePattern } from "@/lib/cache";
import { AppError } from "@/lib/error";
import { Buyer } from "@/models";
import { IBuyersRepository } from "@/repositories/buyers.repo";
import {
  BuyerInput,
  ListBuyersInput,
  ListBuyersResponse,
} from "@/schemas/buyer.schema";
import Redis from "ioredis";

export interface IBuyersService {
  list(input: ListBuyersInput): Promise<ListBuyersResponse>;
  create(input: BuyerInput): Promise<Buyer>;
  getById(id: number): Promise<Buyer>;
  updateById(id: number, input: BuyerInput): Promise<Buyer>;
  deleteById(id: number): Promise<Buyer>;
}

const CACHE_KEY = {
  list: (params: string) => `buyers:list:${params}`,
  getById: (id: number) => `buyers:${id}`,
};

export const ERROR = {
  NOT_FOUND: new AppError("Buyer not found", 404),
};

export class BuyersService implements IBuyersService {
  constructor(
    private repo: IBuyersRepository,
    private redis: Redis,
  ) {}

  async list(input: ListBuyersInput): Promise<ListBuyersResponse> {
    const key = CACHE_KEY.list(JSON.stringify(input));
    const buyers = await getCached(
      key,
      config.redis.cache.buyers,
      () => this.repo.list(input),
      this.redis,
    );

    return buyers;
  }

  async create(input: BuyerInput): Promise<Buyer> {
    const buyer = await this.repo.create(input);
    await invalidateCachePattern("buyers:*", this.redis);
    return buyer;
  }

  async getById(id: number): Promise<Buyer> {
    const key = CACHE_KEY.getById(id);
    const buyer = await getCached(
      key,
      config.redis.cache.buyers,
      () => this.repo.getById(id),
      this.redis,
    );

    if (!buyer) throw ERROR.NOT_FOUND;
    return buyer;
  }

  async updateById(id: number, input: BuyerInput): Promise<Buyer> {
    const buyer = await this.repo.updateById(id, input);
    if (!buyer) throw ERROR.NOT_FOUND;
    await invalidateCachePattern("buyers:*", this.redis);
    return buyer;
  }

  async deleteById(id: number): Promise<Buyer> {
    const buyer = await this.repo.deleteById(id);
    if (!buyer) throw ERROR.NOT_FOUND;
    await invalidateCachePattern("buyers:*", this.redis);
    return buyer;
  }
}
