"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface Location {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meters: number
  district_id?: string
  is_active: boolean
}

export function useRealTimeLocations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAssignedLocationOnly, setIsAssignedLocationOnly] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())

  const supabase = createClient()

  const fetchLocations = useCallback(async () => {
    try {
      console.log("[v0] Real-time locations - Fetching locations")
      const response = await fetch("/api/attendance/user-location")
      const result = await response.json()

      if (response.ok && result.success) {
        console.log("[v0] Real-time locations - Fetched", result.data?.length, "locations")
        setLocations(result.data || [])
        setUserRole(result.user_role)
        setIsAssignedLocationOnly(result.assigned_location_only || false)
        setError(null)
        setLastUpdate(Date.now())

        if (result.message) {
          console.log("[v0] Real-time locations - Message:", result.message)
        }
      } else {
        console.error("[v0] Real-time locations - Fetch error:", result.error)
        if (response.status === 403) {
          setError("Location access restricted to administrators")
          setLocations([])
        } else if (response.status === 404) {
          setError("User profile not found. Please contact your administrator.")
          setLocations([])
        } else {
          setError(result.error || result.message || "Failed to fetch locations")
        }
      }
    } catch (err) {
      console.error("[v0] Real-time locations - Exception:", err)
      setError("Failed to fetch locations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchLocations()

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "LOCATION_UPDATE") {
        console.log("[v0] Real-time locations - Service worker update received")
        setLocations(event.data.data || [])
        setUserRole(event.data.user_role)
        setIsAssignedLocationOnly(event.data.assigned_location_only || false)
        setLastUpdate(event.data.timestamp || Date.now())
      }

      if (event.data?.type === "PROXIMITY_UPDATE") {
        console.log("[v0] Real-time locations - Proximity settings updated")
        // Trigger a location refetch to get updated proximity settings
        fetchLocations()
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage)
    }

    const channel = supabase
      .channel("locations_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "geofence_locations",
        },
        (payload) => {
          console.log(
            "[v0] Real-time locations - Change detected:",
            payload.eventType,
            payload.new?.name || payload.old?.name,
          )

          // Always refetch locations when changes occur
          fetchLocations()

          // Trigger background sync for all clients
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready
              .then((registration) => {
                return registration.sync.register("location-sync")
              })
              .catch((error) => {
                console.error("[v0] Failed to register location sync:", error)
              })
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          console.log("[v0] Real-time locations - Settings change detected:", payload.eventType)

          // Trigger proximity settings sync for instant admin updates
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready
              .then((registration) => {
                return registration.sync.register("proximity-sync")
              })
              .catch((error) => {
                console.error("[v0] Failed to register proximity sync:", error)
              })
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Real-time locations - Subscription status:", status)
        setIsConnected(status === "SUBSCRIBED")
      })

    return () => {
      console.log("[v0] Real-time locations - Cleaning up subscription")
      supabase.removeChannel(channel)

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage)
      }
    }
  }, [fetchLocations, supabase])

  return {
    locations,
    loading,
    error,
    isConnected,
    userRole,
    isAssignedLocationOnly,
    lastUpdate,
    refetch: fetchLocations,
  }
}
