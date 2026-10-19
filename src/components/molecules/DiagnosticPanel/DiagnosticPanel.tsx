import { StatusBadge } from "@/components/atoms/StatusBadge/StatusBadge";
import type { InventoryItem, InventoryResponse } from "@/types/inventory";
import styles from "./DiagnosticPanel.module.css";

function Metric({ label, item, data }: { label: string; item?: InventoryItem; data: InventoryResponse | null }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{item?.available ?? "—"}</strong>
      <small>versão {item?.version ?? "—"}</small>
      <small>{data?.source ?? "aguardando"}</small>
    </div>
  );
}

export function DiagnosticPanel({
  local,
  confirmed,
  productId,
  age,
  conflict,
}: {
  local: InventoryResponse | null;
  confirmed: InventoryResponse | null;
  productId: string | undefined;
  age: string;
  conflict: boolean;
}) {
  const localItem = local?.items.find((item) => item.productId === productId) ?? local?.items[0];
  const confirmedItem = confirmed?.items.find((item) => item.productId === localItem?.productId);
  const diverged = Boolean(confirmedItem && localItem && confirmedItem.version !== localItem.version);
  const tone = conflict ? "danger" : diverged ? "warning" : "good";
  const label = conflict ? "conflito rejeitado" : diverged ? "possivelmente desatualizado" : "atualizado";

  return (
    <section className={styles.panel} aria-label="Diagnóstico de sincronização" data-testid="diagnostic-panel">
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>RAIO-X DO DADO</span>
          <h2>Diagnóstico de sincronização</h2>
        </div>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </div>
      <div className={styles.comparison}>
        <Metric label="Visão local" item={localItem} data={local} />
        <div className={styles.arrow} aria-hidden="true">⇄</div>
        <Metric label="Servidor confirmado" item={confirmedItem} data={confirmed} />
      </div>
      <div className={styles.footer}>
        <span>Última leitura: {local ? new Date(local.fetchedAt).toLocaleTimeString("pt-BR") : "—"}</span>
        <span>Idade do dado: {age}</span>
      </div>
    </section>
  );
}
