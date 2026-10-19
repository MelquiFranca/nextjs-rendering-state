import type { ReactNode } from "react";
import styles from "./StatusBadge.module.css";

export function StatusBadge({ tone, children }: { tone: "neutral" | "good" | "warning" | "danger"; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
