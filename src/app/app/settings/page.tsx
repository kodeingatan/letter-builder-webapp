import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/features/settings/server";
import { OrganizationForm } from "@/features/settings/organization-form";

export const metadata: Metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return <OrganizationForm settings={getSettings()} canEdit={user?.role === "admin"} />;
}
