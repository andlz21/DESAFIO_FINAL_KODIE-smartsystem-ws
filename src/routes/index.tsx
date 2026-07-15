import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { applyOverrides, getDashboardData } from "@/lib/api.functions";
import {
  Package,
  Boxes,
  AlertTriangle,
  MinusCircle,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Smart Material Reconciliation" }] }),
  component: Dashboard,
});

const COLORS = ["#2b6cf6", "#22a06b", "#e8a13a", "#d0453e", "#8b5cf6"];

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg grid place-items-center ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    refetchInterval: 30_000,
  });

  const parts = data?.necessaryParts ?? [];
  const orders = useMemo(() => (data ? applyOverrides(data.orders) : []), [data]);

  const jobs = new Set(parts.map((p) => p.jobId)).size;
  const divergentes = parts.filter((p) => p.missingQuantity > 0).length;
  const totalFaltante = parts.reduce((a, p) => a + p.missingQuantity, 0);
  const abertos = orders.filter((o) => o.orderStatus !== "Recebido" && o.orderStatus !== "Cancelado").length;
  const recebidos = orders.filter((o) => o.orderStatus === "Recebido").length;

  const statusData = Object.entries(
    parts.reduce<Record<string, number>>((acc, p) => {
      const k = p.reconciliationResult || "—";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const orderStatusData = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.orderStatus] = (acc[o.orderStatus] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const missingByJob = Object.entries(
    parts.reduce<Record<string, number>>((acc, p) => {
      acc[p.jobId] = (acc[p.jobId] || 0) + p.missingQuantity;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const originData = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.origin] = (acc[o.origin] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Trabalhos analisados" value={jobs} icon={Boxes} accent="bg-primary/15 text-primary" />
        <KpiCard label="Peças analisadas" value={parts.length} icon={Package} accent="bg-primary/15 text-primary" />
        <KpiCard label="Peças divergentes" value={divergentes} icon={AlertTriangle} accent="bg-warning/20 text-warning-foreground" />
        <KpiCard label="Qtd. total faltante" value={totalFaltante} icon={MinusCircle} accent="bg-destructive/15 text-destructive" />
        <KpiCard label="Pedidos em aberto" value={abertos} icon={ShoppingCart} accent="bg-primary/15 text-primary" />
        <KpiCard label="Pedidos recebidos" value={recebidos} icon={CheckCircle2} accent="bg-success/15 text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Materiais por status de conciliação</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por status de compra</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={orderStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2b6cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quantidade faltante por ID Trabalho</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={missingByJob}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#d0453e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nacional vs. Internacional</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={originData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {originData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
