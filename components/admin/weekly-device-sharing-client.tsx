"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ChevronLeft, Smartphone, Users, Calendar, MapPin } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SharedDevice {
  device_id: string
  ip_address: string
  unique_users_count: number
  user_names: string[]
  user_emails: string[]
  departments: string[]
  first_activity: string
  last_activity: string
  check_in_days: number
  risk_level: "low" | "medium" | "high" | "critical"
}

interface WeeklyDeviceSharingClientProps {
  userRole: string
  departmentId?: string
}

export default function WeeklyDeviceSharingClient({ userRole, departmentId }: WeeklyDeviceSharingClientProps) {
  const [sharedDevices, setSharedDevices] = useState<SharedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedDevices()
  }, [])

  const fetchSharedDevices = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/weekly-device-sharing")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch device sharing data")
      }

      setSharedDevices(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadge = (level: string) => {
    const colors = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    }

    return <Badge className={colors[level as keyof typeof colors] || colors.low}>{level.toUpperCase()}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading device sharing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Weekly Device Sharing Report</h1>
          <p className="text-muted-foreground">Devices used by multiple staff members in the past 7 days</p>
        </div>
        <Button onClick={fetchSharedDevices} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Summary Alert */}
      {sharedDevices.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Device Sharing Detected</AlertTitle>
          <AlertDescription>
            {sharedDevices.length} device{sharedDevices.length !== 1 ? "s have" : " has"} been used by multiple staff
            members this week. Review the details below and investigate suspicious activity.
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No Data State */}
      {!loading && !error && sharedDevices.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Smartphone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Shared Devices Detected</h3>
              <p className="text-muted-foreground">
                No devices have been used by multiple staff members in the past 7 days.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared Devices List */}
      <div className="grid gap-6">
        {sharedDevices.map((device, index) => (
          <Card
            key={index}
            className="border-l-4"
            style={{
              borderLeftColor:
                device.risk_level === "critical"
                  ? "#dc2626"
                  : device.risk_level === "high"
                    ? "#ea580c"
                    : device.risk_level === "medium"
                      ? "#ca8a04"
                      : "#3b82f6",
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Device: {device.device_id.slice(0, 16)}...
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    IP Address: {device.ip_address}
                  </CardDescription>
                </div>
                {getRiskBadge(device.risk_level)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{device.unique_users_count} Different Users</p>
                    <p className="text-xs text-muted-foreground">Used this device</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{device.check_in_days} Days</p>
                    <p className="text-xs text-muted-foreground">With check-ins</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Security Risk</p>
                    <p className="text-xs text-muted-foreground">{device.risk_level} level</p>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Staff Members Using This Device:</h4>
                <div className="space-y-2">
                  {device.user_names.map((name, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">{device.user_emails[idx]}</p>
                      </div>
                      <Badge variant="outline">{device.departments[idx] || "N/A"}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>First Activity: {new Date(device.first_activity).toLocaleString()}</span>
                  <span>Last Activity: {new Date(device.last_activity).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
