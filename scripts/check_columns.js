import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vgtajtqxgczhjboatvol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3NTI0OCwiZXhwIjoyMDcyNTUxMjQ4fQ.x3by0hGUAO3GQcPs1_sla6gdGY8QuxcYiGmSRdj4-yA'
)

async function main() {
  // Just select one row and check keys
  const { data: row } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1)
    .single()
  
  if (row) {
    const keys = Object.keys(row)
    const geofenceRelated = keys.filter(k => k.includes('geofence') || k.includes('location') || k.includes('assigned'))
    console.log('\nAll columns:', keys.sort().join(', '))
    console.log('\nGeofence/location related columns:', geofenceRelated.join(', '))
  }
}

main()
