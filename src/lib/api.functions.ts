import { createServerFn } from "@tanstack/react-start";
import { normalizeOrder, normalizePart } from "./normalize";
import type { DashboardData, Order } from "./types";
import { demoOrders, demoParts } from "./demo-data";

const OVERRIDE_KEY = "smr:order-overrides";
const EXTRA_KEY = "smr:extra-orders";

// Server function: read dashboard data via SHEETS_READ_WEBHOOK (if configured).
export const getDashboardData = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    const url = process.env.SHEETS_READ_WEBHOOK;
    if (!url) {
      return {
        necessaryParts: demoParts,
        orders: demoOrders,
        lastUpdated: new Date().toISOString(),
        demoMode: true,
      };
    }
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        necessaryParts?: unknown[];
        orders?: unknown[];
        pecas?: unknown[];
        pedidos?: unknown[];
        lastUpdated?: string;
      };
      const partsRaw = (json.necessaryParts ?? json.pecas ?? []) as Record<string, unknown>[];
      const ordersRaw = (json.orders ?? json.pedidos ?? []) as Record<string, unknown>[];
      return {
        necessaryParts: partsRaw.map(normalizePart),
        orders: ordersRaw.map(normalizeOrder),
        lastUpdated: json.lastUpdated ?? new Date().toISOString(),
        demoMode: false,
      };
    } catch {
      return {
        necessaryParts: demoParts,
        orders: demoOrders,
        lastUpdated: new Date().toISOString(),
        demoMode: true,
      };
    }
  },
);

export const updateOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: { order: Order; changedFields: Record<string, unknown> }) => data)
  .handler(async ({ data }) => {
    const url = process.env.ORDER_UPDATE_WEBHOOK;
    if (!url) return { ok: true, forwarded: false as const };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.order.orderId,
          jobId: data.order.jobId,
          partId: data.order.partId,
          changedFields: data.changedFields,
          updatedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true, forwarded: true as const };
    } catch (e) {
      return { ok: false, forwarded: true as const, error: (e as Error).message };
    }
  });

export const createOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: { order: Order }) => data)
  .handler(async ({ data }) => {
    const url = process.env.ORDER_CREATE_WEBHOOK;
    if (!url) return { ok: true, forwarded: false as const };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.order, createdAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true, forwarded: true as const };
    } catch (e) {
      return { ok: false, forwarded: true as const, error: (e as Error).message };
    }
  });

export const getIntegrationStatus = createServerFn({ method: "GET" }).handler(async () => ({
  pdfUploadConfigured: !!process.env.VITE_PDF_UPLOAD_WEBHOOK || true, // client-side var; assume set
  sheetsReadConfigured: !!process.env.SHEETS_READ_WEBHOOK,
  orderUpdateConfigured: !!process.env.ORDER_UPDATE_WEBHOOK,
  orderCreateConfigured: !!process.env.ORDER_CREATE_WEBHOOK,
  reportDataConfigured: !!process.env.REPORT_DATA_WEBHOOK,
}));

// Client-side helpers for local overrides (demo mode persistence)
export function loadOrderOverrides(): Record<string, Partial<Order>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveOrderOverride(orderId: string, patch: Partial<Order>) {
  const all = loadOrderOverrides();
  all[orderId] = { ...all[orderId], ...patch };
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(all));
}
export function loadExtraOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(EXTRA_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveExtraOrder(o: Order) {
  const list = loadExtraOrders();
  list.push(o);
  localStorage.setItem(EXTRA_KEY, JSON.stringify(list));
}

export function applyOverrides(orders: Order[]): Order[] {
  const overrides = loadOrderOverrides();
  const extras = loadExtraOrders();
  const merged = orders.map((o) => ({ ...o, ...(overrides[o.orderId] || {}) }));
  return [...merged, ...extras];
}
