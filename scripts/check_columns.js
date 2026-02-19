import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vgtajtqxgczhjboatvol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3NTI0OCwiZXhwIjoyMDcyNTUxMjQ4fQ.x3by0hGUAO3GQcPs1_sla6gdGY8QuxcYiGmSRdj4-yA'
)

async function main() {
  // Get user_profiles columns
  const { data: cols, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' AND table_schema = 'public' ORDER BY ordinal_position`
  }).catch(() => ({ data: null, error: 'rpc not available' }))

  if (error) {
    // Fallback: just select one row and check keys
    const { data, error: e2 } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
      .single()
    
    if (e2) {
      console.log('Error:', e2.message)
    } else {
      console.log('user_profiles columns:', Object.keys(data).sort().join('\n'))
    }
  } else {
    console.log('Columns:', JSON.stringify(cols, null, 2))
  }

  // Also check if there's a geofence-related column with a different name
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
