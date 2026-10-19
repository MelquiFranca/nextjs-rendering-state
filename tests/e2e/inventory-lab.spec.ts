import { expect, test } from "@playwright/test";

test("keeps a stale local snapshot in vulnerable mode", async ({ context }) => {
  const operatorA = await context.newPage();
  const operatorB = await context.newPage();
  await operatorA.goto("/inventory?operator=A&mode=vulnerable&strategy=client&product=scanner-pro");
  await operatorA.getByRole("button", { name: "Resetar demo" }).click();
  await expect(operatorA.getByTestId("stock-scanner-pro")).toHaveText("12");

  await operatorB.goto("/inventory?operator=B&mode=vulnerable&strategy=client&product=scanner-pro");
  await expect(operatorB.getByTestId("stock-scanner-pro")).toHaveText("12");
  await operatorB.getByLabel("Quantidade de Scanner Pro X1").fill("5");
  await operatorB.getByTestId("product-scanner-pro").getByRole("button", { name: "Reservar" }).click();
  await expect(operatorB.getByTestId("stock-scanner-pro")).toHaveText("7");
  await expect(operatorA.getByTestId("stock-scanner-pro")).toHaveText("12");

  await operatorA.getByRole("button", { name: "Verificar servidor" }).click();
  await expect(operatorA.getByTestId("diagnostic-panel")).toContainText("possivelmente desatualizado");
});

test("invalidates another tab through BroadcastChannel in fixed mode", async ({ context }) => {
  const operatorA = await context.newPage();
  const operatorB = await context.newPage();
  await operatorA.goto("/inventory?operator=A&mode=fixed&strategy=client&product=scanner-pro");
  await operatorA.getByRole("button", { name: "Resetar demo" }).click();
  await operatorB.goto("/inventory?operator=B&mode=fixed&strategy=client&product=scanner-pro");
  await expect(operatorB.getByTestId("stock-scanner-pro")).toHaveText("12");

  await operatorB.getByLabel("Quantidade de Scanner Pro X1").fill("5");
  await operatorB.getByTestId("product-scanner-pro").getByRole("button", { name: "Reservar" }).click();

  await expect(operatorB.getByTestId("stock-scanner-pro")).toHaveText("7");
  await expect(operatorA.getByTestId("stock-scanner-pro")).toHaveText("7");
  await expect(operatorA.getByTestId("notice")).toContainText("Operador B");
});

test("rolls back an optimistic reservation rejected by the server", async ({ page }) => {
  await page.goto("/inventory?operator=A&mode=fixed&strategy=client&product=scanner-pro");
  await page.getByRole("button", { name: "Resetar demo" }).click();
  await expect(page.getByTestId("stock-scanner-pro")).toHaveText("12");

  await page.getByLabel("Quantidade de Scanner Pro X1").fill("13");
  await page.getByTestId("product-scanner-pro").getByRole("button", { name: "Reservar" }).click();

  await expect(page.getByTestId("stock-scanner-pro")).toHaveText("12");
  await expect(page.getByTestId("notice")).toContainText("foi desfeita");
  await expect(page.getByTestId("diagnostic-panel")).toContainText("conflito rejeitado");
});
