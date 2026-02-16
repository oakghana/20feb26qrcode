'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, ArrowLeft, MapPin } from 'lucide-react'
import { PendingOffPremisesRequests } from '@/components/admin/pending-offpremises-requests'

export default function OffPremisesApprovalPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    let isMounted = true

    const loadUserProfile = async () => {
      try {
        const supabase = createClient()

        // Check authentication
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (!isMounted) return

        if (authError || !authUser) {
          router.push('/auth/login')
          return
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, role, department_id, first_name, last_name, geofence_locations')
          .eq('id', authUser.id)
          .single()

        if (!isMounted) return

        if (profileError) {
          setError('Failed to load user profile')
          return
        }

        // Check if user has permission to view this page
        if (!profile || !['admin', 'department_head', 'regional_manager'].includes(profile.role)) {
          setError('You do not have permission to view this page')
          return
        }

        setUserProfile(profile)
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load dashboard')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUserProfile()

    return () => {
      isMounted = false
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h1 className="text-3xl font-bold">Off-Premises Check-In Approvals</h1>
            </div>
            <p className="text-gray-600 ml-9">
              Review and approve staff requests for off-premises check-ins
            </p>
          </div>
        </div>

        {/* Pending Requests Component */}
        <PendingOffPremisesRequests managerProfile={userProfile} />
      </div>
    </div>
  )
}
              Off-Premises Check-In Approvals
            </h1>
            <p className="text-muted-foreground">
              Review and approve staff members requesting to check in from outside their registered QCC location
            </p>
          </div>
        </div>

        {/* Information Card */}
        <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-lg">How This Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-blue-900 dark:text-blue-100">
            <p>
              When staff members need to check in from outside their registered QCC location (after 3 PM), they can request approval through the "Check In Outside Premises" button.
            </p>
            <p>
              As a manager or department head, you will see their current location and can confirm whether you sent them on official duty outside their premises. Approved requests will automatically check them in to their assigned location with an "on official duty" flag.
            </p>
          </CardContent>
        </Card>

        {/* Pending Requests Component */}
        <PendingOffPremisesRequests />

        {/* Instructions Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Instructions for Managers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Before Approving:</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Verify the staff member was sent by you on official duty</li>
                <li>Check their current location matches where you sent them</li>
                <li>Confirm they cannot reach their registered QCC location to check in normally</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">What Happens When Approved:</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Staff member is automatically checked into their assigned QCC location</li>
                <li>Their actual location is recorded for audit purposes</li>
                <li>Attendance record is marked "On Official Duty Outside Premises"</li>
                <li>They receive a confirmation notification</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">What Happens When Rejected:</h4>
              <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                <li>Request is marked as rejected</li>
                <li>Staff member is notified and cannot check in from that location</li>
                <li>They can submit a new request if circumstances change</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
