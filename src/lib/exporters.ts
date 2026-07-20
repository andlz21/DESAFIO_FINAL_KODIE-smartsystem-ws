import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { NecessaryPart, Order } from "./types";

export function downloadBlob(name: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))];
  return "\uFEFF" + lines.join("\n");
}

export function downloadCSV(name: string, headers: string[], rows: (string | number)[][]) {
  downloadBlob(name, toCSV(headers, rows), "text/csv;charset=utf-8");
}

function pdfHeader(doc: jsPDF, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(title, 40, 48);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, 64);
  if (subtitle) doc.text(subtitle, 40, 78, { maxWidth: w - 80 });
  doc.setTextColor(0);
}

function pdfFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Página ${i} de ${pages} • Smart Material Reconciliation`,
      40,
      doc.internal.pageSize.getHeight() - 20,
    );
  }
}

// ---------- Order ----------
export function orderCSV(o: Order) {
  return toCSV(
    [
      "ID Pedido",
      "ID Trabalho",
      "ID Peça",
      "Descrição",
      "Qtd Faltante",
      "Origem",
      "Status",
      "Data Pedido",
      "Previsão de Entrega",
      "Fornecedor",
      "Responsável",
      "Observações",
    ],
    [
      [
        o.orderId,
        o.jobId,
        o.partId,
        o.description,
        o.missingQuantity,
        o.origin,
        o.orderStatus,
        o.orderDate || "",
        o.expectedDeliveryDate || "",
        o.supplier || "",
        o.responsible || "",
        o.notes || "",
      ],
    ],
  );
}

export function downloadOrderCSV(o: Order) {
  downloadBlob(`pedido-${o.orderId}.csv`, orderCSV(o), "text/csv;charset=utf-8");
}

export function downloadOrderPDF(o: Order) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pdfHeader(doc, `Relatório do Pedido ${o.orderId}`, `Trabalho ${o.jobId} • Peça ${o.partId}`);

  autoTable(doc, {
    startY: 100,
    head: [["Campo", "Valor"]],
    body: [
      ["ID Pedido", o.orderId],
      ["ID Trabalho", o.jobId],
      ["ID Peça", o.partId],
      ["Descrição", o.description],
      ["Qtd Faltante", String(o.missingQuantity)],
      ["Origem", o.origin],
      ["Status", o.orderStatus],
      ["Data do Pedido", o.orderDate || "—"],
      ["Previsão de Entrega", o.expectedDeliveryDate || "—"],
      ["Fornecedor", o.supplier || "—"],
      ["Responsável", o.responsible || "—"],
      ["Observações", o.notes || "—"],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [43, 108, 246] },
    columnStyles: { 0: { cellWidth: 160, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
  });

  pdfFooter(doc);
  doc.save(`pedido-${o.orderId}.pdf`);
}

// ---------- Part ----------
export function partCSV(p: NecessaryPart) {
  return toCSV(
    [
      "ID Trabalho",
      "ID Peça",
      "Descrição",
      "Qtd Pedida",
      "Qtd Planejada",
      "Qtd Enviada",
      "Qtd Faltante",
      "Resultado",
      "Data Análise",
      "Status",
    ],
    [
      [
        p.jobId,
        p.partId,
        p.description,
        p.requestedQuantity,
        p.plannedQuantity,
        p.shippedQuantity,
        p.missingQuantity,
        p.reconciliationResult,
        p.analysisDate,
        p.status,
      ],
    ],
  );
}

export function downloadPartCSV(p: NecessaryPart) {
  downloadBlob(`peca-${p.jobId}-${p.partId}.csv`, partCSV(p), "text/csv;charset=utf-8");
}

export function downloadPartPDF(p: NecessaryPart) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pdfHeader(doc, `Ficha da Peça ${p.partId}`, `Trabalho ${p.jobId}`);
  autoTable(doc, {
    startY: 100,
    head: [["Campo", "Valor"]],
    body: [
      ["ID Trabalho", p.jobId],
      ["ID Peça", p.partId],
      ["Descrição", p.description],
      ["Qtd Pedida", String(p.requestedQuantity)],
      ["Qtd Planejada", String(p.plannedQuantity)],
      ["Qtd Enviada", String(p.shippedQuantity)],
      ["Qtd Faltante", String(p.missingQuantity)],
      ["Resultado", p.reconciliationResult],
      ["Data Análise", p.analysisDate || "—"],
      ["Status", p.status],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [43, 108, 246] },
    columnStyles: { 0: { cellWidth: 160, fontStyle: "bold" } },
  });
  pdfFooter(doc);
  doc.save(`peca-${p.jobId}-${p.partId}.pdf`);
}

// ---------- Generic table PDF ----------
export interface TablePDFOptions {
  title: string;
  subtitle?: string;
  head: string[];
  body: (string | number)[][];
  filename: string;
  orientation?: "portrait" | "landscape";
  accent?: [number, number, number];
}

export function downloadTablePDF(opts: TablePDFOptions) {
  const doc = new jsPDF({
    orientation: opts.orientation ?? "landscape",
    unit: "pt",
    format: "a4",
  });
  pdfHeader(doc, opts.title, opts.subtitle);
  autoTable(doc, {
    startY: 100,
    head: [opts.head],
    body: opts.body.length ? opts.body : [["—".padEnd(opts.head.length, " ")]],
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: opts.accent ?? [43, 108, 246] },
    showHead: "everyPage",
    margin: { left: 40, right: 40 },
  });
  pdfFooter(doc);
  doc.save(opts.filename);
}
