import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgtajtqxgczhjboatvol.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3NTI0OCwiZXhwIjoyMDcyNTUxMjQ4fQ.x3by0hGUAO3GQcPs1_sla6gdGY8QuxcYiGmSRdj4-yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOffPremisesRequests() {
  try {
    console.log('=====================================');
    console.log('OFF-PREMISES CHECK-IN REQUEST TABLE DATA');
    console.log('=====================================\n');

    // 1. Get total count of all records
    const { count: totalCount, error: countError } = await supabase
      .from('pending_offpremises_checkins')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting records:', countError);
      return;
    }

    console.log(`📊 TOTAL RECORDS IN TABLE: ${totalCount || 0}\n`);

    // 2. Get count by status
    const { data: byStatus, error: statusError } = await supabase
      .from('pending_offpremises_checkins')
      .select('status');

    if (!statusError && byStatus) {
      const statusCounts = byStatus.reduce((acc: any, req: any) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {});

      console.log('📈 RECORDS BY STATUS:');
      console.log(`  ⏳ Pending: ${statusCounts.pending || 0}`);
      console.log(`  ✅ Approved: ${statusCounts.approved || 0}`);
      console.log(`  ❌ Rejected: ${statusCounts.rejected || 0}\n`);
    }

    // 3. Get all requests with details (limit to 20 most recent)
    const { data: allRequests, error: fetchError } = await supabase
      .from('pending_offpremises_checkins')
      .select(`
        id,
        user_id,
        current_location_name,
        latitude,
        longitude,
        status,
        reason,
        created_at,
        approved_at,
        rejection_reason,
        user_profiles (
          id,
          first_name,
          last_name,
          email,
          employee_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('❌ Error fetching requests:', fetchError);
      return;
    }

    if (allRequests && allRequests.length > 0) {
      console.log('📋 RECENT OFF-PREMISES REQUESTS:\n');
      allRequests.forEach((req: any, index: number) => {
        const user = Array.isArray(req.user_profiles) ? req.user_profiles[0] : req.user_profiles;
        console.log(`${index + 1}. REQUEST ID: ${req.id}`);
        console.log(`   Staff: ${user?.first_name} ${user?.last_name} (${user?.email})`);
        console.log(`   Employee ID: ${user?.employee_id}`);
        console.log(`   Location: ${req.current_location_name}`);
        console.log(`   GPS: ${req.latitude}, ${req.longitude}`);
        console.log(`   Reason: ${req.reason || 'N/A'}`);
        console.log(`   Status: ${req.status}`);
        console.log(`   Submitted: ${new Date(req.created_at).toLocaleString()}`);
        if (req.approved_at) {
          console.log(`   Approved: ${new Date(req.approved_at).toLocaleString()}`);
        }
        if (req.rejection_reason) {
          console.log(`   Rejection Reason: ${req.rejection_reason}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ NO RECORDS FOUND IN TABLE\n');
      console.log('The table exists but has no off-premises check-in requests yet.');
      console.log('Users can submit requests through the mobile app when checking in outside premises.\n');
    }

    // 4. Show schema summary
    console.log('=====================================');
    console.log('TABLE SCHEMA INFORMATION');
    console.log('=====================================');
    console.log('Table Name: pending_offpremises_checkins');
    console.log('Key Columns:');
    console.log('  - id (UUID): Unique request ID');
    console.log('  - user_id (UUID): Staff member who submitted request');
    console.log('  - current_location_name (TEXT): Where they checked in from');
    console.log('  - latitude/longitude (FLOAT): GPS coordinates');
    console.log('  - reason (TEXT): Reason for off-premises check-in');
    console.log('  - status (TEXT): pending, approved, or rejected');
    console.log('  - created_at (TIMESTAMP): When submitted');
    console.log('  - approved_at (TIMESTAMP): When supervisor approved');
    console.log('  - rejection_reason (TEXT): If rejected, why');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOffPremisesRequests();

