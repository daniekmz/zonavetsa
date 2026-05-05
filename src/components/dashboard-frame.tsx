/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DashboardFrame — Wrapper layout dashboard utama
   Sidebar: collapsible, active state navy-50 + border-left 2px teal
   Header: Menu/X hamburger, sticky, glass
   Breadcrumb: opsional, di bawah header
   BottomTabBar: mobile ≤640px, 4 item utama
   Aksesibilitas: aria-label, focus-visible, touch target 44px
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, LucideIcon, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BottomTabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function DashboardFrame({
  sidebarOpen,
  setSidebarOpen,
  roleTitle,
  roleSubtitle,
  userName,
  userMeta,
  userCode,
  userRole,
  avatarUrl,
  avatarFallback,
  statBadge,
  navSections,
  headerTitle,
  headerSubtitle,
  breadcrumbs,
  bottomTabs,
  onLogout,
  children,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  roleTitle: string;
  roleSubtitle: string;
  userName: string;
  userMeta: string;
  userCode: string;
  userRole: "siswa" | "guru" | "admin";
  avatarUrl?: string | null;
  avatarFallback: string;
  statBadge?: string;
  navSections: NavSection[];
  headerTitle: string;
  headerSubtitle: string;
  breadcrumbs?: BreadcrumbItem[];
  bottomTabs?: BottomTabItem[];
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isNavActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard/admin" &&
      href !== "/dashboard/guru" &&
      href !== "/dashboard/siswa" &&
      pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-surface text-slate-900 dark:bg-background dark:text-white">
      {/* ━━ Sidebar ━━ */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-[100dvh] w-[88vw] max-w-72 flex-col overflow-y-auto overscroll-contain border-r border-slate-200 bg-white dark:bg-slate-900 shadow-sidebar transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:w-64 xl:w-72",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* ━━ Sidebar Header ━━ */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
          <BrandMark compact subtitle={roleSubtitle} />
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup sidebar"
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
          {/* ━━ User Card ━━ */}
          <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <Avatar
                  src={avatarUrl}
                  name={userName}
                  className="h-11 w-11 rounded-xl ring-2 ring-teal/30"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy font-bold text-white">
                  {avatarFallback}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {userName}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {userMeta}
                </p>
              </div>
            </div>
            {statBadge ? (
              <div className="mt-3">
                <span className="badge-teal text-[11px]">{statBadge}</span>
              </div>
            ) : null}
          </div>

          {/* ━━ Nav sections ━━ */}
          <nav className="flex-1 space-y-5 overflow-y-auto pb-4" aria-label="Navigasi sidebar">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-600 dark:text-slate-300">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isNavActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "sidebar-nav-item",
                          active && "active"
                        )}
                      >
                        {/* Icon wrapper ━━ 20px icon ━━ */}
                        <span className={cn("sidebar-icon", active && "bg-teal-50 text-teal dark:bg-teal/20 dark:text-teal-300")}>
                          <item.icon size={20} aria-hidden="true" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* ━━ Logout button ━━ */}
        <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
          <button
            onClick={onLogout}
            aria-label="Keluar dari akun"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            style={{ minHeight: 44 }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10">
              <LogOut size={18} aria-hidden="true" />
            </span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ━━ Main content area ━━ */}
      <div className={cn("flex min-h-screen flex-col lg:ml-64 xl:ml-72")}>

        {/* ━━ Topbar / Header — sticky ━━ */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-5 sm:py-3.5">

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka sidebar menu"
              className="rounded-xl p-2.5 text-navy transition-colors hover:bg-navy-50 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              <Menu size={20} aria-hidden="true" />
            </button>

            {/* Title area */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal dark:text-teal-400">
                {roleTitle}
              </p>
              <h1 className="truncate text-base font-bold text-navy dark:text-white sm:text-lg">
                {headerTitle}
              </h1>
            </div>

            {/* Header actions */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <NotificationBell userKode={userCode} userRole={userRole} />
            </div>
          </div>

          {/* ━━ Breadcrumb — di bawah topbar ━━ */}
          {breadcrumbs && breadcrumbs.length > 1 ? (
            <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800 sm:px-6">
              <nav aria-label="Breadcrumb" className="breadcrumb">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <ChevronRight
                        size={14}
                        className="text-slate-300 dark:text-slate-600 dark:text-slate-300"
                        aria-hidden="true"
                      />
                    )}
                    {crumb.href && i < breadcrumbs.length - 1 ? (
                      <Link
                        href={crumb.href}
                        className="breadcrumb-item text-xs"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="breadcrumb-item active text-xs">
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          ) : null}
        </header>

        {/* ━━ Page content ━━ */}
        <main
          className={cn(
            "dashboard-content flex-1 px-3 pb-8 pt-5 sm:px-5 sm:pt-6",
            bottomTabs && "pb-24 sm:pb-8" /* extra bottom padding bila ada bottom tab */
          )}
        >
          {children}
        </main>
      </div>

      {/* ━━ Sidebar backdrop overlay — mobile ━━ */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-navy/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* ━━ Bottom Tab Bar — mobile ≤640px ━━ */}
      {bottomTabs && bottomTabs.length > 0 ? (
        <nav
          className="bottom-tab-bar sm:hidden"
          aria-label="Navigasi utama mobile"
        >
          {bottomTabs.map((tab) => {
            const active = isNavActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={cn("bottom-tab-item", active && "active")}
              >
                <tab.icon size={22} aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
