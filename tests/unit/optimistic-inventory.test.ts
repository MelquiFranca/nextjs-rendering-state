import { describe, expect, it } from "vitest";
import { applyOptimisticReservation } from "@/lib/optimistic-inventory";
import type { InventoryResponse } from "@/types/inventory";

const current: InventoryResponse = {
  source: "dynamic",
  fetchedAt: "2026-01-01T00:00:00.000Z",
  items: [{
    productId: "scanner-pro",
    name: "Scanner Pro X1",
    available: 3,
    version: 41,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }],
};

describe("optimistic inventory", () => {
  it("changes only the query projection and preserves the rollback snapshot", () => {
    const optimistic = applyOptimisticReservation(current, { productId: "scanner-pro", quantity: 2 });

    expect(optimistic?.items[0].available).toBe(1);
    expect(optimistic?.source).toBe("query cache");
    expect(current.items[0].available).toBe(3);
    expect(current.items[0].version).toBe(41);
  });
});
