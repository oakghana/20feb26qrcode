"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface RealTimeMetrics {
  activeUsers: number
  todayCheckins: number
  currentAttendanceRate: number
  lastUpdated: Date
}

export function useRealTimeAnalytics() {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    activeUsers: 0,
    todayCheckins: 0,
    currentAttendanceRate: 0,
    lastUpdated: new Date(),
  })
  const [isConnected, setIsConnected] = useState(false)

  const supabase = createClient()

  const fetchCurrentMetrics = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0]

      // Get today's check-ins
      const { count: todayCheckins } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .gte("check_in_time", `${today}T00:00:00`)
        .lt("check_in_time", `${today}T23:59:59`)

      // Get total active users
      const { count: activeUsers } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)

      // Calculate current attendance rate
      const currentAttendanceRate =
        activeUsers && activeUsers > 0 ? Math.round(((todayCheckins || 0) / activeUsers) * 100) : 0

      setMetrics({
        activeUsers: activeUsers || 0,
        todayCheckins: todayCheckins || 0,
        currentAttendanceRate,
        lastUpdated: new Date(),
      })
    } catch (error) {
      console.error("Failed to fetch real-time metrics:", error)
    }
  }, [supabase])

  useEffect(() => {
    // Initial fetch
    fetchCurrentMetrics()

    // Set up real-time subscription
    const channel = supabase
      .channel("attendance_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
        },
        () => {
          fetchCurrentMetrics()
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED")
      })

    // Refresh every 30 seconds
    const interval = setInterval(fetchCurrentMetrics, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchCurrentMetrics, supabase])

  return {
    metrics,
    isConnected,
    refresh: fetchCurrentMetrics,
  }
}
