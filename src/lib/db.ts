import { Pool } from "pg";

declare global {
  var staleDataPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5434/stale_data_detective",
    max: 10,
  });
}

export const db = global.staleDataPool ?? createPool();

if (process.env.NODE_ENV !== "production") global.staleDataPool = db;
