"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Calendar, Eye, Loader2, AlertTriangle } from "lucide-react"

interface ExcuseDocument {
  id: string
  document_name: string
  document_type: string
  file_url: string
  excuse_reason: string
  excuse_date: string
  status: "pending" | "approved" | "rejected"
  reviewed_by_profile?: {
    first_name: string
    last_name: string
  }
  reviewed_at?: string
  review_notes?: string
  created_at: string
}

export function ExcuseDutyHistory() {
  const [excuseDocuments, setExcuseDocuments] = useState<ExcuseDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchExcuseDocuments()
  }, [])

  const fetchExcuseDocuments = async () => {
    try {
      const response = await fetch("/api/attendance/excuse-duty")

      if (!response.ok) {
        throw new Error("Failed to fetch excuse documents")
      }

      const data = await response.json()
      setExcuseDocuments(data.excuseDocuments || [])
    } catch (error) {
      console.error("Failed to fetch excuse documents:", error)
      setError("Failed to load excuse documents")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "pending":
      default:
        return <Badge variant="secondary">Pending Review</Badge>
    }
  }

  const getDocumentTypeBadge = (type: string) => {
    const colors = {
      medical: "bg-blue-100 text-blue-800 border-blue-200",
      emergency: "bg-red-100 text-red-800 border-red-200",
      personal: "bg-purple-100 text-purple-800 border-purple-200",
      official: "bg-green-100 text-green-800 border-green-200",
    }

    return (
      <Badge className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const viewDocument = (fileUrl: string, fileName: string) => {
    // Create a new window to view the document
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${fileName}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              img { max-width: 100%; height: auto; }
              iframe { width: 100%; height: 90vh; border: none; }
            </style>
          </head>
          <body>
            <h3>${fileName}</h3>
            ${
              fileUrl.startsWith("data:image/")
                ? `<img src="${fileUrl}" alt="${fileName}" />`
                : `<iframe src="${fileUrl}"></iframe>`
            }
          </body>
        </html>
      `)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading excuse documents...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Excuse Duty Notes
        </CardTitle>
        <CardDescription>View your submitted excuse duty notes and their review status</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Approval Workflow:</p>
              <p className="mt-1">
                Your excuse duty submissions are first reviewed by your Head of Department, then processed by HR for
                final approval.
              </p>
            </div>
          </div>
        </div>

        {excuseDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No excuse duty notes submitted yet</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excuseDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(doc.excuse_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{getDocumentTypeBadge(doc.document_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[150px]" title={doc.document_name}>
                          {doc.document_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={doc.excuse_reason}>
                        {doc.excuse_reason}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      {doc.reviewed_by_profile ? (
                        <div className="text-sm">
                          <div>
                            {doc.reviewed_by_profile.first_name} {doc.reviewed_by_profile.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {doc.reviewed_at ? new Date(doc.reviewed_at).toLocaleDateString() : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not reviewed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDocument(doc.file_url, doc.document_name)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
