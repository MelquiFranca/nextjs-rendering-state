import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findInventoryItem, reserveInventory } from "@/lib/inventory-repository";

const reservationSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof reservationSchema>;
  try {
    parsed = reservationSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Informe um produto e uma quantidade inteira positiva." },
      { status: 400 },
    );
  }

  try {
    const item = await reserveInventory(db, parsed.productId, parsed.quantity);
    if (item) {
      return NextResponse.json({ item, confirmedAt: new Date().toISOString() }, { status: 201 });
    }

    const currentItem = await findInventoryItem(db, parsed.productId);
    if (!currentItem) {
      return NextResponse.json(
        { code: "PRODUCT_NOT_FOUND", message: "Produto não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        code: "INSUFFICIENT_STOCK",
        message: `Reserva rejeitada: restam apenas ${currentItem.available} unidades.`,
        currentItem,
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("inventory.reservation_failed", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Não foi possível concluir a reserva." },
      { status: 500 },
    );
  }
}
