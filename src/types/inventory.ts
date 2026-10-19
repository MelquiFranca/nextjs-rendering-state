export type DataSource = "server cache" | "dynamic" | "query cache" | "local snapshot";

export type InventoryItem = {
  productId: string;
  name: string;
  available: number;
  version: number;
  updatedAt: string;
};

export type InventoryResponse = {
  items: InventoryItem[];
  fetchedAt: string;
  source: DataSource;
};

export type ReservationInput = {
  productId: string;
  quantity: number;
};

export type ReservationResponse = {
  item: InventoryItem;
  confirmedAt: string;
};

export type ApiErrorCode = "INVALID_REQUEST" | "PRODUCT_NOT_FOUND" | "INSUFFICIENT_STOCK" | "INTERNAL_ERROR";

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  currentItem?: InventoryItem;
};

export type LabMode = "vulnerable" | "fixed";
export type RenderingStrategy = "cached" | "dynamic" | "client";
export type Operator = "A" | "B";
