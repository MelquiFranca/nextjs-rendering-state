import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetInventory } from "@/lib/inventory-repository";

export async function POST() {
  try {
    const items = await resetInventory(db);
    return NextResponse.json({
      items,
      fetchedAt: new Date().toISOString(),
      source: "query cache",
    });
  } catch (error) {
    console.error("inventory.reset_failed", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Não foi possível restaurar o cenário." },
      { status: 500 },
    );
  }
}
