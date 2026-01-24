"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Loader2, AlertCircle, CheckCircle2, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  leave_status: "active" | "on_leave" | "sick_leave"
  leave_start_date: string | null
  leave_end_date: string | null
  leave_reason: string | null
  department: string
  role: string
}

export function StaffLeaveManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [leaveStatus, setLeaveStatus] = useState<"active" | "on_leave" | "sick_leave">("active")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")

  const supabase = createClient()

  // Check user permissions and fetch staff
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        })
        return
      }

      // Get user role
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "god")) {
        toast({
          title: "Access Denied",
          description: "Only admins and god users can manage staff leave status",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      setUserRole(userProfile.role)

      // Fetch all staff members
      const { data: staffData, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, leave_status, leave_start_date, leave_end_date, leave_reason, departments(name), role")
        .order("first_name", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching staff:", error)
        toast({
          title: "Error",
          description: "Failed to load staff members",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const formattedStaff = (staffData || []).map((s: any) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        leave_status: s.leave_status || "active",
        leave_start_date: s.leave_start_date,
        leave_end_date: s.leave_end_date,
        leave_reason: s.leave_reason,
        department: s.departments?.name || "Unknown",
        role: s.role,
      }))

      setStaff(formattedStaff)
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast({
        title: "Error",
        description: "An error occurred while loading data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (member: StaffMember) => {
    setSelectedStaff(member)
    setLeaveStatus(member.leave_status)
    setStartDate(member.leave_start_date ? format(new Date(member.leave_start_date), "yyyy-MM-dd") : "")
    setEndDate(member.leave_end_date ? format(new Date(member.leave_end_date), "yyyy-MM-dd") : "")
    setReason(member.leave_reason || "")
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedStaff) return

    if (leaveStatus !== "active" && (!startDate || !endDate)) {
      toast({
        title: "Missing Information",
        description: "Please provide start and end dates for leave",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/attendance/leave-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_status: leaveStatus,
          leave_start_date: startDate || null,
          leave_end_date: endDate || null,
          leave_reason: reason || null,
          target_user_id: selectedStaff.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update leave status")
      }

      toast({
        title: "Success",
        description: `${selectedStaff.first_name} ${selectedStaff.last_name}'s leave status has been updated`,
      })

      setIsDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave status",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredStaff = staff.filter(
    (s) =>
      s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const onLeaveCount = staff.filter((s) => s.leave_status !== "active").length
  const atPostCount = staff.filter((s) => s.leave_status === "active").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading staff information...</p>
      </div>
    )
  }

  if (!userRole || (userRole !== "admin" && userRole !== "god")) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You do not have permission to access this feature. Only admins and god users can manage staff leave status.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-3xl font-heading font-bold text-foreground tracking-tight">Staff Leave Management</h2>
            <p className="text-muted-foreground font-medium mt-1">Manage staff leave status and attendance availability</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              At Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{atPostCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Staff members working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
              On Leave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{onLeaveCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Staff members on leave or sick leave</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Staff</Label>
        <Input
          id="search"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        {filteredStaff.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No staff members found</p>
            </CardContent>
          </Card>
        ) : (
          filteredStaff.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {member.first_name} {member.last_name}
                    </CardTitle>
                    <CardDescription>{member.email}</CardDescription>
                  </div>
                  <Badge
                    variant={member.leave_status === "active" ? "default" : "secondary"}
                    className={
                      member.leave_status === "active"
                        ? "bg-green-600"
                        : member.leave_status === "on_leave"
                          ? "bg-amber-600"
                          : "bg-red-600"
                    }
                  >
                    {member.leave_status === "active"
                      ? "At Post"
                      : member.leave_status === "on_leave"
                        ? "On Leave"
                        : "Sick Leave"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Department</p>
                    <p className="font-medium">{member.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <p className="font-medium capitalize">{member.role}</p>
                  </div>
                </div>

                {member.leave_status !== "active" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                        <p className="font-medium">
                          {member.leave_start_date ? format(new Date(member.leave_start_date), "MMM dd, yyyy") : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">End Date</p>
                        <p className="font-medium">{member.leave_end_date ? format(new Date(member.leave_end_date), "MMM dd, yyyy") : "-"}</p>
                      </div>
                    </div>

                    {member.leave_reason && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Reason</p>
                        <p className="text-sm">{member.leave_reason}</p>
                      </div>
                    )}
                  </>
                )}

                <Dialog open={isDialogOpen && selectedStaff?.id === member.id} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(member)}
                      className="w-full"
                    >
                      Update Leave Status
                    </Button>
                  </DialogTrigger>
                  {selectedStaff?.id === member.id && (
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Update Leave Status</DialogTitle>
                        <DialogDescription>
                          Update {member.first_name} {member.last_name}'s leave status
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select value={leaveStatus} onValueChange={(value: any) => setLeaveStatus(value)}>
                            <SelectTrigger id="status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">At Post (Active)</SelectItem>
                              <SelectItem value="on_leave">On Leave</SelectItem>
                              <SelectItem value="sick_leave">Sick Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {leaveStatus !== "active" && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                  id="startDate"
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                  id="endDate"
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="reason">Reason (Optional)</Label>
                              <Textarea
                                id="reason"
                                placeholder="Reason for leave..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Update Status
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  )}
                </Dialog>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
