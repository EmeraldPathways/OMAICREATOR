import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omega Content Studio",
  description:
    "Profession-specific content drafting with source grounding and a compliance audit for Omega Financial Management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IE">
      <body>{children}</body>
    </html>
  );
}
