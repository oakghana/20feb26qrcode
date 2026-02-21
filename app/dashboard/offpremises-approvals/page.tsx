import { Suspense } from 'react'
import { ArrowLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PendingOffPremisesRequests } from '@/components/admin/pending-offpremises-requests'

export const metadata = {
  title: 'Off-Premises Check-In Approvals | QCC Attendance',
  description: 'Review and approve staff requests for off-premises check-ins',
}

export default function OffPremisesApprovalsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/attendance">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Attendance
            </Button>
          </Link>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-8 w-8 text-blue-600" />
              <h1 className="text-4xl font-bold">Off-Premises Check-In Approvals</h1>
            </div>
            <p className="text-muted-foreground ml-11 text-lg">
              Review and approve staff requests for off-premises check-ins. Filter by location and department based on your role.
            </p>
          </div>
        </div>

        {/* Pending Requests Component with Suspense */}
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading pending requests...</p>
            </div>
          </div>
        }>
          <PendingOffPremisesRequests />
        </Suspense>
      </div>
    </div>
  )
}
