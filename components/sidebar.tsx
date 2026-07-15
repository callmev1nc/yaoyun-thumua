"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Truck, Calculator, Building2, Users, LayoutDashboard, LogOut, Boxes, Menu, X, Package } from "lucide-react";
import { signOut } from "@/app/actions";
import { NavLink } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/db";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/purchase-orders", label: "Đặt hàng", icon: ClipboardList },
  { href: "/delivery-notes", label: "Giao hàng", icon: Truck },
  { href: "/ledger", label: "Bảng tính tiền", icon: Calculator },
  { href: "/suppliers", label: "Nhà cung cấp", icon: Building2 },
  { href: "/customers", label: "Khách hàng", icon: Boxes },
  { href: "/admin/users", label: "Người dùng", icon: Users, adminOnly: true },
];

export function Sidebar({
  role,
  email,
}: {
  role: UserRole;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);

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
      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-sm">
          <Package className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Yaoyun</p>
          <p className="text-xs text-muted-foreground">Thu mua</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-1">
        {NAV.filter((n) => !n.adminOnly || role === "admin").map((n) => (
          <NavLink key={n.href} href={n.href} label={n.label} icon={n.icon} onClick={close} />
        ))}
      </nav>

      {/* User card */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium" title={email ?? ""}>
              {email ?? "—"}
            </p>
            <Badge variant={role === "admin" ? "default" : "secondary"} className="mt-0.5 h-4 text-[10px]">
              {role === "admin" ? "Quản trị" : "Nhân viên"}
            </Badge>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Button variant="outline" size="icon" onClick={() => setOpen(!open)} className="shadow-sm">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-sidebar transition-transform md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
