"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Violation {
  id: string
  device_id: string
  ip_address: string
  attempted_user: {
    first_name: string
    last_name: string
    email: string
    employee_id: string
  }
  bound_user: {
    first_name: string
    last_name: string
    email: string
    employee_id: string
  }
  violation_type: string
  created_at: string
  department_notified: boolean
}

export default function DeviceViolationsClient({
  userRole,
  departmentId,
}: {
  userRole: string
  departmentId?: string
}) {
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchViolations()
  }, [])

  const fetchViolations = async () => {
    try {
      const supabase = createClient()

      let query = supabase
        .from("device_security_violations")
        .select(
          `
          *,
          attempted_user:user_profiles!device_security_violations_attempted_user_id_fkey(first_name, last_name, email, employee_id, department_id),
          bound_user:user_profiles!device_security_violations_bound_user_id_fkey(first_name, last_name, email, employee_id)
        `,
        )
        .order("created_at", { ascending: false })

      // Filter by department for department heads
      if (userRole === "department_head" && departmentId) {
        query = query.eq("attempted_user.department_id", departmentId)
      }

      const { data, error } = await query

      if (error) throw error
      setViolations(data || [])
    } catch (error) {
      console.error("Error fetching violations:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading device security violations...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold">Device Security Violations</h1>
          <p className="text-muted-foreground">Monitor and investigate device sharing attempts</p>
        </div>
      </div>

      {violations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No device violations detected</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {violations.map((violation) => (
            <Card key={violation.id} className="border-destructive/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Device Sharing Detected
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(violation.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant={violation.violation_type === "checkin_attempt" ? "destructive" : "secondary"}>
                    {violation.violation_type === "checkin_attempt" ? "Check-in Blocked" : "Login Attempt"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Attempted User</p>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">
                        {violation.attempted_user.first_name} {violation.attempted_user.last_name}
                      </p>
                      <p className="text-muted-foreground">{violation.attempted_user.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {violation.attempted_user.employee_id}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Device Registered To</p>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">
                        {violation.bound_user.first_name} {violation.bound_user.last_name}
                      </p>
                      <p className="text-muted-foreground">{violation.bound_user.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {violation.bound_user.employee_id}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Device ID:</span>
                    <span className="font-mono text-xs">{violation.device_id}</span>
                  </div>
                  {violation.ip_address && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IP Address:</span>
                      <span className="font-mono text-xs">{violation.ip_address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
