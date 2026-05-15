import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier Couture ERP",
  description: "Gestion d'un atelier de couture"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
