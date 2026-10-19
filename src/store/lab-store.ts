import { create } from "zustand";
import type { InventoryResponse, ReservationResponse } from "@/types/inventory";

type LabStore = {
  quantities: Record<string, number>;
  diagnosticOpen: boolean;
  snapshot: InventoryResponse | null;
  snapshotKey: string | null;
  setQuantity: (productId: string, quantity: number) => void;
  toggleDiagnostic: () => void;
  initializeSnapshot: (key: string, data: InventoryResponse) => void;
  applyLocalConfirmation: (result: ReservationResponse) => void;
  clearSnapshot: () => void;
};

export const useLabStore = create<LabStore>((set) => ({
  quantities: {},
  diagnosticOpen: true,
  snapshot: null,
  snapshotKey: null,
  setQuantity: (productId, quantity) =>
    set((state) => ({ quantities: { ...state.quantities, [productId]: quantity } })),
  toggleDiagnostic: () => set((state) => ({ diagnosticOpen: !state.diagnosticOpen })),
  initializeSnapshot: (key, data) =>
    set((state) =>
      state.snapshotKey === key
        ? state
        : {
            snapshotKey: key,
            snapshot: { ...data, source: "local snapshot" },
          },
    ),
  applyLocalConfirmation: (result) =>
    set((state) =>
      state.snapshot
        ? {
            snapshot: {
              ...state.snapshot,
              fetchedAt: result.confirmedAt,
              items: state.snapshot.items.map((item) =>
                item.productId === result.item.productId ? result.item : item,
              ),
            },
          }
        : state,
    ),
  clearSnapshot: () => set({ snapshot: null, snapshotKey: null }),
}));
