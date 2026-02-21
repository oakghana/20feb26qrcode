'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OffPremisesApprovalPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new location
    router.replace('/dashboard/offpremises-approvals')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Redirecting to off-premises approvals...</p>
      </div>
    </div>
  )
}
