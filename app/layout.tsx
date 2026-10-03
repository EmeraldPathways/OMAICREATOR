import type { Metadata } from "next";
import "./globals.css";
import "./rankscope/rankscope.css";

export const metadata: Metadata = {
  title: "Omega Content Studio",
  description: "Omega Financial Management content drafting, campaign planning and compliance workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
