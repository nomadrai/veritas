import type { Metadata } from "next";
import { Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veritas · AICTE Pre-Scrutiny, Document Verification & Compliance Portal",
  description:
    "SIH26261 · AI-Powered Application Validation, 3-Layer Document Forensics, Issuing Authority Verification & Infrastructure Compliance for AICTE.",
};

const DIRECTION_CONTRACT_COMMENT = `<!--
THESIS: Veritas is a daylight-first, multi-page AICTE Civic Pre-Scrutiny Portal that prioritizes the officer's daily application queue and clear regulatory workflows over cramped single-page dark consoles.
OWN-WORLD: Clean slate-alabaster canvas (#F8FAFC) with crisp white institutional cards (#FFFFFF), authoritative AICTE Navy (#1E3A8A) and Cobalt (#1D4ED8) navigation, subtle 1px borders (#E2E8F0), and clear semantic status pills (Verified #0F766E, Discrepancy #B91C1C, Shortfall #B45309).
STORY: An AICTE Scrutiny Officer lands on the daily Scrutiny Queue to triage submitted dossiers, drills into dedicated pages for the APH Checklist & Cross-Document Table, the 3-Layer Document Forensics Studio, and Infrastructure & Clone Hunter, and logs SHA-256 decisions.
FIRST VIEWPORT: Top AICTE portal header and 5-page horizontal navigation bar; daily Scrutiny Queue summary header with role toggle; 4-step workflow guide; and filterable institutional dossier list alongside priority findings.
FORM: Daylight Civic Regulatory Portal & Multi-Page Scrutiny Suite, seed key 49a98106.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${publicSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A] antialiased selection:bg-[#1D4ED8] selection:text-white">
        <div
          style={{ display: "none" }}
          dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT_COMMENT }}
        />
        {children}
      </body>
    </html>
  );
}
