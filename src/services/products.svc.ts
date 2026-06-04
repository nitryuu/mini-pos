import { config } from "@/config";
import { getCached, invalidateCachePattern } from "@/lib/cache";
import { AppError } from "@/lib/error";
import { deleteFile } from "@/lib/upload";
import { ProductResponse } from "@/models";
import { IProductsRepository } from "@/repositories/products.repo";
import {
  ListProductsInput,
  ListProductsResponse,
  ProductInput,
} from "@/schemas/product.schema";
import { wsManager } from "@/ws/manager";
import Redis from "ioredis";

export interface IProductsService {
  list(input: ListProductsInput): Promise<ListProductsResponse>;
  create(input: ProductInput): Promise<ProductResponse>;
  getById(id: number): Promise<ProductResponse>;
  updateById(id: number, input: ProductInput): Promise<ProductResponse>;
  deleteById(id: number): Promise<ProductResponse>;
}

const CACHE_KEY = {
  list: (params: string) => `products:list:${params}`,
  getById: (id: number) => `products:${id}`,
};

export const LOW_STOCK_THRESHOLD = 5;

export const ERROR = {
  NOT_FOUND: new AppError("Product not found", 404),
  BARCODE_IN_USE: new AppError("Barcode already in use", 409),
};

export class ProductsService implements IProductsService {
  constructor(
    private repo: IProductsRepository,
    private redis: Redis,
  ) {}

  async list(input: ListProductsInput): Promise<ListProductsResponse> {
    const key = CACHE_KEY.list(JSON.stringify(input));
    const products = await getCached(
      key,
      config.redis.cache.products,
      () => this.repo.list(input),
      this.redis,
    );

    return products;
  }

  async create(input: ProductInput): Promise<ProductResponse> {
    const product = await this.repo.create(input);
    if (product === "barcode_in_use") throw ERROR.BARCODE_IN_USE;

    await Promise.all([
      invalidateCachePattern("products:*", this.redis),
      wsManager.broadcast("product:created", { ...product }),
    ]);

    return product;
  }

  async getById(id: number): Promise<ProductResponse> {
    const key = CACHE_KEY.getById(id);
    const product = await getCached(
      key,
      config.redis.cache.products,
      () => this.repo.getById(id),
      this.redis,
    );

    if (!product) throw ERROR.NOT_FOUND;
    return product;
  }

  async updateById(id: number, input: ProductInput): Promise<ProductResponse> {
    const product = await this.repo.updateById(id, input);
    if (!product) throw ERROR.NOT_FOUND;
    if (product === "barcode_in_use") throw ERROR.BARCODE_IN_USE;

    if (product.oldImage && input.image !== product.oldImage)
      await deleteFile(product.oldImage);

    if (product.qty && product.qty > LOW_STOCK_THRESHOLD) {
      await Promise.all([
        this.redis.del(`product_low_stock:${id}`),
        this.redis.del(`product_out_of_stock:${id}`),
      ]);
    }

    await Promise.all([
      invalidateCachePattern("products:*", this.redis),
      wsManager.broadcast("product:updated", { ...product }),
    ]);

    return product;
  }

  async deleteById(id: number): Promise<ProductResponse> {
    const product = await this.repo.deleteById(id);
    if (!product) throw ERROR.NOT_FOUND;
    if (product.image) await deleteFile(product.image);

    await Promise.all([
      this.redis.del(`product_low_stock:${id}`),
      this.redis.del(`product_out_of_stock:${id}`),
      invalidateCachePattern("products:*", this.redis),
      wsManager.broadcast("product:deleted", { id }),
    ]);

    return product;
  }
}
