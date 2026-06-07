import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClimateTrust AI — Sensor Validation Platform",
  description:
    "AI-powered validation and trust scoring for environmental sensor data. Detects drift, spikes, and anomalies to ensure data integrity for climate research.",
  keywords: "climate, sensor, validation, anomaly detection, AI, trust score",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-grid">{children}</body>
    </html>
  );
}
