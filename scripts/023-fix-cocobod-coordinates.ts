import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgtajtqxgczhjboatvol.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3NTI0OCwiZXhwIjoyMDcyNTUxMjQ4fQ.x3by0hGUAO3GQcPs1_sla6gdGY8QuxcYiGmSRdj4-yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCocobodArchives() {
  try {
    console.log('Fixing Cocobod Archives location coordinates...\n');

    // Find Cocobod Archives with Australian coordinates
    const { data: cocobodCurrent, error: findError } = await supabase
      .from('locations')
      .select('id, name, latitude, longitude, address')
      .eq('name', 'Cocobod Archives')
      .single();

    if (findError) {
      console.error('Error finding Cocobod Archives:', findError);
      return;
    }

    if (!cocobodCurrent) {
      console.log('Cocobod Archives location not found');
      return;
    }

    console.log('Current Cocobod Archives coordinates:');
    console.log(`  Name: ${cocobodCurrent.name}`);
    console.log(`  Address: ${cocobodCurrent.address}`);
    console.log(`  Latitude: ${cocobodCurrent.latitude}`);
    console.log(`  Longitude: ${cocobodCurrent.longitude}\n`);

    // Update to Ghana coordinates (Swanzy Arcade area)
    const { data: updatedLocation, error: updateError } = await supabase
      .from('locations')
      .update({
        latitude: 5.5532531,
        longitude: -0.2112487,
        address: 'Cocobod Archives, Swanzy Arcade, Accra, Ghana',
      })
      .eq('id', cocobodCurrent.id)
      .select();

    if (updateError) {
      console.error('Error updating Cocobod Archives:', updateError);
      return;
    }

    console.log('Successfully updated Cocobod Archives coordinates:');
    console.log(`  Name: ${updatedLocation[0].name}`);
    console.log(`  New Address: ${updatedLocation[0].address}`);
    console.log(`  New Latitude: ${updatedLocation[0].latitude}`);
    console.log(`  New Longitude: ${updatedLocation[0].longitude}\n`);

    // Verify the update
    const { data: verified } = await supabase
      .from('locations')
      .select('id, name, latitude, longitude')
      .eq('id', cocobodCurrent.id)
      .single();

    if (verified) {
      console.log('Verification successful!');
      console.log(`  Distance from Accra coordinates is now correct: (${verified.latitude}, ${verified.longitude})`);
      console.log('\nUsers at Cocobod Archives should now be able to check in successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCocobodArchives();
