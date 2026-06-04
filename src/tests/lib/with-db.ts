import { DB } from "@/lib/db";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach } from "vitest";
import * as schema from "@/models/index";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { PaymentsRepository } from "@/repositories/payments.repo";
import { SQL } from "bun";
import { Wait } from "testcontainers";

let client: SQL;
let db: DB;

export const getDb = () => db;

export const useDb = () => {
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:18")
      .withDatabase("test")
      .withUsername("test")
      .withPassword("test")
      .start();

    client = new SQL(container.getConnectionUri());

    db = drizzle({
      client,
      schema,
      casing: "snake_case",
    });

    await migrate(db, { migrationsFolder: "./drizzle" });

    const paymentRepo = new PaymentsRepository(getDb());
    await Promise.all([
      paymentRepo.create({ name: "Cash" }),
      paymentRepo.create({ name: "Transfer" }),
    ]);
  });

  beforeEach(async () => {
    await Promise.all([
      db.delete(schema.buyers),
      db.delete(schema.users),
      db.delete(schema.orders),
      db.delete(schema.products),
    ]);
  });

  afterAll(async () => {
    await db.delete(schema.payments);
    await client.end();
    await container.stop();
  });
};
