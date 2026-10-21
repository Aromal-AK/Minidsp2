import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniDSP",
  description: "Training-only data discovery and classification",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light">
      <head>
        {/* lepidus.css ships no @font-face; load Open Sans so --font-family-primary resolves. */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="https://lepide-design-system.vercel.app/v1/lepidus.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
