import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Mundo Música", description: "Escucha, descubre y disfruta música." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
