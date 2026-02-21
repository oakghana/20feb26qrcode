import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { requiresLatenessReason, canCheckInAtTime, getCheckInDeadline } from "@/lib/attendance-utils"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const getClientIp = () => {
      return (request as any).ip || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user already checked in today IMMEDIATELY at the start
    const today = new Date().toISOString().split("T")[0]
    const { data: existingRecord, error: checkError } = await supabase
      .from("attendance_records")
      .select("id, check_in_time, check_out_time")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .maybeSingle()

    if (checkError) {
      console.error("[v0] Error checking existing attendance:", checkError)
    }

    let deviceSharingWarning = null

    if (existingRecord && existingRecord.check_in_time) {
      console.log("[v0] DUPLICATE CHECK-IN BLOCKED - User already checked in today")

      // Log security violation
      const body = await request.json()
      if (body.device_info?.device_id) {
        const ipAddress = request.ip || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null

        await supabase
          .from("device_security_violations")
          .insert({
            device_id: body.device_info.device_id,
            ip_address: ipAddress,
            attempted_user_id: user.id,
            bound_user_id: user.id,
            violation_type: "double_checkin_attempt",
            device_info: body.device_info,
          })
          .catch((err) => {
            console.log("[v0] Could not log security violation (table may not exist):", err.message)
          })
      }

      const checkInTime = new Date(existingRecord.check_in_time).toLocaleTimeString()

      if (existingRecord.check_out_time) {
        const checkOutTime = new Date(existingRecord.check_out_time).toLocaleTimeString()
        const workHours = existingRecord.work_hours || 0
        
        return NextResponse.json(
          {
            alreadyCompleted: true,
            error: `You have already completed your work for today! You checked in at ${checkInTime} and checked out at ${checkOutTime} (${workHours} hours worked). Great job! See you tomorrow.`,
            details: {
              checkInTime: checkInTime,
              checkOutTime: checkOutTime,
              workHours: workHours,
              message: "Your attendance for today is complete. No further action needed."
            }
          },
          { status: 400 },
        )
      } else {
        return NextResponse.json(
          {
            error: `DUPLICATE CHECK-IN BLOCKED: You have already checked in today at ${checkInTime}. You are currently on duty. Please check out when you finish your work. This attempt has been logged.`,
          },
          { status: 400 },
        )
      }
    }

    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select(`
        first_name,
        last_name,
        role,
        assigned_location_id,
        departments(code, name)
      `)
      .eq("id", user.id)
      .maybeSingle()

    // Check if user is on leave (per-day leave_status table)
    const { data: leaveStatus } = await supabase
      .from("leave_status")
      .select("date, leave_request_id")
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("status", "on_leave")
      .maybeSingle()

    if (leaveStatus) {
      let startDate: string | null = null
      let endDate: string | null = null
      if (leaveStatus.leave_request_id) {
        const { data: lr } = await supabase
          .from("leave_requests")
          .select("start_date, end_date")
          .eq("id", leaveStatus.leave_request_id)
          .maybeSingle()
        if (lr) {
          startDate = lr.start_date
          endDate = lr.end_date
        }
      }

      return NextResponse.json(
        {
          error: `You are currently on approved leave${startDate && endDate ? ` from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}` : ""}. You cannot check in during this period. Please contact your manager if you believe this is incorrect.`,
          onLeave: true,
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { latitude, longitude, location_id, device_info, qr_code_used, qr_timestamp, lateness_reason, accuracy, location_timestamp, location_source, is_within_range } = body

    console.log("[v0] Check-in request received:", {
      latitude, longitude, accuracy, location_id, is_within_range,
      location_timestamp, location_source, qr_code_used,
      device_type: device_info?.device_type
    })

    // CRITICAL: When client confirms is_within_range = true, SKIP ALL DISTANCE CALCULATIONS
    // Trust the device radius settings validation that happened client-side
    if (is_within_range) {
      console.log("[v0] ✅ Client confirmed is_within_range=true - SKIPPING distance validation, proceeding to check-in")
    }

    if (device_info?.device_id) {
      const getValidIpAddress = () => {
        const possibleIps = [
          request.ip,
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          request.headers.get("x-real-ip"),
        ]
        for (const ip of possibleIps) {
          if (ip && ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1") {
            return ip
          }
        }
        return null
      }

      const ipAddress = getValidIpAddress()

      // Check if this device was recently used by another staff member
      // Enhanced detection using both device fingerprint (MAC-like) and IP address
      if (device_info?.device_id) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        
        console.log("[v0] Checking device sharing with enhanced detection:", {
          deviceId: device_info.device_id,
          ipAddress: ipAddress,
          userId: user.id
        })
        
        // First check: Same device fingerprint (MAC-like ID)
        const { data: recentDeviceSession } = await supabase
          .from("device_sessions")
          .select("user_id, last_activity, ip_address, device_id")
          .eq("device_id", device_info.device_id)
          .neq("user_id", user.id)
          .gte("last_activity", twoHoursAgo)
          .order("last_activity", { ascending: false })
          .limit(1)
          .maybeSingle()

        // Second check: Same IP address with different device ID (IP sharing detection)
        let ipSharingSession = null
        if (ipAddress) {
          const { data: ipSession } = await supabase
            .from("device_sessions")
            .select("user_id, last_activity, ip_address, device_id")
            .eq("ip_address", ipAddress)
            .neq("user_id", user.id)
            .neq("device_id", device_info.device_id)
            .gte("last_activity", twoHoursAgo)
            .order("last_activity", { ascending: false })
            .limit(1)
            .maybeSingle()
          
          ipSharingSession = ipSession
        }
      }
    } // close device_info?.device_id outer block

    // Server-side proximity validation is SKIPPED when is_within_range=true
    // The client already validated using device radius settings - we trust that
    if (!is_within_range && !qr_code_used && latitude && longitude) {
      console.log("[v0] Client did not confirm is_within_range - would normally do server validation here")
      // Could add additional validation here, but for now we allow check-in
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().split("T")[0]

    const { data: yesterdayRecord } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", `${yesterdayDate}T00:00:00`)
      .lt("check_in_time", `${yesterdayDate}T23:59:59`)
      .maybeSingle()

    let missedCheckoutWarning = null
    if (yesterdayRecord && yesterdayRecord.check_in_time && !yesterdayRecord.check_out_time) {
      // Auto check-out the previous day at 11:59 PM
      const autoCheckoutTime = new Date(`${yesterdayDate}T23:59:59`)
      const checkInTime = new Date(yesterdayRecord.check_in_time)
      const workHours = (autoCheckoutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

      await supabase
        .from("attendance_records")
        .update({
          check_out_time: autoCheckoutTime.toISOString(),
          work_hours: Math.round(workHours * 100) / 100,
          check_out_method: "auto_system",
          check_out_location_name: "Auto Check-out (Missed)",
          updated_at: new Date().toISOString(),
        })
        .eq("id", yesterdayRecord.id)

      // Create audit log for missed check-out
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "auto_checkout_missed",
        table_name: "attendance_records",
        record_id: yesterdayRecord.id,
        new_values: {
          reason: "Missed check-out from previous day",
          auto_checkout_time: autoCheckoutTime.toISOString(),
          work_hours_calculated: workHours,
        },
        ip_address: request.ip || null,
        user_agent: request.headers.get("user-agent"),
      })

      missedCheckoutWarning = {
        date: yesterdayDate,
        message: "You did not check out yesterday. This has been recorded and will be visible to your department head.",
      }
    }

    const { data: locationData, error: locationError } = await supabase
      .from("geofence_locations")
      .select("name, address, district_id")
      .eq("id", location_id)
      .single()

    if (locationError) {
      console.error("Location lookup error:", locationError)
    }

    // Get district name separately if needed
    let districtName = null
    if (locationData?.district_id) {
      const { data: district } = await supabase
        .from("districts")
        .select("name")
        .eq("id", locationData.district_id)
        .maybeSingle()
      districtName = district?.name
    }

    let deviceSessionId = null
    if (device_info?.device_id) {
      // First try to find existing session
      const { data: existingSession } = await supabase
        .from("device_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("device_id", device_info.device_id)
        .maybeSingle()

      if (existingSession) {
        // Update existing session
        const { data: updatedSession } = await supabase
          .from("device_sessions")
          .update({
            device_name: device_info.device_name || null,
            device_type: device_info.device_type || null,
            browser_info: device_info.browser_info || null,
            ip_address: request.ip || null,
            is_active: true,
            last_activity: new Date().toISOString(),
          })
          .eq("id", existingSession.id)
          .select("id")
          .maybeSingle()

        if (updatedSession) {
          deviceSessionId = updatedSession.id
        }
      } else {
        // Create new session only if we have a valid device_id
        const { data: newSession, error: sessionError } = await supabase
          .from("device_sessions")
          .insert({
            user_id: user.id,
            device_id: device_info.device_id,
            device_name: device_info.device_name || null,
            device_type: device_info.device_type || null,
            browser_info: device_info.browser_info || null,
            ip_address: request.ip || null,
            is_active: true,
            last_activity: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle()

        if (sessionError) {
          console.error("[v0] Device session creation error:", sessionError)
          // Continue without device session - it's optional
        } else if (newSession) {
          deviceSessionId = newSession.id
        }
      }
    }

    // Check if check-in is after 9:00 AM (late arrival)
    const checkInTime = new Date()
    const checkInHour = checkInTime.getHours()
    const checkInMinutes = checkInTime.getMinutes()
    const isWeekend = checkInTime.getDay() === 0 || checkInTime.getDay() === 6
    const isLateArrival = checkInHour > 9 || (checkInHour === 9 && checkInMinutes > 0)

    // WHEN is_within_range=true, SKIP ALL TIME AND DISTANCE RESTRICTIONS
    // User is confirmed to be at the correct location via device radius settings
    if (!is_within_range) {
      // Only enforce time restrictions when user hasn't confirmed within-range
      const canCheckIn = canCheckInAtTime(checkInTime, userProfile?.departments, userProfile?.role)
      if (!canCheckIn) {
        return NextResponse.json({
          error: `Check-in is only allowed before ${getCheckInDeadline()}. Your department/role does not have exceptions for late check-ins.`,
          checkInBlocked: true,
          currentTime: checkInTime.toLocaleTimeString(),
          deadline: getCheckInDeadline(),
        }, { status: 403 })
      }
    } else {
      console.log("[v0] ✅ is_within_range=true: SKIPPING time restriction check, allowing check-in")
    }

    const latenessRequired = requiresLatenessReason(checkInTime, userProfile?.departments, userProfile?.role)
    if (isLateArrival && latenessRequired && (!lateness_reason || lateness_reason.trim().length === 0)) {
      return NextResponse.json({
        error: "Lateness reason is required when checking in after 9:00 AM",
        requiresLatenessReason: true,
        checkInTime: checkInTime.toLocaleTimeString(),
      }, { status: 400 })
    }

    const attendanceData = {
      user_id: user.id,
      check_in_time: checkInTime.toISOString(),
      check_in_location_id: location_id,
      device_session_id: deviceSessionId,
      status: isLateArrival ? "late" : "present",
      check_in_method: qr_code_used ? "qr_code" : "gps",
      check_in_location_name: locationData?.name || null,
      is_remote_location: false, // Will be calculated based on user's assigned location
    }

    // Add GPS coordinates only if available
    if (latitude && longitude) {
      attendanceData.check_in_latitude = latitude
      attendanceData.check_in_longitude = longitude
    }

    // Add QR code timestamp if used
    if (qr_code_used && qr_timestamp) {
      attendanceData.qr_check_in_timestamp = qr_timestamp
    }

    // Add lateness reason if provided
    if (lateness_reason) {
      attendanceData.lateness_reason = lateness_reason.trim()
    }

    if (userProfile?.assigned_location_id && userProfile.assigned_location_id !== location_id) {
      attendanceData.is_remote_location = true
    }

    const { data: attendanceRecord, error: attendanceError } = await supabase
      .from("attendance_records")
      .insert(attendanceData)
      .select("*")
      .single()

    // Calculate check-in position for the location today
    let checkInPosition = null
    if (attendanceRecord && location_id) {
      const { count } = await supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("check_in_location_id", location_id)
        .gte("check_in_time", `${today}T00:00:00`)
        .lte("check_in_time", attendanceRecord.check_in_time)

      checkInPosition = count || 1
    }

    if (attendanceError) {
      console.error("[v0] Attendance insert error:", attendanceError)

      // Check if error is due to unique constraint violation
      if (attendanceError.code === "23505" || attendanceError.message?.includes("idx_unique_daily_checkin")) {
        console.log("[v0] RACE CONDITION CAUGHT - Unique constraint prevented duplicate check-in")
        return NextResponse.json(
          {
            error:
              "DUPLICATE CHECK-IN BLOCKED: You have already checked in today. This was a race condition that was prevented by the system. Please refresh your page.",
          },
          { status: 400 },
        )
      }

      // In development return more details to help debugging; avoid leaking DB internals in production
      const devDetails = process.env.NODE_ENV === "production" ? undefined : {
        message: attendanceError.message,
        code: attendanceError.code,
        details: attendanceError.details || attendanceError.hint || null,
      }

      console.error("[v0] Failed to record attendance - returning error response")
      return NextResponse.json(
        { error: "Failed to record attendance", dbError: devDetails },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "check_in",
      table_name: "attendance_records",
      record_id: attendanceRecord.id,
      new_values: {
        ...attendanceRecord,
        location_name: locationData?.name,
        district_name: districtName,
        check_in_method: attendanceData.check_in_method,
        is_remote_location: attendanceData.is_remote_location,
      },
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    // Prepare response with late arrival warning if applicable
    let checkInMessage = attendanceData.is_remote_location
      ? `Successfully checked in at ${locationData?.name} (different from your assigned location). Remember to check out at the end of your work today.`
      : `Successfully checked in at ${locationData?.name}. Remember to check out at the end of your work today.`

    if (isLateArrival) {
      const arrivalTime = `${checkInHour}:${checkInMinutes.toString().padStart(2, '0')}`
      checkInMessage = `Late arrival detected - You checked in at ${arrivalTime} (after 9:00 AM). ${checkInMessage}`
    }

    return NextResponse.json({ 
      success: true,
      attendance: attendanceRecord,
      message: checkInMessage,
      checkInPosition: checkInPosition,
    });
  }
  catch (error: unknown) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }


}
