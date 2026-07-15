import type { NecessaryPart, Order, OrderOrigin, OrderStatus } from "./types";

const norm = (s: string) =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  const map = new Map<string, unknown>();
  for (const k of Object.keys(row)) map.set(norm(k), row[k]);
  for (const k of keys) {
    const v = map.get(norm(k));
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

const toNum = (v: unknown): number => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const toStr = (v: unknown, fb = ""): string => (v == null ? fb : String(v));

export function normalizePart(row: Record<string, unknown>): NecessaryPart {
  const requested = toNum(pick(row, ["Qtd Pedida", "requestedQuantity", "qty requested"]));
  const shipped = toNum(pick(row, ["Qtd Enviada", "shippedQuantity", "qty shipped"]));
  const planned = toNum(pick(row, ["Qtd Planejada", "plannedQuantity", "qty demand"]));
  const missingRaw = pick(row, ["Qtd Faltante Envio", "Qtd Faltante", "missingQuantity"]);
  const missing = missingRaw !== undefined ? toNum(missingRaw) : Math.max(0, requested - shipped);
  const reconc =
    toStr(pick(row, ["Resultado da Conciliação", "Resultado", "reconciliationResult"])) ||
    (missing > 0 ? "FALTANTE" : "OK");
  return {
    jobId: toStr(pick(row, ["ID Trabalho", "jobId", "Job ID"])),
    partId: toStr(pick(row, ["ID Peça", "partId", "Part ID"])),
    description: toStr(pick(row, ["Descrição", "Descricao", "description"])),
    requestedQuantity: requested,
    plannedQuantity: planned,
    shippedQuantity: shipped,
    missingQuantity: missing,
    reconciliationResult: reconc,
    analysisDate: toStr(pick(row, ["Data Análise", "Data da Análise", "analysisDate"])),
    status: toStr(pick(row, ["Status", "status"])) || (missing > 0 ? "Pendente" : "OK"),
  };
}

export function normalizeOrder(row: Record<string, unknown>): Order {
  const originRaw = toStr(pick(row, ["Nacional/Internacional", "origin", "Origem"]));
  const origin: OrderOrigin =
    /internac/i.test(originRaw) ? "Internacional" : /nac/i.test(originRaw) ? "Nacional" : "A definir";
  const status = (toStr(pick(row, ["Status do Pedido", "orderStatus", "Status"])) ||
    "Solicitado") as OrderStatus;
  return {
    orderId: toStr(pick(row, ["ID Pedido", "orderId", "Order ID"])) || crypto.randomUUID(),
    jobId: toStr(pick(row, ["ID Trabalho", "jobId"])),
    partId: toStr(pick(row, ["ID Peça", "partId"])),
    description: toStr(pick(row, ["Descrição", "description"])),
    missingQuantity: toNum(pick(row, ["Qtd Faltante", "missingQuantity"])),
    origin,
    orderStatus: status,
    orderDate: toStr(pick(row, ["Data do Pedido", "orderDate"])),
    expectedDeliveryDate: toStr(pick(row, ["Previsão de Entrega", "expectedDeliveryDate"])),
    supplier: toStr(pick(row, ["Fornecedor", "supplier"])),
    responsible: toStr(pick(row, ["Responsável", "Responsavel", "responsible"])),
    notes: toStr(pick(row, ["Observações", "Observacoes", "notes"])),
  };
}
