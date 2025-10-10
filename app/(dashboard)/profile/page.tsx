import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

const PROFILE_UID = "d2f6532b-05f2-4daa-b892-0eee75080a3b";

export const metadata: Metadata = {
  title: "My Profile • CPF Floors MBIC",
};

export default async function ProfilePage() {
  let user: User | null = null;
  let errorMessage: string | null = null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(PROFILE_UID);
    if (error) {
      errorMessage = error.message;
    } else {
      user = data.user;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unable to load profile data.";
  }

  if (!user) {
    return (
      <div className="space-y-6">
      <PageHeader kicker="Profile" title="My Profile" />
        <Card className="border-none bg-amber-50">
          <CardHeader>
            <CardTitle className="font-montserrat text-lg text-amber-900">
              Profile data unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-800">
            {errorMessage ? (
              <p>{errorMessage}</p>
            ) : (
              <p>
                Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to your environment to
                allow MBIC to retrieve authentication profiles.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = user.user_metadata ?? {};
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleString()
    : "Unknown";
  const email = user.email ?? metadata.email;
  const fullName = metadata.full_name ?? metadata.name ?? "Team Member";

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Profile"
        title="My Profile"
        description="Manage your MBIC identity and review recent access details."
        actions={
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            UID: {PROFILE_UID.slice(0, 8)}…
          </Badge>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start gap-2 bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 md:grid-cols-2">
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-lg">
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Name
                </p>
                <p className="font-medium text-foreground">{fullName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p className="font-medium text-foreground">{email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Role
                </p>
                <p className="font-medium text-foreground">
                  {metadata.role ?? "Sales Operations"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-lg">
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{createdAt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Sign-In</span>
                <span className="font-medium">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : "No activity recorded"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email Confirmed</span>
                <span className="font-medium">
                  {user.email_confirmed_at ? "Yes" : "Pending"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-lg">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Activity logs will surface here, including dashboard visits and
                Retell AI agent triggers, once telemetry is enabled.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="font-montserrat text-lg">
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Multi-factor Auth</span>
                <span className="font-medium">
                  {user.factors?.length ? "Enabled" : "Not configured"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">App Role</span>
                <span className="font-medium">
                  {metadata.role ?? "Standard Access"}
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Update security policies from the Supabase dashboard or wire new
                  policies into MBIC via the upcoming Settings &gt; Security tab.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
