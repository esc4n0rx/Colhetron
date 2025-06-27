import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { SeparationProvider } from "@/contexts/SeparationContext"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Sistema de Separação de Pedidos Colhetron",
  description: "Sistema moderno para gerenciamento de separação de pedidos"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-white`}>
        <AuthProvider>
          <SeparationProvider>{children}</SeparationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
