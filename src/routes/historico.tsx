import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clearAllSnapshots, deleteSnapshot, listSnapshots, type DashboardSnapshot } from "@/lib/history";
import { downloadCSV } from "@/lib/exporters";
import { toast } from "sonner";
import { Download, Eye, Trash2, History as HistoryIcon, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico do Dashboard — Smart Material Reconciliation" },
      {
        name: "description",
        content:
          "Versões salvas do dashboard: consulte, exporte ou remova snapshots anteriores da reconciliação de materiais.",
      },
    ],
  }),
  component: HistoricoPage,
});

function exportSnapshotCSV(snap: DashboardSnapshot) {
  downloadCSV(
    `snapshot-${snap.id.slice(0, 8)}-pecas.csv`,
    ["Job", "Peça", "Descrição", "Pedida", "Enviada", "Faltante", "Resultado", "Status"],
    snap.necessaryParts.map((p) => [
      p.jobId,
      p.partId,
      p.description,
      p.requestedQuantity,
      p.shippedQuantity,
      p.missingQuantity,
      p.reconciliationResult,
      p.status,
    ]),
  );
  downloadCSV(
    `snapshot-${snap.id.slice(0, 8)}-pedidos.csv`,
    ["Pedido", "Job", "Peça", "Descrição", "Faltante", "Origem", "Status", "Fornecedor", "Previsão"],
    snap.orders.map((o) => [
      o.orderId,
      o.jobId,
      o.partId,
      o.description,
      o.missingQuantity,
      o.origin,
      o.orderStatus,
      o.supplier ?? "",
      o.expectedDeliveryDate ?? "",
    ]),
  );
}

function HistoricoPage() {
  const [snaps, setSnaps] = useState<DashboardSnapshot[]>([]);
  const [selected, setSelected] = useState<DashboardSnapshot | null>(null);

  const refresh = () => setSnaps(listSnapshots());
  useEffect(() => {
    refresh();
  }, []);

  return (
    <AppShell title="Histórico do Dashboard">
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 text-primary" aria-hidden />
              Versões salvas
            </h2>
            <p className="text-sm text-muted-foreground">
              Cada snapshot preserva o estado do dashboard (peças e pedidos) no momento em que foi
              criado.
            </p>
          </div>
          {snaps.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" aria-hidden />
                  Limpar histórico
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover todas as versões?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação apaga todos os snapshots armazenados neste navegador e não pode ser
                    desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearAllSnapshots();
                      refresh();
                      toast.success("Histórico limpo");
                    }}
                  >
                    Apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Alert>
          <Info className="h-4 w-4" aria-hidden />
          <AlertTitle>Como funciona</AlertTitle>
          <AlertDescription>
            Os snapshots são gerados automaticamente ao clicar em <b>Resetar dashboard</b> na tela
            inicial, ou manualmente através do botão <b>Salvar snapshot</b>. Eles ficam
            armazenados apenas neste navegador.
          </AlertDescription>
        </Alert>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshots ({snaps.length})</CardTitle>
          <CardDescription>Mais recentes no topo.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {snaps.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum snapshot salvo ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead className="text-right">Trabalhos</TableHead>
                  <TableHead className="text-right">Peças</TableHead>
                  <TableHead className="text-right">Faltantes</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snaps.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {new Date(s.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.demoMode ? "outline" : "secondary"}>
                        {s.demoMode ? "Demo" : "Ao vivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.metrics.jobs}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.metrics.parts}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {s.metrics.totalFaltante}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.metrics.pedidos}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground text-xs">
                      {s.note || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ver detalhes"
                          onClick={() => setSelected(s)}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Baixar CSV"
                          onClick={() => exportSnapshotCSV(s)}
                        >
                          <Download className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          onClick={() => {
                            deleteSnapshot(s.id);
                            refresh();
                            toast.success("Snapshot removido");
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Snapshot • {new Date(selected.createdAt).toLocaleString("pt-BR")}</SheetTitle>
                <SheetDescription>
                  {selected.metrics.parts} peças • {selected.metrics.pedidos} pedidos •{" "}
                  {selected.metrics.totalFaltante} un. faltantes
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Peças</h3>
                  <div className="rounded-md border max-h-72 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Peça</TableHead>
                          <TableHead className="text-right">Faltante</TableHead>
                          <TableHead>Resultado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.necessaryParts.map((p) => (
                          <TableRow key={`${p.jobId}-${p.partId}`}>
                            <TableCell>{p.jobId}</TableCell>
                            <TableCell className="truncate max-w-[160px]">{p.description}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {p.missingQuantity}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {p.reconciliationResult}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Pedidos</h3>
                  <div className="rounded-md border max-h-72 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.orders.map((o) => (
                          <TableRow key={o.orderId}>
                            <TableCell className="font-mono text-xs">{o.orderId}</TableCell>
                            <TableCell className="truncate max-w-[220px]">{o.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {o.orderStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => exportSnapshotCSV(selected)}>
                    <Download className="h-4 w-4 mr-1" aria-hidden />
                    Baixar CSV
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
