"use client";

import { VnstockApiConfig } from "@/components/vnstock-api-config";
import { PasswordSettings } from "@/components/password-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and API configurations
        </p>
      </div>

      <div className="grid gap-6">
        {/* Password Settings */}
        <PasswordSettings />

        {/* Vnstock API Configuration */}
        <VnstockApiConfig />

        {/* Additional Settings Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Settings</CardTitle>
            <CardDescription>
              General platform configuration and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              More settings coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
