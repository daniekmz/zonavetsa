"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LucideIcon, Menu, RefreshCw, X } from "lucide-react";
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
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-slate-900 dark:text-white">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-[100dvh] w-[88vw] max-w-80 flex-col overflow-y-auto overscroll-contain border-r border-slate-200 bg-white px-4 py-4 shadow-xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:w-80 lg:bg-white/95 lg:py-5",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="grid-overlay absolute inset-0 hidden opacity-50 lg:block" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col safe-bottom">
          <div className="mb-6 flex items-center justify-between">
            <BrandMark compact subtitle={roleSubtitle} />
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="panel-surface mb-6 p-4">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <Avatar src={avatarUrl} name={userName} className="h-12 w-12 rounded-2xl ring-signal" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary font-bold text-white shadow-soft-signal">
                  {avatarFallback}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{userName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{userMeta}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {statBadge ? <span className="chip-signal">{statBadge}</span> : null}
            </div>
          </div>

          <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto pb-4 pr-1">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard/admin" &&
                        item.href !== "/dashboard/guru" &&
                        item.href !== "/dashboard/siswa" &&
                        pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 active:scale-[0.99]",
                          active
                            ? "bg-primary text-white shadow-soft-signal"
                            : "text-slate-600 hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-cyan-50 text-primary group-hover:bg-white dark:bg-slate-900 dark:text-cyan-300 dark:group-hover:bg-slate-700"
                          )}
                        >
                          <item.icon size={18} />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="relative z-10 mt-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
          <Button
            variant="outline"
            className="w-full justify-start text-rose-600 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={onLogout}
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-80">
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
          <div className="glass-tech flex items-start justify-between gap-3 rounded-2xl px-3 py-3 sm:items-center sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="mt-0.5 rounded-xl p-2 text-primary transition-colors hover:bg-cyan-50 dark:text-slate-100 dark:hover:bg-slate-800 lg:hidden"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                  {roleTitle}
                </p>
                <h1 className="truncate font-primary text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                  {headerTitle}
                </h1>
                <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">{headerSubtitle}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="glass" size="icon" className="hidden sm:inline-flex">
                <RefreshCw size={17} />
              </Button>
              <ThemeToggle />
              <NotificationBell userKode={userCode} userRole={userRole} />
            </div>
          </div>
        </header>

        <main className="dashboard-content px-3 pb-8 pt-4 sm:px-6 sm:pt-5">{children}</main>
      </div>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  );
}
