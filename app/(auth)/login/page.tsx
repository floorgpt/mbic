import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in • CPF Launchpad",
  description:
    "Access the CPF Floors MBIC dashboard with your Launchpad credentials.",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-primary/80 via-primary to-primary/70 md:flex">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-40" />
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 text-primary-foreground">
          <div className="flex items-center justify-between">
            <Badge className="bg-white/20 text-white">
              <Sparkles className="mr-1 size-3" />
              CPF Launchpad
            </Badge>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </div>
          <div className="mx-auto flex max-w-md flex-col gap-6 text-white">
            <h1 className="font-montserrat text-4xl font-semibold leading-tight">
              Empowering every CPF dealer with data-driven storytelling.
            </h1>
            <p className="text-sm text-white/80">
              MBIC surfaces signals from sales, marketing, and Retell AI so CPF
              Launchpad teams can respond faster and close smarter.
            </p>
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                Today&apos;s focus
              </p>
              <p className="mt-3 font-montserrat text-lg">
                Sync your Launchpad credentials to unlock dealer playbooks,
                brand activations, and customer sentiment trends.
              </p>
            </div>
          </div>
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} CPF Floors. All rights reserved.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div>
            <h2 className="font-montserrat text-2xl font-semibold">
              Sign in to MBIC
            </h2>
            <p className="text-sm text-muted-foreground">
              Use your CPF Launchpad email to access dashboards and automations.
            </p>
          </div>
          <div className="rounded-2xl border bg-muted/40 p-8">
            <LoginForm />
          </div>
          <Button variant="link" asChild className="self-start px-0">
            <Link href="/">Return to overview</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
