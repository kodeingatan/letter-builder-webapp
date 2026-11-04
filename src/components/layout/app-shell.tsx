"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Blocks,
  ChevronLeft,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings,
  ShieldCheck,
  Table2,
  Workflow,
  X,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { cn, initials } from "@/lib/utils";
import { Brand, BrandMark } from "./brand";
import { DropdownMenu } from "@/components/ui/menu";

const PRIMARY_NAV = [
  { href: "/app", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/app/tables", label: "Global Tables", icon: Table2 },
  { href: "/app/components", label: "Components", icon: Blocks },
  { href: "/app/templates", label: "Templates", icon: FileText },
  { href: "/app/administrasi", label: "Administrasi", icon: Workflow },
  { href: "/app/surat", label: "Surat", icon: Send },
];

const SYSTEM_NAV = [
  { href: "/app/settings", label: "Pengaturan", icon: Settings, exact: true },
  { href: "/app/settings/data", label: "Data & Cadangan", icon: Database, adminOnly: true },
];

const ALL_NAV = [...PRIMARY_NAV, ...SYSTEM_NAV];

function useActiveLabel(pathname: string): string {
  const match = [...ALL_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)));
  return match?.label ?? "Ruang Kerja";
}

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeLabel = useActiveLabel(pathname);

  useEffect(() => {
    const stored = window.localStorage.getItem("aksara.sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("aksara.sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const sidebar = (mobile: boolean) => (
    <div className="flex h-full flex-col bg-canvas">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-line",
          collapsed && !mobile ? "justify-center px-2" : "justify-between px-3.5",
        )}
      >
        {collapsed && !mobile ? (
          <Link href="/app" aria-label="Aksara">
            <BrandMark className="h-7 w-7" />
          </Link>
        ) : (
          <Brand />
        )}
        {mobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-[4px] p-1 text-faint hover:bg-warm hover:text-ink"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2.5" aria-label="Navigasi utama">
        {!collapsed || mobile ? (
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
            Ruang kerja
          </p>
        ) : null}
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed && !mobile}
            />
          ))}
        </ul>

        <div className="my-2.5 h-px bg-line" />
        {!collapsed || mobile ? (
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
            Sistem
          </p>
        ) : null}
        <ul className="space-y-0.5">
          {SYSTEM_NAV.filter((item) => !item.adminOnly || user.role === "admin").map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed && !mobile}
            />
          ))}
        </ul>
      </nav>

      <div className="border-t border-line p-2">
        {collapsed && !mobile ? (
          <div className="flex flex-col items-center gap-1">
            <DropdownMenu
              align="right"
              minWidth={210}
              trigger={
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warm text-[10.5px] font-semibold text-muted">
                  {initials(user.name)}
                </span>
              }
              header={user.name}
              items={[
                { label: "Pengaturan", icon: Settings, onSelect: () => router.push("/app/settings") },
                { label: "Keluar", icon: LogOut, onSelect: logout, danger: true, separatorBefore: true },
              ]}
            />
            <button
              type="button"
              onClick={toggleCollapsed}
              className="rounded-[4px] p-1 text-faint hover:bg-warm hover:text-ink"
              aria-label="Perluas sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[6px] px-1 py-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warm text-[10.5px] font-semibold text-muted">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12px] font-medium text-ink">{user.name}</p>
              <p className="flex items-center gap-1 truncate text-[10.5px] capitalize text-faint">
                <ShieldCheck className="h-3 w-3" />
                {user.role === "admin" ? "Admin" : "Operator"}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden rounded-[4px] p-1 text-faint hover:bg-warm hover:text-ink lg:block"
              aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-[4px] p-1 text-faint hover:bg-warm hover:text-danger"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden shrink-0 border-r border-line transition-[width] duration-150 lg:block",
          collapsed ? "w-[56px]" : "w-[228px]",
        )}
      >
        {sidebar(false)}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/25 animate-fade"
          />
          <div className="absolute inset-y-0 left-0 w-[248px] border-r border-line shadow-[var(--shadow-deep)] animate-in">
            {sidebar(true)}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-150",
          collapsed ? "lg:pl-[56px]" : "lg:pl-[228px]",
        )}
      >
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/95 px-3 backdrop-blur sm:px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-[5px] p-1.5 text-muted hover:bg-warm hover:text-ink lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          <div className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
            <Link href="/app" className="flex items-center gap-1 text-faint hover:text-muted">
              <ChevronLeft className="hidden h-3 w-3 sm:block" />
              Aksara
            </Link>
            <span className="text-faint">/</span>
            <span className="truncate font-medium text-ink">{activeLabel}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/app/surat"
              className="hidden items-center gap-1.5 rounded-[5px] border border-line px-2 py-1 text-[11.5px] font-medium text-muted transition-colors hover:bg-warm hover:text-ink sm:flex"
            >
              <Send className="h-3 w-3" />
              Buat surat
            </Link>
            <DropdownMenu
              align="right"
              minWidth={200}
              header={user.email}
              trigger={
                <span className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2 transition-colors hover:bg-warm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warm text-[10px] font-semibold text-muted">
                    {initials(user.name)}
                  </span>
                  <span className="hidden text-[11.5px] font-medium text-muted sm:block">
                    {user.name.split(" ")[0]}
                  </span>
                </span>
              }
              items={[
                {
                  label: user.role === "admin" ? "Admin" : "Operator",
                  icon: ShieldCheck,
                  disabled: true,
                },
                {
                  label: "Pengaturan",
                  icon: Settings,
                  onSelect: () => router.push("/app/settings"),
                  separatorBefore: true,
                },
                {
                  label: "Keluar",
                  icon: LogOut,
                  onSelect: logout,
                  danger: true,
                  separatorBefore: true,
                },
              ]}
            />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  pathname,
  collapsed,
}: {
  item: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
  pathname: string;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center rounded-[5px] py-[7px] text-[12.5px] transition-colors",
          collapsed ? "justify-center px-0" : "gap-2 px-2",
          active
            ? "bg-warm font-medium text-ink"
            : "font-normal text-muted hover:bg-warm/70 hover:text-ink",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-ink" : "text-faint group-hover:text-muted",
          )}
          strokeWidth={1.8}
        />
        {collapsed ? (
          <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-[4px] bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-[var(--shadow-float)] group-hover:block">
            {item.label}
          </span>
        ) : (
          <span className="truncate">{item.label}</span>
        )}
        {active && !collapsed ? (
          <span className="ml-auto h-1 w-1 rounded-full bg-brand" aria-hidden />
        ) : null}
      </Link>
    </li>
  );
}
