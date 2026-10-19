import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listInventory } from "@/lib/inventory-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listInventory(db);
    return NextResponse.json(
      { items, fetchedAt: new Date().toISOString(), source: "query cache" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("inventory.read_failed", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Não foi possível consultar o estoque." },
      { status: 500 },
    );
  }
}
