import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[v0] Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixOffPremisesCheckin() {
  console.log("[v0] Starting off-premises check-in fix...\n")

  try {
    // Step 1: Add missing columns to attendance_records
    console.log("[v0] Adding missing columns to attendance_records table...")
    const { error: alterError } = await supabase.rpc("alter_attendance_records")

    if (alterError && !alterError.message.includes("already exists")) {
      console.log("[v0] Using direct SQL to add columns...")

      const columnsToAdd = [
        "actual_location_name TEXT",
        "actual_latitude DECIMAL(10, 8)",
        "actual_longitude DECIMAL(11, 8)",
        "on_official_duty_outside_premises BOOLEAN DEFAULT FALSE",
        "check_in_type VARCHAR(50)",
        "device_info TEXT",
      ]

      for (const column of columnsToAdd) {
        const { error: addError } = await supabase.rpc("raw_sql_query", {
          query: `ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS ${column}`,
        })

        if (addError) {
          console.log(`[v0] Column may already exist or error: ${addError.message}`)
        } else {
          console.log(`[v0] Added column: ${column}`)
        }
      }
    }

    console.log("[v0] Columns ready.\n")

    // Step 2: Add google_maps_name to pending_offpremises_checkins
    console.log("[v0] Adding google_maps_name column to pending_offpremises_checkins...")
    const { error: googleMapsError } = await supabase.rpc("raw_sql_query", {
      query:
        "ALTER TABLE public.pending_offpremises_checkins ADD COLUMN IF NOT EXISTS google_maps_name TEXT",
    })

    if (googleMapsError && !googleMapsError.message.includes("already exists")) {
      console.log(`[v0] Note: ${googleMapsError.message}`)
    } else {
      console.log("[v0] google_maps_name column ready.\n")
    }

    // Step 3: Create the check-in record for the approved request
    console.log(
      "[v0] Creating retroactive check-in record for approved off-premises request...",
    )

    const checkInData = {
      user_id: "8965c7c1-a5df-4cc0-a9d6-b02b65e48ec0",
      check_in_time: new Date("2026-02-18T06:17:42Z"),
      actual_location_name: "Client Meeting - Off-Site Location 8",
      actual_latitude: 5.60788,
      actual_longitude: -0.150634,
      on_official_duty_outside_premises: true,
      check_in_type: "offpremises_confirmed",
      device_info: null,
      notes: "Off-premises check-in approved by manager - retroactively recorded.",
      status: "present",
    }

    const { data: existingRecord, error: checkError } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("user_id", checkInData.user_id)
      .eq("check_in_time", checkInData.check_in_time)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error(`[v0] Error checking existing record: ${checkError.message}`)
    }

    if (!existingRecord) {
      const { data: newRecord, error: insertError } = await supabase
        .from("attendance_records")
        .insert(checkInData)
        .select()

      if (insertError) {
        console.error(`[v0] Error creating check-in record: ${insertError.message}`)
        console.log("[v0] Error details:", insertError)
      } else {
        console.log("[v0] Check-in record created successfully!")
        console.log("[v0] Record ID:", newRecord[0].id)
      }
    } else {
      console.log("[v0] Check-in record already exists, skipping creation.")
    }

    // Step 4: Verify the fix
    console.log("\n[v0] Verifying the fix...\n")

    const { data: attendanceRecord, error: verifyError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", "8965c7c1-a5df-4cc0-a9d6-b02b65e48ec0")
      .eq("on_official_duty_outside_premises", true)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .single()

    if (verifyError && verifyError.code !== "PGRST116") {
      console.error(`[v0] Verification error: ${verifyError.message}`)
    } else if (attendanceRecord) {
      console.log("===== OFF-PREMISES CHECK-IN RECORD =====")
      console.log("Staff ID:", attendanceRecord.user_id)
      console.log("Check-in Time:", new Date(attendanceRecord.check_in_time).toLocaleString())
      console.log("Location:", attendanceRecord.actual_location_name)
      console.log("Coordinates:", `${attendanceRecord.actual_latitude}, ${attendanceRecord.actual_longitude}`)
      console.log("Type:", attendanceRecord.check_in_type)
      console.log("Status:", attendanceRecord.status)
      console.log("Notes:", attendanceRecord.notes)
      console.log("=========================================")
      console.log("\n[v0] Fix completed successfully!")
    } else {
      console.log("[v0] No check-in record found.")
    }
  } catch (error) {
    console.error("[v0] Unexpected error:", error.message)
    process.exit(1)
  }
}

fixOffPremisesCheckin()
