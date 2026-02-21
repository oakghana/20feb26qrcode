import type React from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { metadata, viewport } from "./metadata"
import RootLayoutClient from "./root-layout-client"

// CRITICAL REBUILD TRIGGER: 2026-02-21T17:45:00Z
// Clears ALL cached compiled code - forces complete fresh compilation
// Removes all stale handleEarlyCheckoutConfirm and early checkout dialog code
// Forces new build without cached optimization
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
