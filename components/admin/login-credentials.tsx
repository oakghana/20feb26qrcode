"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Eye, EyeOff } from "lucide-react"
import { useNotification } from "@/components/ui/notification-system"

interface TestUser {
  email: string
  password: string
  role: string
  full_name: string
  staff_number: string
  position: string
  login_note: string
}

export default function LoginCredentials() {
  const [testUsers, setTestUsers] = useState<TestUser[]>([])
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(true)
  const { addNotification } = useNotification()

  useEffect(() => {
    const fetchTestUsers = async () => {
      try {
        const response = await fetch("/api/admin/test-users")
        if (response.ok) {
          const data = await response.json()
          setTestUsers(data.users || [])
        } else {
          addNotification("Failed to load test users", "error")
        }
      } catch (error) {
        console.error("Error fetching test users:", error)
        addNotification("Error loading test users", "error")
      } finally {
        setLoading(false)
      }
    }

    fetchTestUsers()
  }, [addNotification])

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    addNotification(`${type} copied to clipboard`, "success")
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "department_head":
        return "bg-green-100 text-green-800 border-green-200"
      case "staff":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Login Credentials...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            QCC Attendance App - Login Credentials
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2"
            >
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPasswords ? "Hide" : "Show"} Passwords
            </Button>
          </CardTitle>
          <CardDescription>Test user accounts for the QCC Electronic Attendance Application</CardDescription>
        </CardHeader>
        <CardContent>
          {testUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No test users found in the database.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Users can register through the staff request page or be added by administrators.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {testUsers.map((user, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{user.full_name}</CardTitle>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>{user.position}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email:</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-2 py-1 bg-muted rounded text-sm">{user.email}</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(user.email, "Email")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Password:</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-2 py-1 bg-muted rounded text-sm">
                          {showPasswords ? user.password : "••••••••"}
                        </code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(user.password, "Password")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {user.staff_number && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Staff Number:</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 px-2 py-1 bg-muted rounded text-sm">{user.staff_number}</code>
                        </div>
                      </div>
                    )}

                    {user.login_note && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">{user.login_note}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Password Login</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Go to the login page</li>
                <li>2. Enter your email address</li>
                <li>3. Enter your password</li>
                <li>4. Click "Sign In"</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">OTP Login</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Go to the login page</li>
                <li>2. Enter your email address</li>
                <li>3. Click "Send OTP"</li>
                <li>4. Check your email for the OTP code</li>
                <li>5. Enter the OTP and click "Verify"</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
