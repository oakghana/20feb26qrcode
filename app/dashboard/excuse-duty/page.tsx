"use client"

import { useState, useEffect } from "react"
import { ExcuseDutyForm } from "@/components/attendance/excuse-duty-form"
import { ExcuseDutyHistory } from "@/components/attendance/excuse-duty-history"
import { ExcuseDutySidebar } from "@/components/attendance/excuse-duty-sidebar"

export default function ExcuseDutyPage() {
  const [activeSection, setActiveSection] = useState<"submit" | "history">("submit")
  const [stats, setStats] = useState<{
    total: number
    pending: number
    approved: number
    rejected: number
  } | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/attendance/excuse-duty")
        if (response.ok) {
          const data = await response.json()
          const excuseDocs = data.excuseDocuments || []

          setStats({
            total: excuseDocs.length,
            pending: excuseDocs.filter((doc: any) => doc.status === "pending").length,
            approved: excuseDocs.filter((doc: any) => doc.status === "approved").length,
            rejected: excuseDocs.filter((doc: any) => doc.status === "rejected").length,
          })
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Excuse Duty Notes</h1>
        <p className="text-muted-foreground mt-2">Submit documentation for non-attendance and track review status</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <ExcuseDutySidebar activeSection={activeSection} onSectionChange={setActiveSection} stats={stats} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeSection === "submit" ? (
            <ExcuseDutyForm
              onSubmitSuccess={() => {
                // Refresh stats after successful submission
                setActiveSection("history")
                window.location.reload()
              }}
            />
          ) : (
            <ExcuseDutyHistory />
          )}
        </div>
      </div>
    </div>
  )
}
