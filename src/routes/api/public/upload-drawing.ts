import { createFileRoute } from "@tanstack/react-router";

// Server-side proxy for the Make.com PDF upload webhook.
// Keeps the webhook URL out of the client bundle and enforces basic validation.
export const Route = createFileRoute("/api/public/upload-drawing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhook = process.env.PDF_UPLOAD_WEBHOOK;
        if (!webhook) {
          return new Response(
            JSON.stringify({ error: "PDF_UPLOAD_WEBHOOK não configurado no servidor." }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response(JSON.stringify({ error: "multipart/form-data inválido" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const file = form.get("File");
        if (!(file instanceof File)) {
          return new Response(
            JSON.stringify({ error: 'Campo "File" ausente ou inválido.' }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }

        const MAX = 25 * 1024 * 1024;
        if (file.size > MAX) {
          return new Response(JSON.stringify({ error: "Arquivo excede 25 MB." }), {
            status: 413,
            headers: { "content-type": "application/json" },
          });
        }

        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          return new Response(JSON.stringify({ error: "Apenas arquivos PDF são aceitos." }), {
            status: 415,
            headers: { "content-type": "application/json" },
          });
        }

        // Rebuild a clean FormData to forward — only "File" and optional "jobId".
        const forward = new FormData();
        forward.append("File", file, file.name);
        const jobId = form.get("jobId");
        if (typeof jobId === "string" && jobId.trim()) {
          forward.append("jobId", jobId.trim().slice(0, 128));
        }

        try {
          const upstream = await fetch(webhook, { method: "POST", body: forward });
          const body = await upstream.text();
          return new Response(body || (upstream.ok ? "ok" : "erro"), {
            status: upstream.status,
            headers: {
              "content-type": upstream.headers.get("content-type") ?? "text/plain",
            },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Falha ao contatar automação: " + (e as Error).message }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
