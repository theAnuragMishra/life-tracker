import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Gather — A little room for everything",
  description:
    "A thoughtful home for your actions, practices, goals, and things you want to explore.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
