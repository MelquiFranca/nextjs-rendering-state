"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button/Button";
import { StatusBadge } from "@/components/atoms/StatusBadge/StatusBadge";
import { DiagnosticPanel } from "@/components/molecules/DiagnosticPanel/DiagnosticPanel";
import { ProductCard } from "@/components/molecules/ProductCard/ProductCard";
import {
  ApiClientError,
  createReservation,
  fetchInventory,
  resetDemo,
} from "@/lib/inventory-client";
import { applyOptimisticReservation } from "@/lib/optimistic-inventory";
import { useLabStore } from "@/store/lab-store";
import type {
  InventoryResponse,
  LabMode,
  Operator,
  RenderingStrategy,
  ReservationInput,
  ReservationResponse,
} from "@/types/inventory";
import { InventorySkeleton } from "./InventorySkeleton";
import styles from "./InventoryLab.module.css";

const INVENTORY_KEY = ["inventory"] as const;
const CHANNEL_NAME = "stale-data-detective";

type MutationContext = { previous?: InventoryResponse };

function useDataAge(timestamp: string | undefined) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1_000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
}

export function InventoryLab({
  operator,
  mode,
  strategy,
  initialData,
  selectedProduct,
  availability,
}: {
  operator: Operator;
  mode: LabMode;
  strategy: RenderingStrategy;
  initialData: InventoryResponse | null;
  selectedProduct?: string;
  availability: "all" | "available";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ tone: "good" | "danger" | "warning"; text: string } | null>(null);
  const [serverProbe, setServerProbe] = useState<InventoryResponse | null>(initialData);
  const [probing, setProbing] = useState(false);

  const quantities = useLabStore((state) => state.quantities);
  const setQuantity = useLabStore((state) => state.setQuantity);
  const snapshot = useLabStore((state) => state.snapshot);
  const snapshotKey = useLabStore((state) => state.snapshotKey);
  const initializeSnapshot = useLabStore((state) => state.initializeSnapshot);
  const applyLocalConfirmation = useLabStore((state) => state.applyLocalConfirmation);
  const clearSnapshot = useLabStore((state) => state.clearSnapshot);
  const diagnosticOpen = useLabStore((state) => state.diagnosticOpen);
  const toggleDiagnostic = useLabStore((state) => state.toggleDiagnostic);

  const inventoryQuery = useQuery({
    queryKey: INVENTORY_KEY,
    queryFn: fetchInventory,
    initialData: initialData ?? undefined,
  });

  const sessionKey = `${operator}:${strategy}`;
  useEffect(() => {
    if (mode === "vulnerable" && inventoryQuery.data && snapshotKey !== sessionKey) {
      initializeSnapshot(sessionKey, inventoryQuery.data);
    }
  }, [initializeSnapshot, inventoryQuery.data, mode, sessionKey, snapshotKey]);

  useEffect(() => {
    if (mode !== "fixed") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === "inventory-changed") {
        void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
        setNotice({ tone: "good", text: `Atualização recebida do Operador ${event.data.operator}.` });
      }
    };
    return () => channel.close();
  }, [mode, queryClient]);

  const mutation = useMutation<ReservationResponse, ApiClientError, ReservationInput, MutationContext>({
    mutationFn: createReservation,
    onMutate: async (input) => {
      setNotice(null);
      if (mode !== "fixed") return {};
      await queryClient.cancelQueries({ queryKey: INVENTORY_KEY });
      const previous = queryClient.getQueryData<InventoryResponse>(INVENTORY_KEY);
      queryClient.setQueryData(INVENTORY_KEY, applyOptimisticReservation(previous, input));
      return { previous };
    },
    onError: (error, _input, context) => {
      if (mode === "fixed" && context?.previous) queryClient.setQueryData(INVENTORY_KEY, context.previous);
      if (error.body.currentItem) {
        setServerProbe((current) => ({
          items: current?.items.map((item) =>
            item.productId === error.body.currentItem?.productId ? error.body.currentItem : item,
          ) ?? [error.body.currentItem!],
          fetchedAt: new Date().toISOString(),
          source: "query cache",
        }));
      }
      setNotice({ tone: error.status === 409 ? "warning" : "danger", text: `${error.message} A atualização otimista foi desfeita.` });
    },
    onSuccess: (result) => {
      setServerProbe((current) => ({
        items: current?.items.map((item) => item.productId === result.item.productId ? result.item : item) ?? [result.item],
        fetchedAt: result.confirmedAt,
        source: "query cache",
      }));
      if (mode === "vulnerable") {
        applyLocalConfirmation(result);
      } else {
        queryClient.setQueryData<InventoryResponse>(INVENTORY_KEY, (current) => current ? ({
          ...current,
          fetchedAt: result.confirmedAt,
          source: "query cache",
          items: current.items.map((item) => item.productId === result.item.productId ? result.item : item),
        }) : current);
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: "inventory-changed", operator });
        channel.close();
      }
      setNotice({ tone: "good", text: `Reserva confirmada pelo servidor · versão ${result.item.version}.` });
    },
    onSettled: () => {
      if (mode === "fixed") void queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });

  const displayedData = mode === "vulnerable" ? snapshot ?? inventoryQuery.data ?? null : inventoryQuery.data ?? null;
  const items = useMemo(
    () => (displayedData?.items ?? []).filter((item) => availability === "all" || item.available > 0),
    [availability, displayedData?.items],
  );
  const activeProduct = selectedProduct && items.some((item) => item.productId === selectedProduct)
    ? selectedProduct
    : items[0]?.productId;
  const age = useDataAge(displayedData?.fetchedAt);

  function navigate(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/inventory?${next.toString()}`);
  }

  async function inspectServer() {
    setProbing(true);
    try {
      setServerProbe(await fetchInventory());
    } finally {
      setProbing(false);
    }
  }

  async function synchronize() {
    clearSnapshot();
    const result = await inventoryQuery.refetch();
    if (result.data) setServerProbe(result.data);
    setNotice({ tone: "good", text: "Leitura explícita concluída." });
  }

  async function handleReset() {
    const result = await resetDemo();
    clearSnapshot();
    setServerProbe(result);
    queryClient.setQueryData(INVENTORY_KEY, result);
    await queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    if (mode === "fixed") {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: "inventory-changed", operator });
      channel.close();
    }
    setNotice({ tone: "good", text: "Cenário restaurado para os valores iniciais." });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/inventory?operator=A&mode=vulnerable&strategy=cached" className={styles.brand}>
          <span className={styles.logo}>SD</span>
          <span><strong>Stale Data</strong><small>Detective</small></span>
        </Link>
        <div className={styles.sessionLinks}>
          <a href={`/inventory?operator=A&mode=${mode}&strategy=${strategy}`} target="_blank" rel="noreferrer">↗ Abrir Operador A</a>
          <a href={`/inventory?operator=B&mode=${mode}&strategy=${strategy}`} target="_blank" rel="noreferrer">↗ Abrir Operador B</a>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.overline}>LABORATÓRIO 05 · CONSISTÊNCIA DISTRIBUÍDA</span>
          <h1>O dado que você vê<br /><em>pode já ter mudado.</em></h1>
          <p>Provoque divergências entre cache, estado local e PostgreSQL — depois observe a camada que realmente preserva o estoque.</p>
          <ul className={styles.heroBadges} aria-label="Tecnologias principais">
            <li><span className={styles.nextDot} aria-hidden="true" />Next.js App Router</li>
            <li><span className={styles.queryDot} aria-hidden="true" />TanStack Query</li>
            <li><span className={styles.databaseDot} aria-hidden="true" />PostgreSQL atômico</li>
            <li><span className={styles.channelDot} aria-hidden="true" />BroadcastChannel</li>
          </ul>
        </div>
        <div className={styles.operatorCard}>
          <span>SESSÃO ATIVA</span>
          <strong>Operador {operator}</strong>
          <small>aba independente · mesmo estoque</small>
        </div>
      </section>

      <section className={styles.controlDeck} aria-label="Controles do laboratório">
        <div className={styles.controlGroup}>
          <span>Modo da experiência</span>
          <div className={styles.segmented}>
            <button className={mode === "vulnerable" ? styles.activeDanger : ""} onClick={() => navigate({ mode: "vulnerable" })}>⚠ Vulnerável</button>
            <button className={mode === "fixed" ? styles.activeGood : ""} onClick={() => navigate({ mode: "fixed" })}>✓ Corrigido</button>
          </div>
        </div>
        <div className={styles.controlGroup}>
          <span>Estratégia de leitura</span>
          <div className={styles.segmented}>
            {(["cached", "dynamic", "client"] as const).map((value) => (
              <button key={value} className={strategy === value ? styles.active : ""} onClick={() => navigate({ strategy: value })}>{value}</button>
            ))}
          </div>
        </div>
        <div className={styles.deckActions}>
          <Button variant="ghost" onClick={() => void inspectServer()} disabled={probing}>{probing ? "Consultando…" : "Verificar servidor"}</Button>
          <Button variant="secondary" onClick={() => void synchronize()}>Sincronizar agora</Button>
          <Button variant="danger" onClick={() => void handleReset()}>Resetar demo</Button>
        </div>
      </section>

      <div className={styles.contextLine}>
        <StatusBadge tone={mode === "fixed" ? "good" : "warning"}>{mode === "fixed" ? "query + backend protegido" : "snapshot local intencional"}</StatusBadge>
        <label>Filtro
          <select value={availability} onChange={(event) => navigate({ availability: event.target.value === "available" ? "available" : undefined })}>
            <option value="all">Todos</option><option value="available">Com estoque</option>
          </select>
        </label>
        <button className={styles.diagnosticToggle} onClick={toggleDiagnostic}>{diagnosticOpen ? "Ocultar diagnóstico" : "Mostrar diagnóstico"}</button>
      </div>

      {notice && <div role="status" className={`${styles.notice} ${styles[notice.tone]}`} data-testid="notice">{notice.text}</div>}
      {inventoryQuery.isLoading ? <InventorySkeleton embedded /> : inventoryQuery.isError ? (
        <div className={styles.error} role="alert">Não foi possível carregar o estoque. Verifique o PostgreSQL e execute a migration.</div>
      ) : (
        <div className={styles.workspace}>
          <section>
            <div className={styles.sectionTitle}><span>01</span><div><h2>Estoque operacional</h2><p>Reserve em uma aba e compare o resultado na outra.</p></div></div>
            <div className={styles.grid}>
              {items.map((item) => (
                <ProductCard
                  key={item.productId}
                  item={item}
                  quantity={quantities[item.productId] ?? 1}
                  selected={activeProduct === item.productId}
                  pending={mutation.isPending && mutation.variables?.productId === item.productId}
                  onQuantityChange={(quantity) => setQuantity(item.productId, quantity)}
                  onReserve={() => mutation.mutate({ productId: item.productId, quantity: quantities[item.productId] ?? 1 })}
                  onSelect={() => navigate({ product: item.productId })}
                />
              ))}
            </div>
          </section>
          {diagnosticOpen && (
            <aside>
              <div className={styles.sectionTitle}><span>02</span><div><h2>Evidência</h2><p>Compare versões, origem e idade.</p></div></div>
              <DiagnosticPanel
                local={displayedData}
                confirmed={mode === "fixed" ? inventoryQuery.data ?? serverProbe : serverProbe}
                productId={activeProduct}
                age={age}
                conflict={mutation.error?.status === 409}
              />
              <div className={styles.explainer}>
                <strong>{mode === "fixed" ? "Por que está consistente?" : "Onde nasce a divergência?"}</strong>
                <p>{mode === "fixed"
                  ? "A query é invalidada após mutações e eventos entre abas. Se o palpite otimista falhar, o snapshot anterior volta."
                  : "Esta aba copiou o dado remoto para Zustand. Alterações externas não substituem essa cópia até uma sincronização explícita."}</p>
              </div>
            </aside>
          )}
        </div>
      )}
      <footer><span>Integridade real: <strong>UPDATE atômico no PostgreSQL</strong></span><span>BroadcastChannel · TanStack Query · Zustand · App Router</span></footer>
    </main>
  );
}
