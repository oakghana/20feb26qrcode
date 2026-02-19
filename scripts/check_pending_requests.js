import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vvdfqfuypxhuxiqxdcai.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZGZxZnV5cHhodXhpcXhkY2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NjA0NzgsImV4cCI6MjA1MTIzNjQ3OH0.CbLKyEqWWdEZWRUoG8rwuuOfIGk0BNlv4oI-F-NNY9M'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('=== CHECKING OFF-PREMISES REQUESTS ===\n')

  // 1. Check total count
  const { count: totalCount } = await supabase
    .from('pending_offpremises_checkins')
    .select('*', { count: 'exact', head: true })
  
  console.log(`Total records in pending_offpremises_checkins: ${totalCount}\n`)

  // 2. Get all records ordered by created_at
  const { data: allRequests, error: allError } = await supabase
    .from('pending_offpremises_checkins')
    .select('id, user_id, status, created_at, current_location_name')
    .order('created_at', { ascending: false })
    .limit(20)

  if (allError) {
    console.log('ERROR fetching requests:', allError.message)
    return
  }

  console.log('--- Last 20 requests (all statuses) ---')
  allRequests.forEach(r => {
    console.log(`[${r.status}] ${r.created_at} - ${r.current_location_name}`)
  })

  // 3. Count by status
  const pending = allRequests.filter(r => r.status === 'pending').length
  const approved = allRequests.filter(r => r.status === 'approved').length
  const rejected = allRequests.filter(r => r.status === 'rejected').length

  console.log(`\n--- Status counts ---`)
  console.log(`Pending: ${pending}`)
  console.log(`Approved: ${approved}`)
  console.log(`Rejected: ${rejected}`)

  // 4. Check recent requests (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentRequests } = await supabase
    .from('pending_offpremises_checkins')
    .select('id, user_id, status, created_at, current_location_name')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })

  console.log(`\n--- Requests in last 24 hours ---`)
  console.log(`Count: ${recentRequests?.length || 0}`)
  recentRequests?.forEach(r => {
    console.log(`[${r.status}] ${r.created_at} - ${r.current_location_name}`)
  })

  // 5. Check for managers
  const { data: managers } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, role, is_active')
    .in('role', ['admin', 'regional_manager', 'department_head'])
    .eq('is_active', true)

  console.log(`\n--- Active managers in system ---`)
  console.log(`Total: ${managers?.length || 0}`)
  managers?.forEach(m => {
    console.log(`[${m.role}] ${m.first_name} ${m.last_name}`)
  })
}

main()
