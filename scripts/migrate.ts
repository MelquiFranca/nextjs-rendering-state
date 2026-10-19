import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const target = process.argv.includes("--test")
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: target ?? "postgresql://postgres:postgres@localhost:5434/stale_data_detective",
});

try {
  const sql = await readFile(resolve("database/schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Inventory schema is ready.");
} finally {
  await pool.end();
}
