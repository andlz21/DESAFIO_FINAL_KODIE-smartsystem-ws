import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { applyOverrides, getDashboardData } from "@/lib/api.functions";
import { Download, FileDown, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Smart Material" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardData() });
  const parts = data?.necessaryParts ?? [];
  const orders = useMemo(() => (data ? applyOverrides(data.orders) : []), [data]);

  const [jobF, setJobF] = useState("");
  const [dateF, setDateF] = useState("");
  const [resF, setResF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [originF, setOriginF] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const filteredParts = useMemo(
    () =>
      parts.filter(
        (p) =>
          (!jobF || p.jobId.includes(jobF)) &&
          (!dateF || p.analysisDate === dateF) &&
          (!resF || p.reconciliationResult === resF) &&
          (!onlyMissing || p.missingQuantity > 0),
      ),
    [parts, jobF, dateF, resF, onlyMissing],
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (!jobF || o.jobId.includes(jobF)) &&
          (!statusF || o.orderStatus === statusF) &&
          (!originF || o.origin === originF),
      ),
    [orders, jobF, statusF, originF],
  );

  const missingParts = filteredParts.filter((p) => p.missingQuantity > 0);

  const generatePDF = () => {
    if (filteredParts.length === 0 && filteredOrders.length === 0) {
      toast.error("Sem dados para gerar o relatório com os filtros atuais.");
      return;
    }
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const now = new Date().toLocaleString("pt-BR");
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text("Relatório de Reconciliação de Materiais", 40, 50);
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(`Gerado em: ${now}`, 40, 68);
    doc.text(
      `Filtros: Job=${jobF || "todos"} | Data=${dateF || "todas"} | Resultado=${resF || "todos"} | Status pedido=${statusF || "todos"} | Origem=${originF || "todas"} | Somente faltantes=${onlyMissing ? "sim" : "não"}`,
      40,
      82,
      { maxWidth: pageWidth - 80 },
    );

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text("Resumo", 40, 110);
    autoTable(doc, {
      startY: 118,
      head: [["Métrica", "Valor"]],
      body: [
        ["Peças analisadas", String(filteredParts.length)],
        ["Peças com divergência", String(missingParts.length)],
        ["Qtd. total faltante", String(missingParts.reduce((a, p) => a + p.missingQuantity, 0))],
        ["Pedidos no filtro", String(filteredOrders.length)],
        ["Pedidos recebidos", String(filteredOrders.filter((o) => o.orderStatus === "Recebido").length)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [43, 108, 246] },
    });

    doc.setFontSize(11);
    doc.text("Reconciliação — todas as peças no filtro", 40, (doc as any).lastAutoTable.finalY + 24);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [["Job", "Peça", "Descrição", "Ped.", "Env.", "Falt.", "Resultado"]],
      body: filteredParts.map((p) => [
        p.jobId,
        p.partId,
        p.description,
        p.requestedQuantity,
        p.shippedQuantity,
        p.missingQuantity,
        p.reconciliationResult,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [43, 108, 246] },
      columnStyles: { 2: { cellWidth: 160 } },
      showHead: "everyPage",
      margin: { left: 40, right: 40 },
    });

    doc.setFontSize(11);
    doc.text("Materiais faltantes", 40, (doc as any).lastAutoTable.finalY + 24);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [["Job", "Peça", "Descrição", "Qtd Faltante"]],
      body: missingParts.map((p) => [p.jobId, p.partId, p.description, p.missingQuantity]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [208, 69, 62] },
      columnStyles: { 2: { cellWidth: 240 } },
      showHead: "everyPage",
      margin: { left: 40, right: 40 },
    });

    doc.setFontSize(11);
    doc.text("Pedidos de compra", 40, (doc as any).lastAutoTable.finalY + 24);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [["Pedido", "Job", "Peça", "Origem", "Status", "Fornecedor", "Entrega"]],
      body: filteredOrders.map((o) => [
        o.orderId,
        o.jobId,
        o.partId,
        o.origin,
        o.orderStatus,
        o.supplier || "—",
        o.expectedDeliveryDate || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [34, 160, 107] },
      showHead: "everyPage",
      margin: { left: 40, right: 40 },
    });

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

    doc.save(`relatorio-reconciliacao-${Date.now()}.pdf`);
  };

  const downloadCSV = () => {
    const rows = [
      ["Tipo", "Job", "Peça", "Descrição", "Info"],
      ...filteredParts.map((p) => [
        "PEÇA",
        p.jobId,
        p.partId,
        p.description,
        `Ped=${p.requestedQuantity} Env=${p.shippedQuantity} Falt=${p.missingQuantity} Res=${p.reconciliationResult}`,
      ]),
      ...filteredOrders.map((o) => [
        "PEDIDO",
        o.jobId,
        o.partId,
        o.description,
        `${o.orderStatus} • ${o.origin} • ${o.supplier || "—"}`,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${Date.now()}.csv`;
    a.click();
  };

  return (
    <AppShell title="Relatórios">
      <Card>
        <CardHeader><CardTitle>Filtros do relatório</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div><Label>ID Trabalho</Label><Input value={jobF} onChange={(e) => setJobF(e.target.value)} /></div>
          <div><Label>Data de análise</Label><Input type="date" value={dateF} onChange={(e) => setDateF(e.target.value)} /></div>
          <div><Label>Resultado</Label><Input value={resF} onChange={(e) => setResF(e.target.value)} placeholder="OK / FALTANTE" /></div>
          <div><Label>Status pedido</Label><Input value={statusF} onChange={(e) => setStatusF(e.target.value)} /></div>
          <div><Label>Origem</Label><Input value={originF} onChange={(e) => setOriginF(e.target.value)} placeholder="Nacional / Internacional" /></div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyMissing} onCheckedChange={(v) => setOnlyMissing(!!v)} />
              Somente materiais faltantes
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Prévia</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border p-3"><div className="text-muted-foreground text-xs">Peças filtradas</div><div className="text-xl font-semibold">{filteredParts.length}</div></div>
          <div className="rounded-md border p-3"><div className="text-muted-foreground text-xs">Peças faltantes</div><div className="text-xl font-semibold text-destructive">{missingParts.length}</div></div>
          <div className="rounded-md border p-3"><div className="text-muted-foreground text-xs">Qtd. faltante total</div><div className="text-xl font-semibold">{missingParts.reduce((a, p) => a + p.missingQuantity, 0)}</div></div>
          <div className="rounded-md border p-3"><div className="text-muted-foreground text-xs">Pedidos filtrados</div><div className="text-xl font-semibold">{filteredOrders.length}</div></div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={generatePDF}><FileDown className="h-4 w-4 mr-2" />Baixar relatório em PDF</Button>
        <Button variant="outline" onClick={downloadCSV}><Download className="h-4 w-4 mr-2" />Baixar CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
      </div>
    </AppShell>
  );
}
