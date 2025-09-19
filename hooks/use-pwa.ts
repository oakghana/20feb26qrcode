"use client"

import { useState, useEffect } from "react"

interface PWAState {
  isInstalled: boolean
  isOnline: boolean
  canInstall: boolean
  installPrompt: any
}

export function usePWA() {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstalled: false,
    isOnline: true,
    canInstall: false,
    installPrompt: null,
  })

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true

      setPWAState((prev) => ({ ...prev, isInstalled: isStandalone }))
    }

    const updateOnlineStatus = () => {
      setPWAState((prev) => ({ ...prev, isOnline: navigator.onLine }))
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setPWAState((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: e,
      }))
    }

    const handleAppInstalled = () => {
      setPWAState((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null,
      }))
    }

    const registerServiceWorker = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js")
          console.log("[PWA] Service Worker registered:", registration)

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            console.log("[PWA] Service Worker update found")
          })
        } catch (error) {
          console.error("[PWA] Service Worker registration failed:", error)
        }
      }
    }

    checkInstalled()
    updateOnlineStatus()
    registerServiceWorker()

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [])

  const installApp = async () => {
    if (pwaState.installPrompt) {
      try {
        await pwaState.installPrompt.prompt()
        const { outcome } = await pwaState.installPrompt.userChoice
        console.log("[PWA] Install outcome:", outcome)

        setPWAState((prev) => ({
          ...prev,
          canInstall: false,
          installPrompt: null,
        }))
      } catch (error) {
        console.error("[PWA] Install failed:", error)
      }
    }
  }

  return {
    ...pwaState,
    installApp,
  }
}
