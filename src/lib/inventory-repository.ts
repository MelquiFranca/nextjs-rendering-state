import type { Pool, PoolClient, QueryResultRow } from "pg";
import type { InventoryItem } from "@/types/inventory";

type Database = Pick<Pool | PoolClient, "query">;

type InventoryRow = QueryResultRow & {
  product_id: string;
  name: string;
  available: number;
  version: number;
  updated_at: Date;
};

const seedRows = [
  ["scanner-pro", "Scanner Pro X1", 12, 41],
  ["label-printer", "Impressora de etiquetas", 7, 18],
  ["thermal-roll", "Rolo térmico premium", 24, 9],
] as const;

function mapRow(row: InventoryRow): InventoryItem {
  return {
    productId: row.product_id,
    name: row.name,
    available: row.available,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listInventory(database: Database): Promise<InventoryItem[]> {
  const result = await database.query<InventoryRow>(
    `SELECT product_id, name, available, version, updated_at
       FROM inventory
      ORDER BY product_id`,
  );
  return result.rows.map(mapRow);
}

export async function findInventoryItem(database: Database, productId: string): Promise<InventoryItem | null> {
  const result = await database.query<InventoryRow>(
    `SELECT product_id, name, available, version, updated_at
       FROM inventory
      WHERE product_id = $1`,
    [productId],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function reserveInventory(
  database: Database,
  productId: string,
  quantity: number,
): Promise<InventoryItem | null> {
  const result = await database.query<InventoryRow>(
    `UPDATE inventory
        SET available = available - $1,
            version = version + 1,
            updated_at = NOW()
      WHERE product_id = $2
        AND available >= $1
      RETURNING product_id, name, available, version, updated_at`,
    [quantity, productId],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function resetInventory(database: Database): Promise<InventoryItem[]> {
  const values = seedRows.flatMap((row) => row);
  await database.query(
    `INSERT INTO inventory (product_id, name, available, version, updated_at)
     VALUES
       ($1, $2, $3, $4, NOW()),
       ($5, $6, $7, $8, NOW()),
       ($9, $10, $11, $12, NOW())
     ON CONFLICT (product_id) DO UPDATE
       SET name = EXCLUDED.name,
           available = EXCLUDED.available,
           version = EXCLUDED.version,
           updated_at = NOW()`,
    values,
  );
  return listInventory(database);
}
