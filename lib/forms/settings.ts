"use server";

import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryServerSafe, type SafeResult } from "@/lib/utils";
import type { FormsWebhookMode, FormsWebhookSettings, FormsWebhookUrls } from "@/types/forms";
import type { Json, MbicSettingInsert } from "@/types/database";

const WEBHOOK_MODE_KEY = "forms_webhook_mode";
const WEBHOOK_URLS_KEY = "forms_webhook_urls";

const DEFAULT_WEBHOOK_URLS: FormsWebhookUrls = {
  test: "https://n8n.floorgpt.ai/webhook-test/mbic-sales-ops-forms",
  prod: "https://n8n.floorgpt.ai/webhook/mbic-sales-ops-forms",
};

const DEFAULT_WEBHOOK_MODE: FormsWebhookMode = "test";

type SettingRow = {
  value: Json | null;
};

async function readSetting(key: string): Promise<Json | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mbic_settings")
    .select("value")
    .eq("key", key)
    .limit(1)
    .maybeSingle<SettingRow>();

  if (error) {
    throw new Error(`Failed to read setting (${key}): ${error.message}`);
  }

  return data?.value ?? null;
}

export async function getFormsWebhookSettings(): Promise<FormsWebhookSettings> {
  const safe = await tryServerSafe(
    (async () => {
      const [modeValue, urlsValue] = await Promise.all([
        readSetting(WEBHOOK_MODE_KEY),
        readSetting(WEBHOOK_URLS_KEY),
      ]);

      const mode =
        modeValue === "prod" || modeValue === "test" ? (modeValue as FormsWebhookMode) : DEFAULT_WEBHOOK_MODE;

      const partialUrls = (urlsValue ?? {}) as Partial<FormsWebhookUrls>;
      const urls: FormsWebhookUrls = {
        test: typeof partialUrls.test === "string" && partialUrls.test ? partialUrls.test : DEFAULT_WEBHOOK_URLS.test,
        prod: typeof partialUrls.prod === "string" && partialUrls.prod ? partialUrls.prod : DEFAULT_WEBHOOK_URLS.prod,
      };

      return {
        mode,
        urls,
      } satisfies FormsWebhookSettings;
    })(),
    "forms:getWebhookSettings",
    {
      mode: DEFAULT_WEBHOOK_MODE,
      urls: DEFAULT_WEBHOOK_URLS,
    },
  );

  console.log("[forms] settings:get", safe._meta);
  return safe.data;
}

export async function saveFormsWebhookSettings(
  settings: FormsWebhookSettings,
): Promise<SafeResult<FormsWebhookSettings>> {
  const supabase = getSupabaseAdminClient();

  const safe = await tryServerSafe(
    (async () => {
      const { mode, urls } = settings;

      const modeRow: MbicSettingInsert = {
        key: WEBHOOK_MODE_KEY,
        value: mode,
      };
      const urlsRow: MbicSettingInsert = {
        key: WEBHOOK_URLS_KEY,
        value: urls as Json,
      };

      await Promise.all([
        supabase.from("mbic_settings").upsert(modeRow as never, { onConflict: "key" }),
        supabase.from("mbic_settings").upsert(urlsRow as never, { onConflict: "key" }),
      ]);

      return settings;
    })(),
    "forms:saveWebhookSettings",
    settings,
  );

  console.log("[forms] settings:save", safe._meta);
  return safe;
}

export async function resolveWebhookUrl(settings: FormsWebhookSettings): Promise<{
  mode: FormsWebhookMode;
  url: string;
}> {
  const mode = settings.mode === "prod" ? "prod" : "test";
  const url = settings.urls[mode] ?? DEFAULT_WEBHOOK_URLS[mode];
  return { mode, url };
}

export async function getDefaultWebhookSettings(): Promise<FormsWebhookSettings> {
  return {
    mode: DEFAULT_WEBHOOK_MODE,
    urls: DEFAULT_WEBHOOK_URLS,
  };
}
