import { Button } from "@/components/atoms/Button/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge/StatusBadge";
import type { InventoryItem } from "@/types/inventory";
import styles from "./ProductCard.module.css";

type Props = {
  item: InventoryItem;
  quantity: number;
  selected: boolean;
  pending: boolean;
  onQuantityChange: (quantity: number) => void;
  onReserve: () => void;
  onSelect: () => void;
};

export function ProductCard({ item, quantity, selected, pending, onQuantityChange, onReserve, onSelect }: Props) {
  return (
    <article className={`${styles.card} ${selected ? styles.selected : ""}`} data-testid={`product-${item.productId}`}>
      <button className={styles.headingButton} onClick={onSelect} aria-pressed={selected}>
        <span className={styles.eyebrow}>SKU · {item.productId}</span>
        <strong>{item.name}</strong>
      </button>
      <div className={styles.stockLine}>
        <span className={styles.stock} data-testid={`stock-${item.productId}`}>{item.available}</span>
        <span className={styles.unit}>unidades<br />disponíveis</span>
        <StatusBadge tone={item.available > 0 ? "good" : "danger"}>{item.available > 0 ? "em estoque" : "esgotado"}</StatusBadge>
      </div>
      <div className={styles.meta}>versão {item.version} · {new Date(item.updatedAt).toLocaleTimeString("pt-BR")}</div>
      <div className={styles.actions}>
        <label>
          <span className="sr-only">Quantidade de {item.name}</span>
          <input
            aria-label={`Quantidade de ${item.name}`}
            type="number"
            min="1"
            max="999"
            value={quantity}
            onChange={(event) => onQuantityChange(Math.max(1, Number(event.target.value) || 1))}
          />
        </label>
        <Button onClick={onReserve} disabled={pending || item.available === 0}>
          {pending ? "Reservando…" : "Reservar"}
        </Button>
      </div>
    </article>
  );
}
