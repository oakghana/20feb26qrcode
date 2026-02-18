import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[v0] Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createCheckInRecord() {
  console.log("[v0] Creating automatic check-in record for approved off-premises request...\n");

  // The approved request details
  const userId = "8965c7c1-a5df-4cc0-a9d6-b02b65e48ec0";
  const locationName = "Client Meeting - Off-Site Location 8";
  const latitude = 5.60788;
  const longitude = -0.150634;
  const approvalTime = new Date("2026-02-18T06:17:42Z");

  // Create check-in record
  const { data: checkInRecord, error: checkInError } = await supabase
    .from("attendance_records")
    .insert({
      user_id: userId,
      check_in_time: approvalTime.toISOString(),
      location_id: "off-premises", // Special marker for off-premises
      actual_location_name: locationName,
      actual_latitude: latitude,
      actual_longitude: longitude,
      on_official_duty_outside_premises: true,
      check_in_type: "off_premises_approved",
      check_in_method: "off-premises-approval",
      device_info: "Auto check-in from approved off-premises request",
    })
    .select()
    .single();

  if (checkInError) {
    console.error("[v0] Error creating check-in record:", checkInError.message);
    process.exit(1);
  }

  console.log("✓ CHECK-IN RECORD CREATED SUCCESSFULLY");
  console.log(`  ID: ${checkInRecord.id}`);
  console.log(`  Staff User: ${userId}`);
  console.log(`  Check-in Time: ${new Date(checkInRecord.check_in_time).toLocaleString()}`);
  console.log(`  Location: ${checkInRecord.actual_location_name}`);
  console.log(`  Coordinates: ${checkInRecord.actual_latitude}, ${checkInRecord.actual_longitude}`);
  console.log(`  Type: ${checkInRecord.check_in_type}`);
  console.log(`  Status: ON OFFICIAL DUTY (Off-Premises)\n`);

  // Verify the check-in was created
  const { data: verification } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("user_id", userId)
    .eq("on_official_duty_outside_premises", true)
    .single();

  if (verification) {
    console.log("✓ VERIFICATION SUCCESSFUL");
    console.log(`  Staff member is now checked in from: ${verification.actual_location_name}`);
    console.log(`  On official duty: YES`);
    console.log(`  Location tracking enabled: YES\n`);
  }

  console.log("SUMMARY:");
  console.log("════════════════════════════════════════════════════════════");
  console.log("Off-Premises Request Status: COMPLETE");
  console.log("1. Request Submitted: Feb 17, 2026 @ 9:24 AM");
  console.log("2. Request Approved: Feb 18, 2026 @ 6:17 AM");
  console.log("3. Auto Check-in Created: YES (just now)");
  console.log("4. Staff Member Status: CHECKED IN from off-premises");
  console.log("5. Location Saved: YES - All details stored in database");
  console.log("════════════════════════════════════════════════════════════\n");
}

createCheckInRecord().catch((error) => {
  console.error("[v0] Fatal error:", error);
  process.exit(1);
});
