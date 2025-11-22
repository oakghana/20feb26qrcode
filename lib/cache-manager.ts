/**
 * Cache Manager Utility
 * Provides functions to clear browser cache, storage, and force app refresh
 */

export async function clearAppCache(): Promise<void> {
  try {
    console.log("[v0] Starting cache clearing process...")

    // 1. Clear all localStorage
    localStorage.clear()
    console.log("[v0] Cleared localStorage")

    // 2. Clear all sessionStorage
    sessionStorage.clear()
    console.log("[v0] Cleared sessionStorage")

    // 3. Clear IndexedDB
    if (window.indexedDB) {
      const databases = await window.indexedDB.databases()
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name)
          console.log(`[v0] Deleted IndexedDB: ${db.name}`)
        }
      }
    }

    // 4. Clear Service Worker caches
    if ("caches" in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          await caches.delete(cacheName)
          console.log(`[v0] Deleted cache: ${cacheName}`)
        }),
      )
    }

    // 5. Unregister Service Workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        registrations.map(async (registration) => {
          await registration.unregister()
          console.log("[v0] Unregistered service worker")
        }),
      )
    }

    console.log("[v0] Cache clearing completed successfully")
  } catch (error) {
    console.error("[v0] Error clearing cache:", error)
    throw error
  }
}

export function forceReload(): void {
  // Use location.reload with forceGet to bypass cache
  window.location.reload()
}

export async function clearCacheAndReload(): Promise<void> {
  await clearAppCache()
  // Small delay to ensure cache clearing completes
  setTimeout(() => {
    forceReload()
  }, 500)
}
