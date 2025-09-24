import type React from "react"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import "./globals.css"
import { NotificationProvider } from "@/components/ui/notification-system"
import { ThemeProvider } from "@/components/theme-provider"
import { PWAServiceWorker } from "@/components/ui/pwa-service-worker"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata = {
  title: "QCC Electronic Attendance | Quality Control Company Limited",
  description: "Quality Control Company Limited Electronic Attendance System - Intranet Portal",
  manifest: "/manifest.json",
  themeColor: "#ea580c",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QCC Attendance",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/images/qcc-logo.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
      <head>
        <meta name="application-name" content="QCC Attendance" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QCC Attendance" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#ea580c" />
        <meta name="msapplication-tap-highlight" content="no" />

        <link rel="apple-touch-icon" href="/images/qcc-logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/qcc-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/qcc-logo.png" />
        <link rel="mask-icon" href="/images/qcc-logo.png" color="#ea580c" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NotificationProvider>{children}</NotificationProvider>
          <PWAServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  )
}
