'use client'

import { useEffect, useState, useCallback } from 'react'

export interface DeviceRadiusSettings {
  mobile: { checkIn: number; checkOut: number }
  tablet: { checkIn: number; checkOut: number }
  laptop: { checkIn: number; checkOut: number }
  desktop: { checkIn: number; checkOut: number }
}

const DEFAULT_SETTINGS: DeviceRadiusSettings = {
  mobile: { checkIn: 100, checkOut: 100 },
  tablet: { checkIn: 150, checkOut: 150 },
  laptop: { checkIn: 400, checkOut: 400 },
  desktop: { checkIn: 2000, checkOut: 1500 },
}

// Polling interval in milliseconds (30 seconds)
const POLL_INTERVAL = 30000

export function useDeviceRadiusSettings() {
  const [settings, setSettings] = useState<DeviceRadiusSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/device-radius', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })

      if (!response.ok) {
        console.warn('[v0] Failed to fetch device radius settings, using defaults')
        setSettings(DEFAULT_SETTINGS)
        setError(null)
        return
      }

      const data = await response.json()
      const newSettings = data.settings || DEFAULT_SETTINGS
      
      console.log('[v0] Device radius settings updated:', {
        ...newSettings,
        timestamp: new Date().toISOString(),
      })
      
      setSettings(newSettings)
      setError(null)
      setLastUpdate(Date.now())
    } catch (err) {
      console.error('[v0] Error fetching device radius settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      // Keep previous settings or use defaults
      if (!settings) {
        setSettings(DEFAULT_SETTINGS)
      }
    } finally {
      setLoading(false)
    }
  }, [settings])

  // Initial fetch
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Poll for updates every POLL_INTERVAL
  useEffect(() => {
    const pollInterval = setInterval(() => {
      console.log('[v0] Polling device radius settings for updates...')
      fetchSettings()
    }, POLL_INTERVAL)

    return () => clearInterval(pollInterval)
  }, [fetchSettings])

  // Manual refresh function for immediate updates
  const refresh = useCallback(async () => {
    console.log('[v0] Manually refreshing device radius settings')
    await fetchSettings()
  }, [fetchSettings])

  return { settings, loading, error, refresh, lastUpdate }
}

