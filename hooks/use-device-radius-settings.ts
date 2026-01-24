'use client';

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface DeviceRadiusSettings {
  mobile: { checkIn: number; checkOut: number }
  tablet: { checkIn: number; checkOut: number }
  laptop: { checkIn: number; checkOut: number }
  desktop: { checkIn: number; checkOut: number }
}

const DEFAULT_SETTINGS: DeviceRadiusSettings = {
  mobile: { checkIn: 400, checkOut: 400 },
  tablet: { checkIn: 400, checkOut: 400 },
  laptop: { checkIn: 700, checkOut: 700 },
  desktop: { checkIn: 2000, checkOut: 1000 },
}

export function useDeviceRadiusSettings() {
  const [settings, setSettings] = useState<DeviceRadiusSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const processSettings = (data: any[]) => {
      const newSettings: DeviceRadiusSettings = {
        mobile: { checkIn: 400, checkOut: 400 },
        tablet: { checkIn: 400, checkOut: 400 },
        laptop: { checkIn: 700, checkOut: 700 },
        desktop: { checkIn: 2000, checkOut: 1000 },
      }

      for (const item of data) {
        if (item.device_type === "mobile") {
          newSettings.mobile = {
            checkIn: item.check_in_radius_meters,
            checkOut: item.check_out_radius_meters,
          }
        } else if (item.device_type === "tablet") {
          newSettings.tablet = {
            checkIn: item.check_in_radius_meters,
            checkOut: item.check_out_radius_meters,
          }
        } else if (item.device_type === "laptop") {
          newSettings.laptop = {
            checkIn: item.check_in_radius_meters,
            checkOut: item.check_out_radius_meters,
          }
        } else if (item.device_type === "desktop") {
          newSettings.desktop = {
            checkIn: item.check_in_radius_meters,
            checkOut: item.check_out_radius_meters,
          }
        }
      }

      setSettings(newSettings)
      console.log("[v0] Device radius settings updated:", newSettings)
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("device_radius_settings")
          .select("device_type, check_in_radius_meters, check_out_radius_meters")
          .eq("is_active", true)

        if (error) {
          console.error("[v0] Error fetching device radius settings:", error)
          setSettings(DEFAULT_SETTINGS)
          return
        }

        if (data) {
          processSettings(data)
        }
      } catch (error) {
        console.error("[v0] Error loading device radius settings:", error)
        setSettings(DEFAULT_SETTINGS)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()

    // Set up real-time subscription for automatic updates
    const channel = supabase
      .channel("device_radius_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "device_radius_settings",
        },
        async (payload) => {
          console.log("[v0] Device radius settings changed in real-time:", payload)
          
          // Refetch all settings to ensure consistency
          const { data } = await supabase
            .from("device_radius_settings")
            .select("device_type, check_in_radius_meters, check_out_radius_meters")
            .eq("is_active", true)

          if (data) {
            processSettings(data)
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { settings, loading }
}
