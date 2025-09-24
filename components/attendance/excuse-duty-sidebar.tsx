"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Home } from "lucide-react"
import Link from "next/link"

interface ExcuseDutySidebarProps {
  activeSection: "submit" | "history"
  onSectionChange: (section: "submit" | "history") => void
  stats?: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
}

export function ExcuseDutySidebar({ activeSection, onSectionChange, stats }: ExcuseDutySidebarProps) {
  const menuItems = [
    {
      id: "submit" as const,
      label: "Submit New Request",
      icon: FileText,
      description: "Upload excuse documentation",
    },
    {
      id: "history" as const,
      label: "My Submissions",
      icon: Clock,
      description: "View submission history",
    },
  ]

  const statusItems = stats
    ? [
        { label: "Total Submissions", value: stats.total, icon: FileText, color: "bg-blue-500" },
        { label: "Pending Review", value: stats.pending, icon: AlertCircle, color: "bg-yellow-500" },
        { label: "Approved", value: stats.approved, icon: CheckCircle, color: "bg-green-500" },
        { label: "Rejected", value: stats.rejected, icon: XCircle, color: "bg-red-500" },
      ]
    : []

  return (
    <div className="space-y-4">
      {/* Navigation Menu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Excuse Duty Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  activeSection === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm opacity-70">{item.description}</div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submission Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${item.color}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>• Submit requests as soon as possible</div>
          <div>• Attach clear, readable documents</div>
          <div>• Provide detailed reasons for absence</div>
          <div>• Check submission status regularly</div>
          <div>• Contact HR for urgent matters</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Link href="/dashboard">
            <button className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted border border-border">
              <Home className="h-5 w-5" />
              <div>
                <div className="font-medium">Back to Dashboard</div>
                <div className="text-sm opacity-70">Return to main menu</div>
              </div>
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
