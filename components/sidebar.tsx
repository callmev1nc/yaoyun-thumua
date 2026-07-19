"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList, Truck, Calculator, Building2, Users, LayoutDashboard, LogOut, Boxes, Menu, X } from "lucide-react";
import { signOut } from "@/app/actions";
import { NavLink } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { UserRole } from "@/types/db";

const NAV: {
  href: string;
  key: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/purchase-orders", key: "orders", icon: ClipboardList },
  { href: "/delivery-notes", key: "delivery", icon: Truck },
  { href: "/ledger", key: "ledger", icon: Calculator },
  { href: "/suppliers", key: "suppliers", icon: Building2 },
  { href: "/customers", key: "customers", icon: Boxes },
  { href: "/admin/users", key: "users", icon: Users, adminOnly: true },
];

export function Sidebar({
  role,
  email,
}: {
  role: UserRole;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const t_r = useTranslations("roles");
  const t_a = useTranslations("auth");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const sidebar = document.getElementById("mobile-sidebar");
    const firstFocusable = sidebar?.querySelector<HTMLElement>(
      "a, button, input, [tabindex]:not([tabindex='-1'])"
    );
    firstFocusable?.focus();
    return () => prev?.focus();
  }, [open]);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5">
        <img src="/logo.png" alt="Yaoyun" className="h-8 w-auto" />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Yaoyun</p>
          <p className="text-xs text-muted-foreground">{t("brandSubtitle")}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-1" aria-label={t("navAria")}>
        {NAV.filter((n) => !n.adminOnly || role === "admin").map((n) => (
          <NavLink key={n.href} href={n.href} label={t(n.key)} icon={n.icon} onClick={close} />
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium" title={email ?? ""}>
              {email ?? "—"}
            </p>
            <Badge variant={role === "admin" ? "default" : "secondary"} className="mt-0.5 h-4 text-[10px]">
              {role === "admin" ? t_r("admin") : t_r("staff")}
            </Badge>
          </div>
        </div>
        <div className="mb-2">
          <LanguageSwitcher />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t_a("signOut")}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Button variant="outline" size="icon" onClick={() => setOpen(!open)} className="shadow-sm">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label={t("navAria")}
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-sidebar transition-transform md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
