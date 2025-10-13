"use client";

import * as React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useTheme } from "next-themes";

import { getSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const supabase = React.useMemo(() => getSupabaseClient(), []);
  const { resolvedTheme } = useTheme();

  return (
    <Auth
      supabaseClient={supabase}
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: {
              brand: "#2563eb",
              brandAccent: "#1d4ed8",
            },
            radii: {
              buttonBorderRadius: "12px",
              inputBorderRadius: "12px",
            },
          },
        },
      }}
      providers={[]}
      view="sign_in"
      theme={resolvedTheme === "dark" ? "dark" : "default"}
      localization={{
        variables: {
          sign_in: {
            email_label: "Work email",
            email_input_placeholder: "you@cpffloors.com",
          },
        },
      }}
    />
  );
}
