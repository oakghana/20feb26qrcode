import { Suspense } from 'react'
import { ArrowLeft, MapPin, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PendingOffPremisesRequests } from '@/components/admin/pending-offpremises-requests'

export const metadata = {
  title: 'Off-Premises Check-In Approvals | QCC Attendance',
  description: 'Review and approve staff requests for off-premises check-ins',
}

function PageHeader() {
  return (
    <div className="mb-8">
      <Link href="/dashboard/attendance">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Attendance
        </Button>
      </Link>
      
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Off-Premises Check-In Approvals</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve staff requests for off-premises check-ins
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Pending Review</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Staff members requesting off-premises work locations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Approve/Reject</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Review location, reason, and device information
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Role-Based Access</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Filtered by your location and department
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Alert */}
      <Alert className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-300">Approval Workflow</AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
          Staff members who check in outside premises must provide a reason and receive supervisor/department head approval. Their attendance will only be recorded once approved.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function LoadingFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Off-Premises Check-In Requests</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading pending requests...</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OffPremisesApprovalsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <PageHeader />

        {/* Pending Requests Component with Suspense */}
        <div className="mt-8">
          <Suspense fallback={<LoadingFallback />}>
            <PendingOffPremisesRequests />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
