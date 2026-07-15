import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dashboard — Smart Material Reconciliation" },
      {
        name: "description",
        content:
          "Análise e reconciliação inteligente de materiais para tubulação industrial a partir de desenhos técnicos.",
      },
      { property: "og:title", content: "Dashboard — Smart Material Reconciliation" },
      {
        property: "og:description",
        content:
          "Análise e reconciliação inteligente de materiais para tubulação industrial a partir de desenhos técnicos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dashboard — Smart Material Reconciliation" },
      { name: "twitter:description", content: "Análise e reconciliação inteligente de materiais para tubulação industrial a partir de desenhos técnicos." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bd3c11a7-4df7-4f3d-8b2e-41229a11a4b1/id-preview-a597489c--f9563f33-a5bd-452c-bc1f-f8db3a9c271a.lovable.app-1784151593157.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bd3c11a7-4df7-4f3d-8b2e-41229a11a4b1/id-preview-a597489c--f9563f33-a5bd-452c-bc1f-f8db3a9c271a.lovable.app-1784151593157.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background text-foreground">
            <AppSidebar />
            <Outlet />
          </div>
          <Toaster richColors position="top-right" />
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
