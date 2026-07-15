import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  applyOverrides,
  getDashboardData,
  saveOrderOverride,
  updateOrderFn,
} from "@/lib/api.functions";
import type { Order, OrderOrigin, OrderStatus } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Smart Material" }] }),
  component: PedidosPage,
});

const STATUSES: OrderStatus[] = [
  "Solicitado",
  "Em cotação",
  "Aguardando aprovação",
  "Aprovado",
  "Comprado",
  "Em transporte",
  "Recebido",
  "Cancelado",
];
const ORIGINS: OrderOrigin[] = ["Nacional", "Internacional", "A definir"];

const STATUS_COLOR: Record<string, string> = {
  Solicitado: "bg-muted text-foreground",
  "Em cotação": "bg-primary/15 text-primary",
  "Aguardando aprovação": "bg-warning/25 text-warning-foreground",
  Aprovado: "bg-primary/25 text-primary",
  Comprado: "bg-primary text-primary-foreground",
  "Em transporte": "bg-chart-5/25 text-foreground",
  Recebido: "bg-success text-success-foreground",
  Cancelado: "bg-destructive/25 text-destructive",
};

function PedidosPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardData() });
  const baseOrders = useMemo(() => (data ? applyOverrides(data.orders) : []), [data]);

  const [jobF, setJobF] = useState("");
  const [partF, setPartF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [originF, setOriginF] = useState("");
  const [supplierF, setSupplierF] = useState("");
  const [respF, setRespF] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editing, setEditing] = useState<Order | null>(null);
  const [confirmReceived, setConfirmReceived] = useState<Order | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ order, changedFields }: { order: Order; changedFields: Partial<Order> }) => {
      saveOrderOverride(order.orderId, changedFields);
      const res = await updateOrderFn({ data: { order, changedFields } });
      if (!res.ok) throw new Error(res.error || "Falha ao atualizar");
      return res;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => {
      toast.error(`Falha ao atualizar: ${(e as Error).message}`);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const filtered = useMemo(() => {
    return baseOrders.filter((o) => {
      if (jobF && !o.jobId.toLowerCase().includes(jobF.toLowerCase())) return false;
      if (partF && !o.partId.toLowerCase().includes(partF.toLowerCase())) return false;
      if (statusF && o.orderStatus !== statusF) return false;
      if (originF && o.origin !== originF) return false;
      if (supplierF && !(o.supplier || "").toLowerCase().includes(supplierF.toLowerCase())) return false;
      if (respF && !(o.responsible || "").toLowerCase().includes(respF.toLowerCase())) return false;
      if (fromDate && (o.expectedDeliveryDate || "") < fromDate) return false;
      if (toDate && (o.expectedDeliveryDate || "") > toDate) return false;
      return true;
    });
  }, [baseOrders, jobF, partF, statusF, originF, supplierF, respF, fromDate, toDate]);

  const quickStatus = (o: Order, s: OrderStatus) => {
    if (s === "Recebido") {
      setConfirmReceived(o);
      return;
    }
    mutation.mutate({ order: o, changedFields: { orderStatus: s } });
  };

  return (
    <AppShell title="Pedidos">
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div><Label>ID Trabalho</Label><Input value={jobF} onChange={(e) => setJobF(e.target.value)} /></div>
          <div><Label>ID Peça</Label><Input value={partF} onChange={(e) => setPartF(e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={statusF || "__all"} onValueChange={(v) => setStatusF(v === "__all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origem</Label>
            <Select value={originF || "__all"} onValueChange={(v) => setOriginF(v === "__all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                {ORIGINS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Fornecedor</Label><Input value={supplierF} onChange={(e) => setSupplierF(e.target.value)} /></div>
          <div><Label>Responsável</Label><Input value={respF} onChange={(e) => setRespF(e.target.value)} /></div>
          <div><Label>Entrega de</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
          <div><Label>Entrega até</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pedido</TableHead>
                <TableHead>ID Trabalho</TableHead>
                <TableHead>ID Peça</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Qtd Faltante</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Prev. Entrega</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((o) => (
                <TableRow key={o.orderId}>
                  <TableCell className="font-mono text-xs">{o.orderId}</TableCell>
                  <TableCell>{o.jobId}</TableCell>
                  <TableCell>{o.partId}</TableCell>
                  <TableCell className="max-w-[220px] truncate" title={o.description}>{o.description}</TableCell>
                  <TableCell className="text-right">{o.missingQuantity}</TableCell>
                  <TableCell>{o.origin}</TableCell>
                  <TableCell>
                    <Select value={o.orderStatus} onValueChange={(v) => quickStatus(o, v as OrderStatus)}>
                      <SelectTrigger className="h-8 w-[170px]">
                        <SelectValue>
                          <Badge className={STATUS_COLOR[o.orderStatus] || ""}>{o.orderStatus}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{o.supplier || "—"}</TableCell>
                  <TableCell>{o.expectedDeliveryDate || "—"}</TableCell>
                  <TableCell>{o.responsible || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setEditing(o)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditOrderSheet
        order={editing}
        onClose={() => setEditing(null)}
        onSave={(order, changed) => {
          mutation.mutate({ order, changedFields: changed });
          setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmReceived} onOpenChange={(o) => !o && setConfirmReceived(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recebimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está marcando o pedido {confirmReceived?.orderId} como <b>Recebido</b>. Esta ação será
              sincronizada com a planilha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmReceived) {
                  mutation.mutate({
                    order: confirmReceived,
                    changedFields: { orderStatus: "Recebido" },
                  });
                }
                setConfirmReceived(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EditOrderSheet({
  order,
  onClose,
  onSave,
}: {
  order: Order | null;
  onClose: () => void;
  onSave: (o: Order, changed: Partial<Order>) => void;
}) {
  const [draft, setDraft] = useState<Order | null>(order);
  // Reset when order changes
  useMemo(() => setDraft(order), [order]);
  if (!draft) return null;
  const patch = <K extends keyof Order>(k: K, v: Order[K]) => setDraft({ ...draft, [k]: v });

  const submit = () => {
    if (!draft.orderStatus) return toast.error("Status é obrigatório");
    const changed: Partial<Order> = {};
    (Object.keys(draft) as (keyof Order)[]).forEach((k) => {
      if (order && draft[k] !== order[k]) (changed[k] as unknown) = draft[k];
    });
    onSave(draft, changed);
  };

  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar pedido {draft.orderId}</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><Label>ID Trabalho</Label><Input value={draft.jobId} disabled /></div>
            <div><Label>ID Peça</Label><Input value={draft.partId} disabled /></div>
          </div>
          <div><Label>Descrição</Label><Input value={draft.description} disabled /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Origem *</Label>
              <Select value={draft.origin} onValueChange={(v) => patch("origin", v as OrderOrigin)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORIGINS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={draft.orderStatus} onValueChange={(v) => patch("orderStatus", v as OrderStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Previsão de entrega</Label>
              <Input
                type="date"
                value={draft.expectedDeliveryDate || ""}
                onChange={(e) => patch("expectedDeliveryDate", e.target.value)}
              />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input value={draft.supplier || ""} onChange={(e) => patch("supplier", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={draft.responsible || ""} onChange={(e) => patch("responsible", e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={draft.notes || ""} onChange={(e) => patch("notes", e.target.value)} />
          </div>
        </div>
        <SheetFooter className="px-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
