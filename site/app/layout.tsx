import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morph",
  description: "A Chrome extension that lets you edit any HTML page like a slide deck — drag, edit text, swap images, and refine layouts with AI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
