"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  LayoutDashboard,
  ClipboardCheck,
  FileSearch,
  Building2,
  UploadCloud,
  UserCheck,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  activeAppId?: string;
  role?: "SCRUTINY_OFFICER" | "NODAL_OFFICER";
  onRoleChange?: (role: "SCRUTINY_OFFICER" | "NODAL_OFFICER") => void;
}

export function AppShell({
  children,
  activeAppId = "AICTE-2026-EOA-8841",
  role = "SCRUTINY_OFFICER",
  onRoleChange,
}: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Scrutiny Queue",
      description: "Assigned applications & triage",
      icon: LayoutDashboard,
      match: (p: string) => p === "/",
    },
    {
      href: `/applications/${activeAppId}`,
      label: "Application Checklist",
      description: "APH norms & cross-doc table",
      icon: ClipboardCheck,
      match: (p: string) => p.startsWith("/applications"),
    },
    {
      href: `/forensics?app=${activeAppId}`,
      label: "Document Verification",
      description: "QR cross-lock, PDF & tamper check",
      icon: FileSearch,
      match: (p: string) => p.startsWith("/forensics"),
    },
    {
      href: `/infrastructure?app=${activeAppId}`,
      label: "Infrastructure & Photos",
      description: "CV equipment, GPS & clone check",
      icon: Building2,
      match: (p: string) => p.startsWith("/infrastructure"),
    },
    {
      href: `/portal?app=${activeAppId}`,
      label: "Upload & Audit Log",
      description: "Nodal self-check & history",
      icon: UploadCloud,
      match: (p: string) => p.startsWith("/portal"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Civic GovTech Header */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E3A8A] text-white shadow-sm transition-colors hover:bg-[#1E40AF]"
            >
              <Scale className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/" className="text-lg font-bold tracking-tight text-[#0F172A]">
                  Veritas
                </Link>
                <span className="rounded-md border border-[#CBD5E1] bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                  AICTE Pre-Scrutiny Portal
                </span>
                <span className="hidden rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#1D4ED8] md:inline-block">
                  APH 2024–2027 Handbook Norms
                </span>
              </div>
              <p className="text-xs text-[#475569]">
                All India Council for Technical Education · Application Validation & Compliance Verification
              </p>
            </div>
          </div>

          {/* Right Controls: Officer Identity & Role Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {onRoleChange ? (
              <div
                className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1"
                role="group"
                aria-label="Switch Portal View"
              >
                <button
                  type="button"
                  onClick={() => onRoleChange("SCRUTINY_OFFICER")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    role === "SCRUTINY_OFFICER"
                      ? "bg-white text-[#1E3A8A] shadow-sm"
                      : "text-[#475569] hover:text-[#0F172A]"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  AICTE Scrutiny Officer
                </button>
                <button
                  type="button"
                  onClick={() => onRoleChange("NODAL_OFFICER")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    role === "NODAL_OFFICER"
                      ? "bg-white text-[#1E3A8A] shadow-sm"
                      : "text-[#475569] hover:text-[#0F172A]"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Institution Nodal Officer
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#334155] sm:flex">
                <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                <span>
                  Officer: <strong className="font-semibold text-[#0F172A]">Shri V. K. Subramanian</strong> (WRO Scrutiny Committee)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Primary Navigation Bar */}
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <nav
            aria-label="Primary Portal Navigation"
            className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-1 px-4 sm:flex-nowrap sm:px-6"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex shrink-0 items-center gap-2.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-[#1D4ED8] bg-white text-[#1E3A8A] font-semibold"
                      : "border-transparent text-[#475569] hover:bg-white/60 hover:text-[#0F172A]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-[#1D4ED8]" : "text-[#64748B] group-hover:text-[#0F172A]"
                    }`}
                  />
                  <div>
                    <div className="leading-none">{item.label}</div>
                    <div className="mt-1 hidden text-[11px] font-normal text-[#64748B] lg:block">
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Page Content Container */}
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Clean Statutory Footer */}
      <footer className="mt-12 border-t border-[#E2E8F0] bg-white py-5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 text-xs text-[#64748B] sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#334155]">Veritas Decision-Support System</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>
              Advisory pre-scrutiny verification only. Final regulatory decisions rest with AICTE Competent Authorities.
            </span>
          </div>
          <div>AICTE Approval Process Handbook (APH) 2024–2027 · SIH26261</div>
        </div>
      </footer>
    </div>
  );
}
