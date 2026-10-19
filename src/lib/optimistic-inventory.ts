import type { InventoryResponse, ReservationInput } from "@/types/inventory";

export function applyOptimisticReservation(
  current: InventoryResponse | undefined,
  input: ReservationInput,
): InventoryResponse | undefined {
  if (!current) return current;
  return {
    ...current,
    source: "query cache",
    items: current.items.map((item) =>
      item.productId === input.productId
        ? { ...item, available: Math.max(0, item.available - input.quantity) }
        : item,
    ),
  };
}
