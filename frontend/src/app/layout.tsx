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
  title: "VERITAS · AICTE AI Pre-Scrutiny, Document Forensics & Infrastructure Compliance Workbench",
  description:
    "SIH26261 · Explainable AI Application Validation, 3-Layer X-Ray Document Forensics, Issuing Authority Verification & Cross-College Clone Hunter for AICTE.",
};

const DIRECTION_CONTRACT_COMMENT = `<!--
THESIS: Veritas turns AICTE approval scrutiny into a dual-zone Forensic Light-Table & Statutory Comparator Workbench, refusing generic SaaS card grids and black-box AI scores.
OWN-WORLD: Warm alabaster statutory dossier paper (#F5F4F0) paired with a calibrated dark optical inspection chamber (#10141A), separated by 1px hairline seams (#D5D2C8 / #262E3B) and semantic signal inks (Vermilion #B91C1C, Amber #B45309, Veridian #0F766E, Cobalt #1D4ED8).
STORY: An AICTE Scrutiny Officer or Institutional Nodal Officer cross-verifies APH 2024-27 checklists against live QR-vs-OCR tethers, OpenCV ELA heatmaps, SIFT copy-move vectors, source APIs, and pHash Clone Hunter matches before recording an immutable SHA-256 decision.
FIRST VIEWPORT: Top statutory command bar with role switcher and dossier selector; left co-referenced APH checklist and cross-document consistency matrix; right dark optical X-Ray comparator canvas with live ELA quality/scale sliders and bounding-box overlays.
FORM: Candidate 3 (National Forensic Light-Table & Statutory Comparator Workbench), index 3 on ordered list, seed key 49a98106.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${publicSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased selection:bg-cobalt selection:text-white">
        <div
          style={{ display: "none" }}
          dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT_COMMENT }}
        />
        {children}
      </body>
    </html>
  );
}
