import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { applyOverrides, getDashboardData } from "@/lib/api.functions";
import { FileDown, FileText, Printer } from "lucide-react";
import { downloadCSV, downloadTablePDF } from "@/lib/exporters";
import type { NecessaryPart, Order } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Smart Material" }] }),
  component: RelatoriosPage,
});

interface ReportSection {
  id: string;
  title: string;
  description: string;
  badge: string;
  head: string[];
  rows: (string | number)[][];
  accent?: [number, number, number];
  landscape?: boolean;
}

function RelatoriosPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardData() });
  const parts = data?.necessaryParts ?? [];
  const orders = useMemo(() => (data ? applyOverrides(data.orders) : []), [data]);

  const [jobF, setJobF] = useState("");
  const [dateF, setDateF] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const fParts = useMemo(
    () =>
      parts.filter(
        (p) =>
          (!jobF || p.jobId.includes(jobF)) &&
          (!dateF || p.analysisDate === dateF) &&
          (!onlyMissing || p.missingQuantity > 0),
      ),
    [parts, jobF, dateF, onlyMissing],
  );
  const fOrders = useMemo(
    () => orders.filter((o) => !jobF || o.jobId.includes(jobF)),
    [orders, jobF],
  );

  const filtersLabel = `Job=${jobF || "todos"} • Data=${dateF || "todas"} • Somente faltantes=${onlyMissing ? "sim" : "não"}`;

  const sections = useMemo<ReportSection[]>(() => {
    const missingParts = fParts.filter((p) => p.missingQuantity > 0);

    // Por trabalho
    const jobsMap = new Map<string, { parts: NecessaryPart[]; orders: Order[] }>();
    for (const p of fParts) {
      const b = jobsMap.get(p.jobId) ?? { parts: [], orders: [] };
      b.parts.push(p);
      jobsMap.set(p.jobId, b);
    }
    for (const o of fOrders) {
      const b = jobsMap.get(o.jobId) ?? { parts: [], orders: [] };
      b.orders.push(o);
      jobsMap.set(o.jobId, b);
    }
    const byJob = [...jobsMap.entries()].map(([job, b]) => [
      job,
      b.parts.length,
      b.parts.filter((p) => p.missingQuantity > 0).length,
      b.parts.reduce((a, p) => a + p.missingQuantity, 0),
      b.orders.length,
      b.orders.filter((o) => o.orderStatus === "Recebido").length,
    ]);

    // Por status
    const byStatus = new Map<string, number>();
    for (const o of fOrders) byStatus.set(o.orderStatus, (byStatus.get(o.orderStatus) ?? 0) + 1);

    // Por origem
    const byOrigin = new Map<string, number>();
    for (const o of fOrders) byOrigin.set(o.origin, (byOrigin.get(o.origin) ?? 0) + 1);

    // Por fornecedor
    const bySupplier = new Map<string, { count: number; pending: number }>();
    for (const o of fOrders) {
      const k = o.supplier || "— sem fornecedor —";
      const cur = bySupplier.get(k) ?? { count: 0, pending: 0 };
      cur.count += 1;
      if (o.orderStatus !== "Recebido" && o.orderStatus !== "Cancelado") cur.pending += 1;
      bySupplier.set(k, cur);
    }

    return [
      {
        id: "reconciliacao",
        title: "Reconciliação completa de peças",
        description:
          "Lista integral das peças analisadas com quantidades planejadas, pedidas, enviadas e faltantes.",
        badge: `${fParts.length} peça(s)`,
        head: ["Job", "Peça", "Descrição", "Ped.", "Plan.", "Env.", "Falt.", "Resultado", "Data", "Status"],
        rows: fParts.map((p) => [
          p.jobId, p.partId, p.description, p.requestedQuantity, p.plannedQuantity,
          p.shippedQuantity, p.missingQuantity, p.reconciliationResult, p.analysisDate, p.status,
        ]),
        landscape: true,
      },
      {
        id: "faltantes",
        title: "Materiais faltantes",
        description: "Peças com divergência entre o solicitado e o enviado, priorizando compras urgentes.",
        badge: `${missingParts.length} peça(s) • ${missingParts.reduce((a, p) => a + p.missingQuantity, 0)} un.`,
        head: ["Job", "Peça", "Descrição", "Ped.", "Env.", "Falt.", "Resultado"],
        rows: missingParts.map((p) => [
          p.jobId, p.partId, p.description, p.requestedQuantity, p.shippedQuantity,
          p.missingQuantity, p.reconciliationResult,
        ]),
        accent: [208, 69, 62],
      },
      {
        id: "pedidos",
        title: "Pedidos de compra",
        description: "Lista completa dos pedidos com status, origem, fornecedor e previsão de entrega.",
        badge: `${fOrders.length} pedido(s)`,
        head: ["Pedido", "Job", "Peça", "Descrição", "Falt.", "Origem", "Status", "Fornecedor", "Prev. Entrega"],
        rows: fOrders.map((o) => [
          o.orderId, o.jobId, o.partId, o.description, o.missingQuantity,
          o.origin, o.orderStatus, o.supplier || "—", o.expectedDeliveryDate || "—",
        ]),
        accent: [34, 160, 107],
        landscape: true,
      },
      {
        id: "por-status",
        title: "Pedidos por status",
        description: "Distribuição dos pedidos entre as etapas do fluxo de compras.",
        badge: `${byStatus.size} status`,
        head: ["Status", "Quantidade"],
        rows: [...byStatus.entries()].map(([s, n]) => [s, n]),
      },
      {
        id: "por-origem",
        title: "Pedidos por origem",
        description: "Volume de pedidos nacionais x internacionais.",
        badge: `${byOrigin.size} origem(ns)`,
        head: ["Origem", "Quantidade"],
        rows: [...byOrigin.entries()].map(([o, n]) => [o, n]),
      },
      {
        id: "por-fornecedor",
        title: "Pedidos por fornecedor",
        description: "Ranking de fornecedores com total de pedidos e pendências em aberto.",
        badge: `${bySupplier.size} fornecedor(es)`,
        head: ["Fornecedor", "Total pedidos", "Em aberto"],
        rows: [...bySupplier.entries()].map(([s, v]) => [s, v.count, v.pending]),
      },
      {
        id: "por-trabalho",
        title: "Consolidado por trabalho",
        description: "Visão executiva por ID de trabalho: peças, faltantes, pedidos e recebimentos.",
        badge: `${jobsMap.size} trabalho(s)`,
        head: ["Job", "Peças", "Peças faltantes", "Qtd. faltante", "Pedidos", "Recebidos"],
        rows: byJob,
        accent: [90, 60, 200],
        landscape: true,
      },
    ];
  }, [fParts, fOrders]);

  const handlePDF = (s: ReportSection) => {
    if (s.rows.length === 0) {
      toast.error("Sem dados para gerar este relatório com os filtros atuais.");
      return;
    }
    downloadTablePDF({
      title: s.title,
      subtitle: filtersLabel,
      filename: `${s.id}-${Date.now()}.pdf`,
      head: s.head,
      body: s.rows,
      accent: s.accent,
      orientation: s.landscape ? "landscape" : "portrait",
    });
  };

  const handleCSV = (s: ReportSection) => {
    if (s.rows.length === 0) {
      toast.error("Sem dados para gerar este relatório com os filtros atuais.");
      return;
    }
    downloadCSV(`${s.id}-${Date.now()}.csv`, s.head, s.rows);
  };

  return (
    <AppShell title="Relatórios">
      <Card>
        <CardHeader>
          <CardTitle>Filtros gerais</CardTitle>
          <CardDescription>Aplicados a todos os relatórios abaixo.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>ID Trabalho</Label>
            <Input value={jobF} onChange={(e) => setJobF(e.target.value)} placeholder="Ex.: J-1024" />
          </div>
          <div>
            <Label>Data de análise</Label>
            <Input type="date" value={dateF} onChange={(e) => setDateF(e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyMissing} onCheckedChange={(v) => setOnlyMissing(!!v)} />
              Somente materiais faltantes
            </label>
          </div>
          <div className="flex items-end justify-end">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir tela
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <CardDescription className="mt-1">{s.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">{s.badge}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-40 overflow-auto text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {s.head.map((h) => (
                          <th key={h} className="text-left px-2 py-1 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.rows.slice(0, 6).map((r, i) => (
                        <tr key={i} className="border-t">
                          {r.map((c, j) => (
                            <td key={j} className="px-2 py-1 truncate max-w-[160px]">{String(c)}</td>
                          ))}
                        </tr>
                      ))}
                      {s.rows.length === 0 && (
                        <tr>
                          <td colSpan={s.head.length} className="px-2 py-3 text-center text-muted-foreground">
                            Sem dados para o filtro atual.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {s.rows.length > 6 && (
                  <div className="px-2 py-1 text-[11px] text-muted-foreground bg-muted/30 border-t">
                    +{s.rows.length - 6} linha(s) no arquivo completo
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handlePDF(s)}>
                  <FileText className="h-4 w-4 mr-2" /> Baixar PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleCSV(s)}>
                  <FileDown className="h-4 w-4 mr-2" /> Baixar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
