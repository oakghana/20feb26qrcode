import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vgtajtqxgczhjboatvol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3NTI0OCwiZXhwIjoyMDcyNTUxMjQ4fQ.x3by0hGUAO3GQcPs1_sla6gdGY8QuxcYiGmSRdj4-yA'
)

async function main() {
  // 1. Get all pending_offpremises_checkins columns
  const { data: sampleRow } = await supabase
    .from('pending_offpremises_checkins')
    .select('*')
    .limit(1)
    .single()
  
  if (sampleRow) {
    console.log('pending_offpremises_checkins columns:', Object.keys(sampleRow).sort().join(', '))
  }

  // 2. Get ALL recent requests (last 7 days), ordered by created_at desc
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentRequests, error } = await supabase
    .from('pending_offpremises_checkins')
    .select('id, user_id, status, created_at, current_location_name, google_maps_name')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })

  console.log('\n--- Recent off-premises requests (last 7 days) ---')
  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Total:', recentRequests?.length || 0)
    recentRequests?.forEach(r => {
      console.log(`  [${r.status}] ${r.created_at} - user: ${r.user_id?.substring(0,8)}... - location: ${r.current_location_name}`)
    })
  }

  // 3. Count by status
  const { data: allRequests } = await supabase
    .from('pending_offpremises_checkins')
    .select('status')
  
  if (allRequests) {
    const counts = {}
    allRequests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1 })
    console.log('\n--- All-time status counts ---')
    console.log(JSON.stringify(counts, null, 2))
    console.log('Total records:', allRequests.length)
  }

  // 4. Check specifically for pending requests
  const { data: pendingOnly, error: pendingErr } = await supabase
    .from('pending_offpremises_checkins')
    .select('id, user_id, status, created_at, current_location_name')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  console.log('\n--- Pending requests ---')
  if (pendingErr) {
    console.log('Error:', pendingErr.message)
  } else {
    console.log('Count:', pendingOnly?.length || 0)
    pendingOnly?.forEach(r => {
      console.log(`  ${r.created_at} - user: ${r.user_id?.substring(0,8)}... - location: ${r.current_location_name}`)
    })
  }
}

main()
