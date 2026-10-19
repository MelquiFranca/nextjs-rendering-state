import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { listInventory } from "@/lib/inventory-repository";
import type { InventoryResponse, RenderingStrategy } from "@/types/inventory";

const readCachedInventory = unstable_cache(
  async () => listInventory(db),
  ["inventory-snapshot"],
  { revalidate: 60, tags: ["inventory"] },
);

export async function getInitialInventory(
  strategy: RenderingStrategy,
): Promise<InventoryResponse | null> {
  if (strategy === "client") return null;

  const items = strategy === "cached" ? await readCachedInventory() : await listInventory(db);

  return {
    items,
    fetchedAt: new Date().toISOString(),
    source: strategy === "cached" ? "server cache" : "dynamic",
  };
}
