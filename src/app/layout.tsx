import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stale Data Detective",
  description: "Laboratório de consistência de dados com Next.js e PostgreSQL",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
