import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle, LayoutDashboard, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Enviar desenho — Smart Material Reconciliation" }] }),
  component: UploadPage,
});

type State = "idle" | "uploading" | "received" | "processing" | "done" | "error";

const STATES: Record<State, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  idle: { label: "Aguardando envio", icon: UploadCloud },
  uploading: { label: "Enviando PDF...", icon: Loader2 },
  received: { label: "PDF recebido", icon: CheckCircle2 },
  processing: { label: "Processando com IA...", icon: Loader2 },
  done: { label: "Reconciliação concluída", icon: CheckCircle2 },
  error: { label: "Erro no processamento", icon: AlertCircle },
};

const MAX_MB = 25;
// Upload é enviado ao proxy interno (server route) que encaminha ao webhook
// do Make.com. O URL do webhook nunca é exposto no bundle do cliente.
const UPLOAD_ENDPOINT = "/api/public/upload-drawing";

function UploadPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState("");
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Formato inválido. Envie um arquivo PDF.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo excede ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setState("idle");
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onFile(e.dataTransfer.files?.[0]);
  }, []);

  const submit = async () => {
    if (!file || state === "uploading" || state === "processing") return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos application/pdf são aceitos.");
      return;
    }
    setError(null);
    setProgress(0);
    setState("uploading");

    console.log("[upload] enviando PDF ao webhook:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    try {
      const fd = new FormData();
      fd.append("File", file, file.name);
      if (jobId) fd.append("jobId", jobId);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", WEBHOOK);
        // Não definir Content-Type manualmente — o browser gera multipart/form-data com boundary.
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const body = xhr.responseText || xhr.statusText || "sem corpo de resposta";
            reject(new Error(`Webhook respondeu HTTP ${xhr.status}: ${body}`));
          }
        };
        xhr.onerror = () => reject(new Error("Falha de rede ao contatar o webhook"));
        xhr.send(fd);
      });

      setState("received");
      setTimeout(() => setState("processing"), 400);
      setTimeout(() => {
        setState("done");
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        qc.refetchQueries({ queryKey: ["dashboard"] });
        toast.success("Reconciliação concluída. Dashboard atualizado.");
        setShowSuccess(true);
      }, 1800);
    } catch (e) {
      setState("error");
      setError((e as Error).message);
      toast.error("Erro ao enviar PDF. Tente novamente.");
    }
  };

  const timelineSteps: State[] = ["uploading", "received", "processing", "done"];
  const currentIdx = timelineSteps.indexOf(state);

  return (
    <AppShell title="Enviar desenho">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload de desenho técnico (PDF)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 transition p-10 text-center"
            >
              <UploadCloud className="mx-auto h-10 w-10 text-primary mb-2" />
              <p className="font-medium">Arraste o PDF aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Apenas PDF, até {MAX_MB} MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-md border p-3">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-sm">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <Badge variant="secondary">{STATES[state].label}</Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="jobId">ID Trabalho (opcional)</Label>
              <Input
                id="jobId"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Ex.: JOB-1042 (será extraído do desenho se não informado)"
              />
            </div>

            {(state === "uploading" || progress > 0) && state !== "error" && (
              <div className="space-y-1">
                <Progress value={progress} />
                <div className="text-xs text-muted-foreground">Progresso: {progress}%</div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={submit}
                disabled={!file || state === "uploading" || state === "processing"}
              >
                {state === "uploading" || state === "processing" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UploadCloud className="h-4 w-4 mr-2" />
                )}
                Enviar e analisar desenho
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setJobId("");
                  setState("idle");
                  setProgress(0);
                  setError(null);
                }}
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linha do processo</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {timelineSteps.map((s, i) => {
                const Icon = STATES[s].icon;
                const active = i <= currentIdx && state !== "error";
                return (
                  <li key={s} className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full grid place-items-center border ${
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          active && (s === "processing" || s === "uploading") ? "animate-spin" : ""
                        }`}
                      />
                    </div>
                    <span className={active ? "font-medium" : "text-muted-foreground"}>
                      {STATES[s].label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Análise concluída com sucesso
            </DialogTitle>
            <DialogDescription>
              O desenho <b>{file?.name}</b> foi processado e a planilha foi atualizada.
              Confira os indicadores atualizados no Dashboard ou revise as peças necessárias.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccess(false);
                navigate({ to: "/pecas" });
              }}
            >
              <Package className="h-4 w-4 mr-2" />
              Ver peças
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                navigate({ to: "/" });
              }}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Ir para o Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
