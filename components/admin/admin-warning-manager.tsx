"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Send, Users, Clock, CheckCircle, XCircle, Shield, AlertTriangle, Bell } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import Image from "next/image"

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_id: string
  department: string
}

interface AttendanceSummary {
  noCheckin: StaffMember[]
  noCheckout: StaffMember[]
  lateCheckin: StaffMember[]
  earlyCheckout: StaffMember[]
}

interface WeeklyAbsence {
  user_id: string
  first_name: string
  last_name: string
  email: string
  employee_id: string
  department_name: string
  days_missed: number
  issue: string
}

export default function AdminWarningManager() {
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    noCheckin: [],
    noCheckout: [],
    lateCheckin: [],
    earlyCheckout: [],
  })
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())
  const [warningMessage, setWarningMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState("no_checkin")
  const [weeklyAbsences, setWeeklyAbsences] = useState<WeeklyAbsence[]>([])
  const [showWeeklyBanner, setShowWeeklyBanner] = useState(false)

  useEffect(() => {
    fetchAttendanceSummary()
    fetchWeeklyAbsences()
  }, [])

  const fetchAttendanceSummary = async () => {
    setLoading(true)
    setError("")
    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/admin/all-attendance-summary?date=${today}`)

      if (!response.ok) throw new Error("Failed to fetch attendance summary")

      const data = await response.json()
      setAttendanceSummary(data)
    } catch (err) {
      setError("Failed to load attendance data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyAbsences = async () => {
    try {
      const response = await fetch("/api/admin/weekly-absences")
      const data = await response.json()

      if (data.success && data.data && data.data.length > 0) {
        setWeeklyAbsences(data.data)
        setShowWeeklyBanner(true)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch weekly absences:", error)
    }
  }

  const toggleStaffSelection = (staffId: string) => {
    const newSelection = new Set(selectedStaff)
    if (newSelection.has(staffId)) {
      newSelection.delete(staffId)
    } else {
      newSelection.add(staffId)
    }
    setSelectedStaff(newSelection)
  }

  const selectAll = (staffList: StaffMember[]) => {
    const newSelection = new Set(selectedStaff)
    staffList.forEach((staff) => newSelection.add(staff.id))
    setSelectedStaff(newSelection)
  }

  const deselectAll = () => {
    setSelectedStaff(new Set())
  }

  const sendWarnings = async () => {
    if (selectedStaff.size === 0) {
      setError("Please select at least one staff member")
      return
    }

    if (!warningMessage.trim()) {
      setError("Please enter a warning message")
      return
    }

    setSending(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/admin/send-warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffIds: Array.from(selectedStaff),
          message: warningMessage,
          warningType: activeTab,
          isAdminWarning: true,
          senderLabel: "Management of QCC",
        }),
      })

      if (!response.ok) throw new Error("Failed to send warnings")

      const data = await response.json()
      setSuccess(`Successfully sent ${data.count} warning(s) from Management of QCC`)
      setSelectedStaff(new Set())
      setWarningMessage("")

      // Refresh data
      await fetchAttendanceSummary()
    } catch (err) {
      setError("Failed to send warnings")
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const getCurrentStaffList = () => {
    switch (activeTab) {
      case "no_checkin":
        return attendanceSummary.noCheckin
      case "no_checkout":
        return attendanceSummary.noCheckout
      case "late_checkin":
        return attendanceSummary.lateCheckin
      case "early_checkout":
        return attendanceSummary.earlyCheckout
      default:
        return []
    }
  }

  const currentStaffList = getCurrentStaffList()
  const selectedCount = selectedStaff.size

  return (
    <>
      {showWeeklyBanner && weeklyAbsences.length > 0 && (
        <Card className="border-2 border-amber-500 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/40 shadow-2xl mb-6">
          <CardHeader className="pb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/10 rounded-full blur-2xl" />
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500 rounded-2xl blur-md animate-pulse" />
                  <div className="relative p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                    <Image src="/qcc-logo.jpg" alt="QCC Logo" width={48} height={48} className="rounded-lg" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                      Weekly Attendance Alert
                    </CardTitle>
                  </div>
                  <CardDescription className="text-base text-amber-800 dark:text-amber-300 font-semibold">
                    {weeklyAbsences.length} staff member{weeklyAbsences.length > 1 ? "s" : ""} with significant absences
                    this week
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWeeklyBanner(false)}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:hover:bg-amber-900/20"
              >
                Dismiss
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {weeklyAbsences.map((absence) => (
                <div
                  key={absence.user_id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border-2 border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedStaff.has(absence.user_id)}
                      onCheckedChange={() => toggleStaffSelection(absence.user_id)}
                      className="border-amber-500"
                    />
                    <div>
                      <p className="font-bold text-foreground">
                        {absence.first_name} {absence.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{absence.department_name}</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {absence.issue}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-sm px-3 py-1 font-bold">
                    {absence.days_missed} day{absence.days_missed > 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
            {weeklyAbsences.length > 5 && (
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mt-4 text-center">
                Scroll to view all {weeklyAbsences.length} staff members
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-chart-1/5 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Management Warning System</CardTitle>
              <CardDescription className="text-base">
                Issue warnings to staff members on behalf of QCC Management
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-auto p-1">
              <TabsTrigger value="no_checkin" className="flex flex-col py-3">
                <XCircle className="h-4 w-4 mb-1" />
                <span className="text-xs">No Check-In</span>
                <Badge variant="destructive" className="mt-1">
                  {attendanceSummary.noCheckin.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="no_checkout" className="flex flex-col py-3">
                <AlertTriangle className="h-4 w-4 mb-1" />
                <span className="text-xs">No Check-Out</span>
                <Badge variant="destructive" className="mt-1">
                  {attendanceSummary.noCheckout.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="late_checkin" className="flex flex-col py-3">
                <Clock className="h-4 w-4 mb-1" />
                <span className="text-xs">Late Check-In</span>
                <Badge variant="secondary" className="mt-1">
                  {attendanceSummary.lateCheckin.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="early_checkout" className="flex flex-col py-3">
                <Users className="h-4 w-4 mb-1" />
                <span className="text-xs">Early Check-Out</span>
                <Badge variant="secondary" className="mt-1">
                  {attendanceSummary.earlyCheckout.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6 space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading attendance data...</p>
                </div>
              ) : currentStaffList.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold">All staff compliant!</p>
                  <p className="text-sm text-muted-foreground">No issues to report for this category</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {selectedCount} of {currentStaffList.length} staff selected
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => selectAll(currentStaffList)}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAll}>
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {currentStaffList.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={selectedStaff.has(staff.id)}
                          onCheckedChange={() => toggleStaffSelection(staff.id)}
                        />
                        <div className="flex-1">
                          <p className="font-semibold">
                            {staff.first_name} {staff.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{staff.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{staff.employee_id}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{staff.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <Label htmlFor="warning-message" className="text-base font-semibold">
              Warning Message
            </Label>
            <Textarea
              id="warning-message"
              placeholder="Enter warning message to be sent from Management of QCC..."
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This warning will be archived and attributed to "Management of QCC" in all records and reports.
            </p>
          </div>

          <Button
            onClick={sendWarnings}
            disabled={sending || selectedCount === 0 || !warningMessage.trim()}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {sending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Sending Warnings...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send {selectedCount > 0 ? `${selectedCount} ` : ""}Warning{selectedCount !== 1 ? "s" : ""} from
                Management
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
