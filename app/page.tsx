'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to attendance page
    // The attendance page will handle auth checks and redirect to login if needed
    router.push('/dashboard/attendance')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <h1 className="text-2xl font-bold text-slate-900">QCC Electronic Attendance</h1>
        <p className="text-slate-600">Loading your dashboard...</p>
      </div>
    </div>
  )
}
