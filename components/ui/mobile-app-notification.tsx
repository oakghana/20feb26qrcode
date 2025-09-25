"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Smartphone, Download, CheckCircle } from "lucide-react"
import { usePWA } from "@/hooks/use-pwa"

export function MobileAppNotification() {
  const { isInstalled, canInstall, installApp } = usePWA()

  if (isInstalled) {
    return null
  }

  const handleInstallClick = async () => {
    if (canInstall) {
      await installApp()
    } else {
      alert(
        "To install this app:\n\n1. Tap the share button in your browser\n2. Select 'Add to Home Screen'\n3. Tap 'Add' to install",
      )
    }
  }

  return (
    <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
      <Smartphone className="h-5 w-5 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="text-blue-800 font-semibold text-base block mb-1">📱 Get the QCC Attendance Mobile App</span>
          <span className="text-blue-700 text-sm">
            Install our mobile app for faster check-ins, offline access, and real-time location tracking. One-click
            install!
          </span>
        </div>
        <Button
          className="ml-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 font-semibold"
          onClick={handleInstallClick}
        >
          {canInstall ? (
            <>
              <Download className="h-4 w-4 mr-2" />
              Install Now
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Add to Home
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
