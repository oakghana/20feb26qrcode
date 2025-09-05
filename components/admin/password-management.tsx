"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Key, Shield, Search } from "lucide-react"

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  employee_id: string
}

interface PasswordManagementProps {
  userId?: string
  userEmail?: string
  isAdmin?: boolean
}

export function PasswordManagement({ userId, userEmail, isAdmin = false }: PasswordManagementProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [adminNewPassword, setAdminNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>("")
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch("/api/admin/users")
      const result = await response.json()

      if (result.success) {
        setUsers(result.users || [])
      } else {
        console.error("Failed to fetch users:", result.error)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleUserSelect = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      setSelectedUserId(userId)
      setSelectedUserEmail(user.email)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleUserPasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess("Password changed successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setIsChangePasswordOpen(false)
      } else {
        setError(result.error || "Failed to change password")
      }
    } catch (error) {
      setError("Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  const handleAdminPasswordReset = async () => {
    const targetUserId = selectedUserId || userId

    if (!targetUserId || !adminNewPassword) {
      setError("Please select a user and enter a new password")
      return
    }

    if (adminNewPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          newPassword: adminNewPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`Password reset successfully for ${selectedUserEmail || userEmail}`)
        setAdminNewPassword("")
        setSelectedUserId("")
        setSelectedUserEmail("")
        setIsChangePasswordOpen(false)
      } else {
        setError(result.error || "Failed to reset password")
      }
    } catch (error) {
      setError("Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Password Management
        </CardTitle>
        <CardDescription>
          {isAdmin ? "Reset user passwords as administrator" : "Change your account password"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {isAdmin && (
          <div className="space-y-4 mb-4">
            <div>
              <Label htmlFor="userSearch">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="userSearch"
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="userSelect">Select User</Label>
              <Select value={selectedUserId} onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to reset password" />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <SelectItem value="loading" disabled>
                      Loading users...
                    </SelectItem>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email}) - {user.employee_id}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-users" disabled>
                      {searchTerm ? "No users found matching search" : "No users available"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedUserEmail && (
              <Alert>
                <AlertDescription>
                  Selected user: <strong>{selectedUserEmail}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={isAdmin && !selectedUserId && !userId}>
              {isAdmin ? <Shield className="mr-2 h-4 w-4" /> : <Key className="mr-2 h-4 w-4" />}
              {isAdmin ? "Reset Selected User Password" : "Change Password"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isAdmin ? "Reset User Password" : "Change Password"}</DialogTitle>
              <DialogDescription>
                {isAdmin
                  ? `Reset password for ${selectedUserEmail || userEmail || "selected user"}`
                  : "Enter your current password and choose a new one"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isAdmin ? (
                <div>
                  <Label htmlFor="adminNewPassword">New Password</Label>
                  <Input
                    id="adminNewPassword"
                    type="password"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={isAdmin ? handleAdminPasswordReset : handleUserPasswordChange} disabled={loading}>
                {loading ? "Processing..." : isAdmin ? "Reset Password" : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
