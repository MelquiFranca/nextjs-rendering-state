import { Suspense } from "react";
import { InventoryLab } from "@/components/organisms/InventoryLab/InventoryLab";
import { InventorySkeleton } from "@/components/organisms/InventoryLab/InventorySkeleton";
import { getInitialInventory } from "@/lib/inventory-data";
import type { LabMode, Operator, RenderingStrategy } from "@/types/inventory";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function InventoryContent({ params }: { params: Params }) {
  const operator: Operator = first(params.operator) === "B" ? "B" : "A";
  const mode: LabMode = first(params.mode) === "fixed" ? "fixed" : "vulnerable";
  const strategyValue = first(params.strategy);
  const strategy: RenderingStrategy =
    strategyValue === "dynamic" || strategyValue === "client" ? strategyValue : "cached";
  const initialData = await getInitialInventory(strategy);

  return (
    <InventoryLab
      operator={operator}
      mode={mode}
      strategy={strategy}
      initialData={initialData}
      selectedProduct={first(params.product)}
      availability={first(params.availability) === "available" ? "available" : "all"}
    />
  );
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <InventoryContent params={params} />
    </Suspense>
  );
}
