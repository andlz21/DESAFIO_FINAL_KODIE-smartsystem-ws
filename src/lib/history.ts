import type { DashboardData, NecessaryPart, Order } from "./types";

const HISTORY_KEY = "smr:dashboard-history";
const OVERRIDE_KEY = "smr:order-overrides";
const EXTRA_KEY = "smr:extra-orders";

export interface DashboardSnapshot {
  id: string;
  createdAt: string;
  label?: string;
  note?: string;
  demoMode: boolean;
  necessaryParts: NecessaryPart[];
  orders: Order[];
  metrics: {
    jobs: number;
    parts: number;
    divergentes: number;
    totalFaltante: number;
    pedidos: number;
    recebidos: number;
  };
}

export function listSnapshots(): DashboardSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? (JSON.parse(raw) as DashboardSnapshot[]) : [];
    return arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function saveSnapshot(
  data: DashboardData,
  orders: Order[],
  note?: string,
): DashboardSnapshot {
  const parts = data.necessaryParts;
  const snap: DashboardSnapshot = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    createdAt: new Date().toISOString(),
    label: new Date().toLocaleString("pt-BR"),
    note,
    demoMode: data.demoMode,
    necessaryParts: parts,
    orders,
    metrics: {
      jobs: new Set(parts.map((p) => p.jobId)).size,
      parts: parts.length,
      divergentes: parts.filter((p) => p.missingQuantity > 0).length,
      totalFaltante: parts.reduce((a, p) => a + p.missingQuantity, 0),
      pedidos: orders.length,
      recebidos: orders.filter((o) => o.orderStatus === "Recebido").length,
    },
  };
  const all = listSnapshots();
  all.unshift(snap);
  // cap to 50
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all.slice(0, 50)));
  return snap;
}

export function deleteSnapshot(id: string) {
  const all = listSnapshots().filter((s) => s.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
}

export function clearAllSnapshots() {
  localStorage.removeItem(HISTORY_KEY);
}

export function clearLocalDashboardData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OVERRIDE_KEY);
  localStorage.removeItem(EXTRA_KEY);
}
