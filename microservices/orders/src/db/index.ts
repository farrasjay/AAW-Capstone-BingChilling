import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const DB_HOST = process.env.DB_HOST ?? "orders-database.cj9okkh95hta.us-east-1.rds.amazonaws.com";
const DB_PORT = (process.env.DB_PORT as number | undefined) ?? 5432;
const DB_USER = process.env.DB_USER ?? "postgres"
const DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres"
const DB_NAME = process.env.DB_NAME ?? "postgres"

export const pool = new Pool({
  connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  // ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);
