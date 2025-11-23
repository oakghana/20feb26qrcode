"use client"

import { useState, useEffect } from "react"
import { Archive, Download, Filter, Search, Calendar, User, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Warning {
  id: string
  issued_to_name: string
  issued_to_email: string
  issued_to_employee_id: string
  issued_by_name: string
  sender_label: string
  warning_type: string
  warning_message: string
  attendance_date: string
  created_at: string
  is_read: boolean
  department_name: string
}

export default function WarningsArchive() {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterSender, setFilterSender] = useState("all")
  const [dateRange, setDateRange] = useState("all")

  useEffect(() => {
    fetchWarnings()
  }, [])

  const fetchWarnings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/warnings-archive")
      if (!response.ok) throw new Error("Failed to fetch warnings")
      const data = await response.json()
      setWarnings(data.warnings || [])
    } catch (err) {
      console.error("Failed to load warnings:", err)
    } finally {
      setLoading(false)
    }
  }

  const exportWarnings = () => {
    const csv = [
      ["Date", "Employee ID", "Staff Name", "Department", "Warning Type", "Sender", "Message", "Status"],
      ...filteredWarnings.map((w) => [
        new Date(w.created_at).toLocaleDateString(),
        w.issued_to_employee_id,
        w.issued_to_name,
        w.department_name,
        w.warning_type.replace("_", " "),
        w.sender_label,
        w.warning_message,
        w.is_read ? "Read" : "Unread",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `warnings-archive-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const filteredWarnings = warnings.filter((warning) => {
    const matchesSearch =
      warning.issued_to_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.issued_to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.issued_to_employee_id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === "all" || warning.warning_type === filterType
    const matchesSender =
      filterSender === "all" ||
      (filterSender === "management" && warning.sender_label === "Management of QCC") ||
      (filterSender === "department" && warning.sender_label !== "Management of QCC")

    const matchesDate = (() => {
      if (dateRange === "all") return true
      const warningDate = new Date(warning.created_at)
      const today = new Date()
      const diffDays = Math.floor((today.getTime() - warningDate.getTime()) / (1000 * 60 * 60 * 24))

      if (dateRange === "today") return diffDays === 0
      if (dateRange === "week") return diffDays <= 7
      if (dateRange === "month") return diffDays <= 30
      return true
    })()

    return matchesSearch && matchesType && matchesSender && matchesDate
  })

  const stats = {
    total: warnings.length,
    management: warnings.filter((w) => w.sender_label === "Management of QCC").length,
    department: warnings.filter((w) => w.sender_label !== "Management of QCC").length,
    unread: warnings.filter((w) => !w.is_read).length,
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Archive className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Warnings Archive</CardTitle>
              <CardDescription>View and export all issued warnings for reporting</CardDescription>
            </div>
          </div>
          <Button onClick={exportWarnings} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
              <p className="text-sm text-blue-600">Total Warnings</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-700">{stats.management}</p>
              <p className="text-sm text-purple-600">From Management</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{stats.department}</p>
              <p className="text-sm text-green-600">From Dept Heads</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-700">{stats.unread}</p>
              <p className="text-sm text-orange-600">Unread</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Warning Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="no_checkin">No Check-In</SelectItem>
              <SelectItem value="no_checkout">No Check-Out</SelectItem>
              <SelectItem value="late_checkin">Late Check-In</SelectItem>
              <SelectItem value="early_checkout">Early Check-Out</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSender} onValueChange={setFilterSender}>
            <SelectTrigger className="w-[180px]">
              <User className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Senders</SelectItem>
              <SelectItem value="management">Management</SelectItem>
              <SelectItem value="department">Dept Heads</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Warning Type</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                  </TableCell>
                </TableRow>
              ) : filteredWarnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-semibold">No warnings found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWarnings.map((warning) => (
                  <TableRow key={warning.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(warning.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{warning.issued_to_name}</p>
                        <p className="text-xs text-muted-foreground">{warning.issued_to_employee_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{warning.department_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{warning.warning_type.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={warning.sender_label === "Management of QCC" ? "default" : "secondary"}>
                        {warning.sender_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={warning.warning_message}>
                      {warning.warning_message}
                    </TableCell>
                    <TableCell>
                      <Badge variant={warning.is_read ? "outline" : "destructive"}>
                        {warning.is_read ? "Read" : "Unread"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredWarnings.length} of {warnings.length} warnings
        </div>
      </CardContent>
    </Card>
  )
}
