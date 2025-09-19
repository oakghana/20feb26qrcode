"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCheck, UserX, Search, Filter, Clock, CheckCircle, XCircle } from "lucide-react"

interface PendingUser {
  id: string
  email: string
  first_name: string
  last_name: string
  employee_id: string
  position: string
  region: string
  department_name: string
  created_at: string
  approval_status: "pending" | "approved" | "rejected"
}

export function UserApprovalsClient() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredUsers = useMemo(() => {
    let filtered = pendingUsers

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.first_name.toLowerCase().includes(searchLower) ||
          user.last_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.employee_id.toLowerCase().includes(searchLower),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.approval_status === statusFilter)
    }

    return filtered
  }, [pendingUsers, searchTerm, statusFilter])

  const fetchPendingUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("user_profiles")
        .select(`
          id,
          email,
          first_name,
          last_name,
          employee_id,
          position,
          created_at,
          is_active,
          department_id,
          departments:department_id(name)
        `)
        .eq("is_active", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedUsers =
        data?.map((user) => ({
          ...user,
          department_name: user.departments?.name || "No Department",
          region: "Ghana",
          approval_status: "pending" as const,
        })) || []

      setPendingUsers(formattedUsers)
      setError(null)
    } catch (error) {
      setError(`Failed to load pending users: ${error.message || "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleApproval = useCallback(
    async (userId: string, approve: boolean) => {
      try {
        const supabase = createClient()

        const { error } = await supabase
          .from("user_profiles")
          .update({
            is_active: approve,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)

        if (error) throw error

        setPendingUsers((prev) => prev.filter((user) => user.id !== userId))

        supabase
          .from("audit_logs")
          .insert({
            user_id: userId,
            action: approve ? "user_approved" : "user_rejected",
            table_name: "user_profiles",
            new_values: { is_active: approve },
            ip_address: "admin_action",
            user_agent: "admin_dashboard",
          })
          .then(({ error: auditError }) => {
            if (auditError) console.warn("Failed to log audit entry:", auditError)
          })

        setError(null)
      } catch (error) {
        setError(`Failed to ${approve ? "approve" : "reject"} user: ${error.message || "Unknown error"}`)
        fetchPendingUsers()
      }
    },
    [fetchPendingUsers],
  )

  useEffect(() => {
    fetchPendingUsers()
  }, [fetchPendingUsers])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 animate-spin text-primary" />
          <span>Loading pending approvals...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">User Approvals</h1>
          <p className="text-muted-foreground">Manage pending user registrations and account approvals</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {filteredUsers.length} Pending
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <UserCheck className="h-5 w-5" />
            Pending User Registrations
          </CardTitle>
          <CardDescription>Review and approve new user accounts to grant system access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-0 bg-white shadow-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 border-0 bg-white shadow-sm">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-primary/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary">No pending approvals</h3>
              <p className="text-muted-foreground">All user registrations have been processed</p>
            </div>
          ) : (
            <div className="rounded-lg border-0 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">User Details</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Registration Date</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-primary">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {user.employee_id} • {user.position}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {user.department_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {user.region}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproval(user.id, true)}
                            className="bg-primary hover:bg-primary/90 shadow-sm"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApproval(user.id, false)}
                            className="shadow-sm"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
