import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morph",
  description: "A Chrome extension that lets you edit any HTML page like a slide deck — drag, edit text, swap images, and refine layouts with AI.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
