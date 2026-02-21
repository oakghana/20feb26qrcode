import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("[v0] Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseCocorobDatabase() {
  console.log("[v0] Starting Cocobod database diagnostic...")
  
  try {
    // Get ALL records with "cocobod" in any field
    const { data, error } = await supabase
      .from("geofence_locations")
      .select("id, name, address, latitude, longitude, radius_meters, is_active, created_at, updated_at")
      .or(`name.ilike.%cocobod%,address.ilike.%cocobod%`)
    
    if (error) {
      console.error("[v0] Database query error:", error)
      return
    }
    
    console.log("[v0] Cocobod records found:", data?.length)
    
    if (data && data.length > 0) {
      console.log("[v0] ALL Cocobod records in database:")
      data.forEach((record, index) => {
        console.log(`[v0] Record ${index + 1}:`, {
          id: record.id,
          name: record.name,
          address: record.address,
          latitude: record.latitude,
          longitude: record.longitude,
          is_active: record.is_active,
          created_at: record.created_at,
          updated_at: record.updated_at,
          isGhana: record.latitude > 4 && record.latitude < 12 && record.longitude < 2 && record.longitude > -4,
          isAustralia: record.latitude < -20 && record.longitude > 100
        })
      })
      
      // Check for exact Australia coordinates
      const australianRecord = data.find(r => 
        Math.abs(r.latitude - (-31.854696)) < 0.001 && 
        Math.abs(r.longitude - 116.00816) < 0.001
      )
      
      if (australianRecord) {
        console.log("[v0] ❌ FOUND AUSTRALIAN COORDINATES RECORD:", {
          id: australianRecord.id,
          name: australianRecord.name,
          lat: australianRecord.latitude,
          lng: australianRecord.longitude
        })
        console.log("[v0] This record MUST be deleted or updated to Ghana coordinates")
      }
      
      // Check for Ghana coordinates
      const ghanaRecord = data.find(r =>
        Math.abs(r.latitude - 5.5592846) < 0.001 &&
        Math.abs(r.longitude - (-0.1974306)) < 0.001
      )
      
      if (ghanaRecord) {
        console.log("[v0] ✅ FOUND GHANA COORDINATES RECORD:", {
          id: ghanaRecord.id,
          name: ghanaRecord.name,
          lat: ghanaRecord.latitude,
          lng: ghanaRecord.longitude
        })
      }
    } else {
      console.log("[v0] No Cocobod records found")
    }
    
  } catch (err) {
    console.error("[v0] Unexpected error:", err)
  }
}

diagnoseCocorobDatabase()
