import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
  clearLocalDashboardData,
  saveSnapshot,
} from "@/lib/history";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { applyOverrides, getDashboardData } from "@/lib/api.functions";
import type { NecessaryPart, Order } from "@/lib/types";
import {
  Package,
  Boxes,
  AlertTriangle,
  MinusCircle,
  ShoppingCart,
  CheckCircle2,
  TrendingUp,
  Truck,
  Clock,
  ArrowRight,
  Info,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Smart Material Reconciliation" },
      {
        name: "description",
        content:
          "Visão geral da reconciliação de materiais: KPIs, gráficos, peças críticas e status de pedidos em tempo real.",
      },
    ],
  }),
  component: Dashboard,
});

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  to,
  ariaLabel,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  accent: string;
  to?: string;
  ariaLabel?: string;
}) {
  const content = (
    <Card className="h-full transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={`h-11 w-11 shrink-0 rounded-lg grid place-items-center ${accent}`}
          aria-hidden
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold leading-tight tabular-nums">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground truncate">{hint}</div>}
        </div>
        {to && <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" aria-hidden />}
      </CardContent>
    </Card>
  );
  if (to) {
    return (
      <Link to={to} aria-label={ariaLabel ?? label} className="block rounded-lg outline-none">
        {content}
      </Link>
    );
  }
  return <div aria-label={ariaLabel ?? label}>{content}</div>;
}

function statusBadge(result: string) {
  const map: Record<string, string> = {
    OK: "bg-success/15 text-success border-success/30",
    FALTANTE: "bg-destructive/15 text-destructive border-destructive/30",
    PARCIAL: "bg-warning/20 text-warning-foreground border-warning/40",
  };
  return map[result] ?? "bg-muted text-muted-foreground border-border";
}

function orderBadge(status: string) {
  if (status === "Recebido") return "bg-success/15 text-success border-success/30";
  if (status === "Cancelado") return "bg-muted text-muted-foreground border-border";
  if (status === "Em transporte" || status === "Comprado")
    return "bg-primary/15 text-primary border-primary/30";
  return "bg-warning/20 text-warning-foreground border-warning/40";
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    refetchInterval: 30_000,
  });
  const [jobFilter, setJobFilter] = useState<string>("all");

  const parts: NecessaryPart[] = data?.necessaryParts ?? [];
  const orders: Order[] = useMemo(() => (data ? applyOverrides(data.orders) : []), [data]);

  const jobsList = useMemo(() => Array.from(new Set(parts.map((p) => p.jobId))).sort(), [parts]);
  const fParts = jobFilter === "all" ? parts : parts.filter((p) => p.jobId === jobFilter);
  const fOrders = jobFilter === "all" ? orders : orders.filter((o) => o.jobId === jobFilter);

  const jobs = new Set(fParts.map((p) => p.jobId)).size;
  const divergentes = fParts.filter((p) => p.missingQuantity > 0).length;
  const totalFaltante = fParts.reduce((a, p) => a + p.missingQuantity, 0);
  const totalRequested = fParts.reduce((a, p) => a + p.requestedQuantity, 0);
  const totalShipped = fParts.reduce((a, p) => a + p.shippedQuantity, 0);
  const completudePct = totalRequested
    ? Math.min(100, Math.round((totalShipped / totalRequested) * 100))
    : 0;
  const abertos = fOrders.filter(
    (o) => o.orderStatus !== "Recebido" && o.orderStatus !== "Cancelado",
  ).length;
  const recebidos = fOrders.filter((o) => o.orderStatus === "Recebido").length;
  const okPct = fParts.length
    ? Math.round((fParts.filter((p) => p.reconciliationResult === "OK").length / fParts.length) * 100)
    : 0;

  const statusData = Object.entries(
    fParts.reduce<Record<string, number>>((acc, p) => {
      const k = p.reconciliationResult || "—";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const orderStatusData = Object.entries(
    fOrders.reduce<Record<string, number>>((acc, o) => {
      acc[o.orderStatus] = (acc[o.orderStatus] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const missingByJob = Object.entries(
    fParts.reduce<Record<string, number>>((acc, p) => {
      acc[p.jobId] = (acc[p.jobId] || 0) + p.missingQuantity;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const originData = Object.entries(
    fOrders.reduce<Record<string, number>>((acc, o) => {
      acc[o.origin] = (acc[o.origin] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const topMissing = [...fParts]
    .filter((p) => p.missingQuantity > 0)
    .sort((a, b) => b.missingQuantity - a.missingQuantity)
    .slice(0, 5);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14 = new Date(today);
  in14.setDate(in14.getDate() + 14);
  const upcoming = fOrders
    .filter((o) => {
      if (!o.expectedDeliveryDate) return false;
      const d = new Date(o.expectedDeliveryDate);
      return (
        !isNaN(d.getTime()) &&
        d >= today &&
        d <= in14 &&
        o.orderStatus !== "Recebido" &&
        o.orderStatus !== "Cancelado"
      );
    })
    .sort(
      (a, b) =>
        new Date(a.expectedDeliveryDate!).getTime() - new Date(b.expectedDeliveryDate!).getTime(),
    )
    .slice(0, 5);

  const overdue = fOrders.filter((o) => {
    if (!o.expectedDeliveryDate) return false;
    const d = new Date(o.expectedDeliveryDate);
    return (
      !isNaN(d.getTime()) &&
      d < today &&
      o.orderStatus !== "Recebido" &&
      o.orderStatus !== "Cancelado"
    );
  });

  // Timeline (last 14 days) — orders created per day
  const timeline = (() => {
    const days: { name: string; pedidos: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const count = fOrders.filter((o) => o.orderDate === key).length;
      days.push({ name: label, pedidos: count });
    }
    return days;
  })();

  const chartColors = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
  ];

  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      {/* Intro + filter */}
      <section aria-labelledby="overview-heading" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="overview-heading" className="text-lg font-semibold">
              Visão geral da reconciliação
            </h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe o status das peças analisadas, faltantes e pedidos em andamento.
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Filtrar por trabalho"
            className="flex flex-wrap gap-1 rounded-md border bg-card p-1"
          >
            <button
              role="tab"
              aria-selected={jobFilter === "all"}
              onClick={() => setJobFilter("all")}
              className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${
                jobFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Todos os trabalhos
            </button>
            {jobsList.map((j) => (
              <button
                key={j}
                role="tab"
                aria-selected={jobFilter === j}
                onClick={() => setJobFilter(j)}
                className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${
                  jobFilter === j
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        {overdue.length > 0 && (
          <Alert variant="destructive" role="alert">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>Pedidos com entrega atrasada</AlertTitle>
            <AlertDescription>
              {overdue.length} pedido(s) passaram da data prevista de entrega.{" "}
              <Link to="/pedidos" className="underline underline-offset-2 font-medium">
                Revisar pedidos
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        {data?.demoMode && (
          <Alert>
            <Info className="h-4 w-4" aria-hidden />
            <AlertTitle>Modo demonstração</AlertTitle>
            <AlertDescription>
              Nenhum webhook de leitura configurado. Exibindo dados de exemplo para navegação.
            </AlertDescription>
          </Alert>
        )}
      </section>

      {/* KPIs */}
      <section aria-labelledby="kpis-heading" className="space-y-3">
        <h2 id="kpis-heading" className="sr-only">
          Indicadores principais
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Trabalhos"
            value={jobs}
            hint="Desenhos analisados"
            icon={Boxes}
            accent="bg-primary/15 text-primary"
          />
          <KpiCard
            label="Peças analisadas"
            value={fParts.length}
            hint={`${okPct}% conciliadas`}
            icon={Package}
            accent="bg-primary/15 text-primary"
            to="/pecas"
            ariaLabel="Peças analisadas — abrir lista"
          />
          <KpiCard
            label="Divergentes"
            value={divergentes}
            hint="Requer ação"
            icon={AlertTriangle}
            accent="bg-warning/20 text-warning-foreground"
            to="/pecas"
            ariaLabel="Peças divergentes — abrir lista"
          />
          <KpiCard
            label="Qtd. faltante"
            value={totalFaltante}
            hint="Unidades a repor"
            icon={MinusCircle}
            accent="bg-destructive/15 text-destructive"
          />
          <KpiCard
            label="Pedidos em aberto"
            value={abertos}
            hint="Em andamento"
            icon={ShoppingCart}
            accent="bg-primary/15 text-primary"
            to="/pedidos"
            ariaLabel="Pedidos em aberto — abrir lista"
          />
          <KpiCard
            label="Recebidos"
            value={recebidos}
            hint="Concluídos"
            icon={CheckCircle2}
            accent="bg-success/15 text-success"
          />
        </div>

        {/* Progress banner */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-medium">Completude do envio de materiais</span>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {totalShipped} / {totalRequested} un. • <b className="text-foreground">{completudePct}%</b>
              </span>
            </div>
            <Progress
              value={completudePct}
              aria-label={`Completude ${completudePct}%`}
              className="h-2"
            />
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <section aria-labelledby="charts-heading" className="space-y-3">
        <h2 id="charts-heading" className="sr-only">
          Gráficos
        </h2>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList aria-label="Selecionar categoria de gráficos">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Materiais por status de conciliação</CardTitle>
                <CardDescription>Distribuição atual das peças analisadas.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {statusData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Faltantes por trabalho</CardTitle>
                <CardDescription>Trabalhos que concentram mais quantidade em falta.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {missingByJob.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={missingByJob} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="var(--color-chart-4)"
                        radius={[0, 6, 6, 0]}
                        name="Faltantes"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por status</CardTitle>
                <CardDescription>Distribuição da carteira de compras.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {orderStatusData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={orderStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Origem dos pedidos</CardTitle>
                <CardDescription>Nacional vs. internacional.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {originData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={originData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {originData.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" aria-hidden />
                  Pedidos criados nos últimos 14 dias
                </CardTitle>
                <CardDescription>Cadência de novas requisições de compra.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="pedidos"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Lists: top missing + upcoming */}
      <section aria-labelledby="lists-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <h2 id="lists-heading" className="sr-only">
          Prioridades
        </h2>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
                Top peças faltantes
              </CardTitle>
              <CardDescription>Maior quantidade em falta agora.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pecas" aria-label="Ver todas as peças">
                Ver todas <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {topMissing.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma peça faltante. Tudo em dia! 🎉
              </p>
            ) : (
              <ul className="divide-y" role="list">
                {topMissing.map((p) => {
                  const pct = p.requestedQuantity
                    ? Math.round((p.shippedQuantity / p.requestedQuantity) * 100)
                    : 0;
                  return (
                    <li key={`${p.jobId}-${p.partId}`} className="py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{p.description}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${statusBadge(p.reconciliationResult)}`}
                          >
                            {p.reconciliationResult}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.jobId} • {p.partId}
                        </div>
                        <Progress
                          value={pct}
                          aria-label={`Enviado ${pct}%`}
                          className="h-1.5 mt-2"
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-destructive tabular-nums">
                          −{p.missingQuantity}
                        </div>
                        <div className="text-[10px] text-muted-foreground">faltantes</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" aria-hidden />
                Próximas entregas (14 dias)
              </CardTitle>
              <CardDescription>Pedidos com previsão de chegada.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pedidos" aria-label="Ver todos os pedidos">
                Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Sem entregas previstas nos próximos 14 dias.
              </p>
            ) : (
              <ul className="divide-y" role="list">
                {upcoming.map((o) => {
                  const d = new Date(o.expectedDeliveryDate!);
                  const days = Math.max(
                    0,
                    Math.ceil((d.getTime() - today.getTime()) / 86400000),
                  );
                  return (
                    <li key={o.orderId} className="py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{o.description}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${orderBadge(o.orderStatus)}`}
                          >
                            {o.orderStatus}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {o.orderId} • {o.supplier || "Fornecedor a definir"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums flex items-center gap-1 justify-end">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          {d.toLocaleDateString("pt-BR")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          em {days} dia{days === 1 ? "" : "s"}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function EmptyChart() {
  return (
    <div className="h-full grid place-items-center text-sm text-muted-foreground">
      Sem dados para exibir.
    </div>
  );
}
