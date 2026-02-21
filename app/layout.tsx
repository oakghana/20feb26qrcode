import type React from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { metadata, viewport } from "./metadata"
import RootLayoutClient from "./root-layout-client"

// AGGRESSIVE CACHE BUST: 2026-02-21T22:00:00Z
// EMERGENCY FIX: Force complete rebuild - remove handleEarlyCheckoutCancel error
// Server was running OLD code with undefined handleEarlyCheckoutCancel at line 2316
// and checkoutLocationData initialization error at line 147
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "600"],
  preload: true,
})

export { metadata, viewport }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="font-sans">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  )
}
