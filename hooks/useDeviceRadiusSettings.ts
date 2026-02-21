'use client'

import { useEffect, useState } from 'react'

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
  desktop: { checkIn: 2000, checkOut: 2000 },
}

export function useDeviceRadiusSettings() {
  const [settings, setSettings] = useState<DeviceRadiusSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/settings/device-radius')
        
        if (!response.ok) {
          console.warn('[v0] Failed to fetch device radius settings, using defaults')
          setSettings(DEFAULT_SETTINGS)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log('[v0] Device radius settings loaded:', data)
        setSettings(data.settings || DEFAULT_SETTINGS)
      } catch (err) {
        console.error('[v0] Error fetching device radius settings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
        setSettings(DEFAULT_SETTINGS)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  return { settings, loading, error }
}
