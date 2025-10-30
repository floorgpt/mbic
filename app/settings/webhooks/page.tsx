import type { Metadata } from "next";

import { WebhookSettingsForm } from "@/components/forms/webhook-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormsWebhookSettings } from "@/lib/forms/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Webhooks Settings",
  description: "Configura los webhooks de MBIC Forms y prueba su conectividad.",
};

export default async function WebhooksSettingsPage() {
  const settings = await getFormsWebhookSettings();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-10">
      <div className="space-y-2">
        <h1 className="font-montserrat text-3xl font-semibold">Webhooks Settings</h1>
        <p className="text-sm text-muted-foreground">
          Administra las URLs de n8n para Sales Ops Forms. Cambia entre modo Test y Prod y valida la
          conectividad con un ping directo desde MBIC.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Webhooks</CardTitle>
          <CardDescription>
            Ajusta las URLs y el modo activo. Los cambios aplican inmediatamente al formulario
            público.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookSettingsForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
