import type {
  ApiErrorBody,
  InventoryResponse,
  ReservationInput,
  ReservationResponse,
} from "@/types/inventory";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T | ApiErrorBody;
  if (!response.ok) throw new ApiClientError(response.status, body as ApiErrorBody);
  return body as T;
}

export async function fetchInventory(): Promise<InventoryResponse> {
  const response = await fetch("/api/inventory", { cache: "no-store" });
  return parseResponse<InventoryResponse>(response);
}

export async function createReservation(input: ReservationInput): Promise<ReservationResponse> {
  const response = await fetch("/api/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<ReservationResponse>(response);
}

export async function resetDemo(): Promise<InventoryResponse> {
  const response = await fetch("/api/demo/reset", { method: "POST" });
  return parseResponse<InventoryResponse>(response);
}
