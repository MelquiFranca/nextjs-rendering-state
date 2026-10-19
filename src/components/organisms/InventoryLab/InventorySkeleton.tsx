import styles from "./InventoryLab.module.css";

export function InventorySkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={embedded ? styles.skeletonEmbedded : styles.skeletonPage} aria-label="Carregando estoque">
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonGrid}>{[1, 2, 3].map((value) => <div key={value} className={styles.skeletonCard} />)}</div>
    </div>
  );
}
