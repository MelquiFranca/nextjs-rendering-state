import { Pool } from "pg";
import { resetInventory } from "../src/lib/inventory-repository";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5434/stale_data_detective",
});

try {
  await resetInventory(pool);
  console.log("Demo inventory was reset.");
} finally {
  await pool.end();
}
