import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle FormData for file uploads
    const formData = await request.formData()
    const start_date = formData.get("start_date") as string
    const end_date = formData.get("end_date") as string
    const reason = formData.get("reason") as string
    const leave_type = formData.get("leave_type") as string
    const document = formData.get("document") as File | null

    if (!start_date || !end_date || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let document_url = null

    // Handle file upload if provided
    if (document) {
      const fileExt = (document as any).name?.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${fileExt || 'bin'}`

      // Attempt upload with the current server client
      let uploadResult = await supabase.storage.from('leave-documents').upload(fileName, document)

      // If upload failed because the bucket is missing (404) and we have a service role key,
      // try to create the bucket and retry once.
      if (uploadResult.error) {
        console.error('Initial file upload error:', uploadResult.error)

        const isNotFound = (uploadResult.error as any)?.status === 404 || (uploadResult.error as any)?.statusCode === '404'

        if (isNotFound && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            // Create an admin client to manage buckets
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { createClient: createAdminClient } = require('@supabase/supabase-js')
            const admin = createAdminClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_ROLE_KEY
            )

            // Ensure bucket exists (public: false)
            const { error: createBucketError } = await admin.storage.createBucket('leave-documents', { public: false })
            if (createBucketError && (createBucketError as any).status !== 409) {
              console.error('Failed to create storage bucket leave-documents:', createBucketError)
            } else {
              // Retry upload once
              uploadResult = await supabase.storage.from('leave-documents').upload(fileName, document)
            }
          } catch (e) {
            console.error('Error while attempting to create bucket with service role key:', e)
          }
        }
      }

      if (uploadResult.error) {
        // Surface more details to make diagnosis easier
        console.error('Final file upload error:', uploadResult.error)
        const msg = (uploadResult.error as any)?.message || 'Failed to upload document'
        const status = (uploadResult.error as any)?.status || (uploadResult.error as any)?.statusCode || 500
        return NextResponse.json({ error: msg, details: uploadResult.error }, { status: Number(status) || 500 })
      }

      document_url = uploadResult.data?.path || null
    }

    // Determine creator role to decide auto-approval
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const autoApproveRoles = ["admin", "regional_manager", "department_head"]
    const shouldAutoApprove = profile && autoApproveRoles.includes(profile.role)

    // Create leave request (status depends on role)
    const payload: any = {
      user_id: user.id,
      start_date,
      end_date,
      reason,
      leave_type,
      status: shouldAutoApprove ? "approved" : "pending",
      approved_by: shouldAutoApprove ? user.id : null,
      approved_at: shouldAutoApprove ? new Date().toISOString() : null,
      document_url,
    }

    // Try insert; if column not found (schema mismatch), retry without `leave_type` and return a helpful error
    let leaveRequest: any = null
    let requestError: any = null

    try {
      const res = await supabase.from("leave_requests").insert(payload).select().single()
      leaveRequest = res.data
      requestError = res.error
    } catch (e) {
      requestError = e
    }

    if (requestError) {
      const msg = (requestError && requestError.message) || String(requestError)
      const isMissingColumn = /Could not find the .*column.*leave_type/i.test(msg) || /column "leave_type" does not exist/i.test(msg)

      if (isMissingColumn) {
        console.warn("leave_type column missing in DB schema; retrying without leave_type and advising migration")
        // remove the leave_type and retry
        const altPayload = { ...payload }
        delete altPayload.leave_type
        try {
          const res2 = await supabase.from("leave_requests").insert(altPayload).select().single()
          leaveRequest = res2.data
          requestError = res2.error
        } catch (e2) {
          requestError = e2
        }

        if (!requestError) {
          // Insert succeeded without leave_type; warn and continue
          console.warn("Inserted leave_request without leave_type. Please apply DB migration to add `leave_type` column.")
        } else {
          console.error("Retry insert without leave_type also failed:", requestError)
          return NextResponse.json({
            error: "Database schema mismatch: missing leave_type column. Apply the leave migration and try again.",
            details: requestError.message || String(requestError),
          }, { status: 500 })
        }
      } else {
        console.error("Failed to create leave_request:", requestError)
        return NextResponse.json({ error: requestError.message || String(requestError) }, { status: 400 })
      }
    }

    // Create notification for the leave request
    const { error: notificationError } = await supabase
      .from("leave_notifications")
      .insert({
        leave_request_id: leaveRequest.id,
        user_id: user.id,
        notification_type: shouldAutoApprove ? "leave_approved" : "leave_request",
        status: shouldAutoApprove ? "approved" : "pending",
      })

    if (notificationError) {
      console.warn("Failed to create leave notification:", notificationError.message)
    }

    // If auto-approved, also populate per-day leave_status rows (trigger only handles updates)
    if (shouldAutoApprove) {
      try {
        const start = new Date(start_date)
        const end = new Date(end_date)
        const dates: string[] = []
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d).toISOString().split("T")[0])
        }

        const rows = dates.map((dt) => ({
          user_id: user.id,
          date: dt,
          status: "on_leave",
          leave_request_id: leaveRequest.id,
        }))

        // Upsert to avoid conflicts
        const { error: leaveStatusError } = await supabase.from("leave_status").upsert(rows)
        if (leaveStatusError) {
          console.error("Failed to populate leave_status for auto-approved request:", leaveStatusError)
        }
      } catch (e) {
        console.error("Error populating leave_status for auto-approved request:", e)
      }
    }

    return NextResponse.json(
      {
        message: "Leave request submitted successfully",
        leaveRequest,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
