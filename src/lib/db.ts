import { config } from "@/config";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "@/models/index";
import { SQL } from "bun";

const client = new SQL(config.db.url);
export const db = drizzle({ client, schema, casing: "snake_case" });

export type DB = typeof db;
export type TX = Parameters<Parameters<DB["transaction"]>[0]>[0];
