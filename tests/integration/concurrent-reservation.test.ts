import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findInventoryItem, reserveInventory, resetInventory } from "@/lib/inventory-repository";

const connectionString = process.env.TEST_DATABASE_URL;
const suite = connectionString ? describe : describe.skip;

suite("atomic reservation", () => {
  const pool = new Pool({ connectionString });

  beforeAll(async () => {
    const schema = await readFile(resolve("database/schema.sql"), "utf8");
    await pool.query(schema);
  });

  afterAll(async () => {
    await resetInventory(pool);
    await pool.end();
  });

  it("accepts exactly one of two concurrent reservations for the last unit", async () => {
    await pool.query(
      "UPDATE inventory SET available = 1, version = 100, updated_at = NOW() WHERE product_id = 'scanner-pro'",
    );

    const results = await Promise.all([
      reserveInventory(pool, "scanner-pro", 1),
      reserveInventory(pool, "scanner-pro", 1),
    ]);
    const finalItem = await findInventoryItem(pool, "scanner-pro");

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(finalItem?.available).toBe(0);
    expect(finalItem?.version).toBe(101);
  });
});
