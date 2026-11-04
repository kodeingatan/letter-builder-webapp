import { getCurrentUser } from "@/lib/auth";
import { SettingsNav } from "@/features/settings/settings-nav";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col">
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Pengaturan</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Identitas instansi, akses pengguna, dan cadangan data ruang kerja.
        </p>
      </div>
      <SettingsNav isAdmin={user?.role === "admin"} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-warm/30">{children}</div>
    </div>
  );
}
