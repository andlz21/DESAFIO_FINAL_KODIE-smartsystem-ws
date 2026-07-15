import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Moon, Sun, RefreshCw, User } from "lucide-react";
import { type ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { getDashboardData } from "@/lib/api.functions";
import { toast } from "sonner";

export function AppTopbar({ title }: { title: string }) {
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    refetchInterval: 30_000,
  });
  const last = data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString("pt-BR") : "—";
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="flex-1">
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      {data?.demoMode && (
        <Badge variant="outline" className="border-warning text-warning-foreground bg-warning/20">
          Modo demonstração
        </Badge>
      )}
      <span className="hidden text-xs text-muted-foreground md:inline">Atualizado: {last}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          toast.success("Dados atualizados");
        }}
        title="Atualizar"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={toggle} title="Alternar tema">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" title="Notificações">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Usuário">
        <User className="h-4 w-4" />
      </Button>
    </header>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopbar title={title} />
      <main className="flex-1 p-4 md:p-6 space-y-6">{children}</main>
    </div>
  );
}
