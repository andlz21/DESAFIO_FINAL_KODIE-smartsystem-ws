import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardData, getIntegrationStatus } from "@/lib/api.functions";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — Smart Material" }] }),
  component: IntegrationsPage,
});

function Row({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between border-b py-3">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {ok ? (
        <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Configurado</Badge>
      ) : (
        <Badge variant="outline" className="border-warning text-warning-foreground bg-warning/20">
          <XCircle className="h-3.5 w-3.5 mr-1" />Pendente
        </Badge>
      )}
    </div>
  );
}

function IntegrationsPage() {
  const { data: status } = useQuery({ queryKey: ["integ"], queryFn: () => getIntegrationStatus() });
  const { data: dash, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboardData() });
  const [testing, setTesting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const test = async () => {
    setTesting(true);
    try {
      await refetch();
      toast.success("Conexão testada com sucesso");
      setLastError(null);
    } catch (e) {
      const msg = (e as Error).message;
      setLastError(msg);
      toast.error(`Falha no teste: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppShell title="Integrações">
      <Card>
        <CardHeader><CardTitle>Status das integrações Make.com</CardTitle></CardHeader>
        <CardContent>
          <Row label="PDF Upload Webhook" ok={!!status?.pdfUploadConfigured} hint="VITE_PDF_UPLOAD_WEBHOOK — envio do desenho para IA" />
          <Row label="Sheets Read Webhook" ok={!!status?.sheetsReadConfigured} hint="SHEETS_READ_WEBHOOK — leitura de PEÇAS NECESSÁRIAS e PEDIDOS" />
          <Row label="Order Update Webhook" ok={!!status?.orderUpdateConfigured} hint="ORDER_UPDATE_WEBHOOK — atualização de pedidos" />
          <Row label="Order Create Webhook" ok={!!status?.orderCreateConfigured} hint="ORDER_CREATE_WEBHOOK — criação de novos pedidos" />
          <Row label="Report Data Webhook" ok={!!status?.reportDataConfigured} hint="REPORT_DATA_WEBHOOK — dados agregados para relatórios (opcional)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sincronização</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Última sincronização bem-sucedida</span>
            <span className="font-medium">{dash?.lastUpdated ? new Date(dash.lastUpdated).toLocaleString("pt-BR") : "—"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Último erro</span>
            <span className="font-medium text-destructive">{lastError || "Nenhum"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Modo demonstração</span>
            <span className="font-medium">{dash?.demoMode ? "Ativo" : "Desativado"}</span>
          </div>
          <Button onClick={test} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Testar conexão
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Como configurar</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>1. Adicione as variáveis de ambiente do servidor: <code>SHEETS_READ_WEBHOOK</code>, <code>ORDER_UPDATE_WEBHOOK</code>, <code>ORDER_CREATE_WEBHOOK</code>, <code>REPORT_DATA_WEBHOOK</code>.</p>
          <p>2. A variável <code>VITE_PDF_UPLOAD_WEBHOOK</code> é usada pelo navegador para envio direto do PDF ao Make.com.</p>
          <p>3. As credenciais do Google Sheets ficam apenas no Make.com — nunca no navegador.</p>
          <p>4. Ao configurar <code>SHEETS_READ_WEBHOOK</code>, o modo demonstração é desativado automaticamente.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
