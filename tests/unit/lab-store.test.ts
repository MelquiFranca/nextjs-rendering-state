import { beforeEach, describe, expect, it } from "vitest";
import { useLabStore } from "@/store/lab-store";
import type { InventoryResponse } from "@/types/inventory";

const initial: InventoryResponse = {
  source: "dynamic",
  fetchedAt: "2026-01-01T00:00:00.000Z",
  items: [{
    productId: "scanner-pro",
    name: "Scanner Pro X1",
    available: 12,
    version: 41,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }],
};

describe("vulnerable local snapshot", () => {
  beforeEach(() => useLabStore.getState().clearSnapshot());

  it("ignores a newer remote value until an explicit reset", () => {
    useLabStore.getState().initializeSnapshot("A:client", initial);
    useLabStore.getState().initializeSnapshot("A:client", {
      ...initial,
      items: [{ ...initial.items[0], available: 7, version: 42 }],
    });

    expect(useLabStore.getState().snapshot?.items[0].available).toBe(12);
    expect(useLabStore.getState().snapshot?.source).toBe("local snapshot");
  });
});
