"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Copy, Eye, EyeOff } from "lucide-react"

export default function UserLookupPage() {
  const [email, setEmail] = useState("ohemengappiah@qccgh.com")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleLookup = async () => {
    if (!email) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/user-credentials?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error looking up user:", error)
      setResult({ error: "Failed to lookup user" })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              User Credential Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleLookup} disabled={loading || !email}>
                {loading ? "Searching..." : "Lookup"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>{result.found ? "User Found" : "Search Result"}</CardTitle>
            </CardHeader>
            <CardContent>
              {result.found ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Source: {result.source}</Badge>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Email:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{result.credentials.email}</span>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(result.credentials.email)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {result.credentials.password && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="font-medium">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{showPassword ? result.credentials.password : "••••••••"}</span>
                          <Button size="sm" variant="ghost" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(result.credentials.password)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Full Name:</span>
                      <span>{result.credentials.full_name}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Role:</span>
                      <Badge variant={result.credentials.role === "admin" ? "destructive" : "default"}>
                        {result.credentials.role}
                      </Badge>
                    </div>

                    {result.credentials.staff_number && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">Staff Number:</span>
                        <span className="font-mono">{result.credentials.staff_number}</span>
                      </div>
                    )}

                    {result.credentials.position && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">Position:</span>
                        <span>{result.credentials.position}</span>
                      </div>
                    )}

                    {result.credentials.login_note && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium">Login Note:</span>
                        <p className="mt-1 text-sm text-gray-600">{result.credentials.login_note}</p>
                      </div>
                    )}

                    {result.credentials.note && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <span className="font-medium">Note:</span>
                        <p className="mt-1 text-sm text-gray-600">{result.credentials.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">{result.message || result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
