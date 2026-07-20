import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getDashboardData } from "@/lib/api.functions";
import type { NecessaryPart } from "@/lib/types";
import { Download, FileDown, FileText } from "lucide-react";
import { downloadPartCSV, downloadPartPDF, downloadTablePDF } from "@/lib/exporters";

export const Route = createFileRoute("/pecas")({
  head: () => ({ meta: [{ title: "Peças necessárias — Smart Material" }] }),
  component: PecasPage,
});

function StatusBadge({ result }: { result: string }) {
  const r = result.toUpperCase();
  if (r === "OK")
    return <Badge className="bg-success text-success-foreground hover:bg-success">OK</Badge>;
  if (r === "FALTANTE")
    return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">FALTANTE</Badge>;
  return <Badge className="bg-warning text-warning-foreground hover:bg-warning">{result}</Badge>;
}

function toCSV(parts: NecessaryPart[]) {
  const headers = [
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
  ];
  const rows = parts.map((p) =>
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
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  return [headers.join(";"), ...rows].join("\n");
}

function download(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function PecasPage() {
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardData() });
  const parts = data?.necessaryParts ?? [];

  const [q, setQ] = useState("");
  const [jobF, setJobF] = useState("");
  const [partF, setPartF] = useState("");
  const [resF, setResF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [selected, setSelected] = useState<NecessaryPart | null>(null);

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      if (jobF && !p.jobId.toLowerCase().includes(jobF.toLowerCase())) return false;
      if (partF && !p.partId.toLowerCase().includes(partF.toLowerCase())) return false;
      if (resF && p.reconciliationResult !== resF) return false;
      if (statusF && p.status !== statusF) return false;
      if (onlyMissing && p.missingQuantity <= 0) return false;
      if (fromDate && p.analysisDate < fromDate) return false;
      if (toDate && p.analysisDate > toDate) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !p.jobId.toLowerCase().includes(s) &&
          !p.partId.toLowerCase().includes(s) &&
          !p.description.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [parts, q, jobF, partF, resF, statusF, fromDate, toDate, onlyMissing]);

  return (
    <AppShell title="Peças necessárias">
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="col-span-2">
            <Label>Busca livre</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Peça, descrição..." />
          </div>
          <div>
            <Label>ID Trabalho</Label>
            <Input value={jobF} onChange={(e) => setJobF(e.target.value)} />
          </div>
          <div>
            <Label>ID Peça</Label>
            <Input value={partF} onChange={(e) => setPartF(e.target.value)} />
          </div>
          <div>
            <Label>Resultado</Label>
            <Input value={resF} onChange={(e) => setResF(e.target.value)} placeholder="OK / FALTANTE" />
          </div>
          <div>
            <Label>Status</Label>
            <Input value={statusF} onChange={(e) => setStatusF(e.target.value)} />
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-end gap-2 col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyMissing} onCheckedChange={(v) => setOnlyMissing(!!v)} />
              Somente faltantes
            </label>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => download(`pecas-${Date.now()}.csv`, toCSV(filtered))}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Trabalho</TableHead>
                <TableHead>ID Peça</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Qtd Pedida</TableHead>
                <TableHead className="text-right">Qtd Planejada</TableHead>
                <TableHead className="text-right">Qtd Enviada</TableHead>
                <TableHead className="text-right">Qtd Faltante</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Data Análise</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Nenhuma peça encontrada.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p, i) => (
                <TableRow
                  key={`${p.jobId}-${p.partId}-${i}`}
                  className={`cursor-pointer ${p.missingQuantity > 0 ? "bg-destructive/5" : ""}`}
                  onClick={() => setSelected(p)}
                >
                  <TableCell className="font-medium">{p.jobId}</TableCell>
                  <TableCell>{p.partId}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={p.description}>
                    {p.description}
                  </TableCell>
                  <TableCell className="text-right">{p.requestedQuantity}</TableCell>
                  <TableCell className="text-right">{p.plannedQuantity}</TableCell>
                  <TableCell className="text-right">{p.shippedQuantity}</TableCell>
                  <TableCell className="text-right font-semibold">{p.missingQuantity}</TableCell>
                  <TableCell><StatusBadge result={p.reconciliationResult} /></TableCell>
                  <TableCell>{p.analysisDate}</TableCell>
                  <TableCell>{p.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da peça</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3 text-sm px-4 pb-4">
              {(
                [
                  ["ID Trabalho", selected.jobId],
                  ["ID Peça", selected.partId],
                  ["Descrição", selected.description],
                  ["Qtd Pedida", selected.requestedQuantity],
                  ["Qtd Planejada", selected.plannedQuantity],
                  ["Qtd Enviada", selected.shippedQuantity],
                  ["Qtd Faltante", selected.missingQuantity],
                  ["Resultado", selected.reconciliationResult],
                  ["Data Análise", selected.analysisDate],
                  ["Status", selected.status],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
