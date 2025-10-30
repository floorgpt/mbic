import type { Metadata } from "next";

import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Settings • CPF Floors MBIC",
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Settings"
        title="Platform Settings"
        description="Manage API credentials, Retell automation hooks, and integrations for the MBIC platform."
      />

      <Tabs defaultValue="apis" className="space-y-6">
        <TabsList className="w-full justify-start gap-2 bg-muted/60">
          <TabsTrigger value="apis">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>

        <TabsContent value="apis" className="space-y-4">
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-xl">
                OpenAI & Supabase
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  OpenAI API Key
                </label>
                <Input
                  type="password"
                  value="•••••••••••••••••••••"
                  readOnly
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Stored in environment variable <code>OPENAI_API_KEY</code>.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supabase URL
                </label>
                <Input
                  value="https://sqhqzrtmjspwqqhnjtss.supabase.co"
                  readOnly
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Update via <code>NEXT_PUBLIC_SUPABASE_URL</code>.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supabase Anon Key
                </label>
                <Input
                  type="password"
                  value="•••••••••••••••••••••"
                  readOnly
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Retell AI Secret
                </label>
                <Input
                  type="password"
                  value="•••••••••••••••••••••"
                  readOnly
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-xl">
                Retell AI Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Agent Endpoint
                  </label>
                  <Input
                    value="/api/agent/sales"
                    readOnly
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Secret
                  </label>
                  <Input
                    type="password"
                    value="•••••••••••••••••••••"
                    readOnly
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline">Copy Endpoint</Button>
                <Button variant="default">Generate New Secret</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-xl">
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-4">
                <h3 className="font-montserrat text-base font-semibold">
                  OpenAI Assistant
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connected via `OPENAI_API_KEY`. Configure prompt templates and
                  model selection in code under `lib/ai`.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <h3 className="font-montserrat text-base font-semibold">
                  Supabase
                </h3>
                <p className="text-sm text-muted-foreground">
                  Live analytics sourced from `sales_demo`, `customers_demo`, and
                  `sales_reps_demo`. Manage schema in Supabase Studio.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-xl">
                Public Forms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Loss Opportunity Form
                </label>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  <div className="flex w-full items-center gap-2">
                    <Input
                      value="https://cpf-mbic2.netlify.app/forms"
                      readOnly
                      className="font-mono"
                    />
                    <CopyButton value="https://cpf-mbic2.netlify.app/forms" />
                  </div>
                  <Button asChild variant="secondary" className="md:shrink-0">
                    <Link href="https://cpf-mbic2.netlify.app/forms" target="_blank" rel="noreferrer">
                      Open Form
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comparte este enlace con Sales Ops para registrar pérdidas sin necesidad de iniciar sesión.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
