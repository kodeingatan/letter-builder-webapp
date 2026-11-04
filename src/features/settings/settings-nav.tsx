"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/settings", label: "Umum", exact: true },
  { href: "/app/settings/users", label: "Pengguna", adminOnly: true },
  { href: "/app/settings/data", label: "Data & Cadangan", adminOnly: true },
];

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-line px-3 py-1.5" aria-label="Navigasi pengaturan">
      {TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[12.5px] font-medium transition-colors",
              active ? "bg-warm text-ink ring-1 ring-inset ring-line" : "text-muted hover:bg-warm/70 hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
