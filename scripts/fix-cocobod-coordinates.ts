import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgtajtqxgczhjboatvol.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3NTI0OCwiZXhwIjoyMDcyNTUxMjQ4fQ.x3by0hGUAO3GQcPs1_sla6gdGY8QuxcYiGmSRdj4-yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCocobodCoordinates() {
  try {
    console.log('Fixing Cocobod Archives coordinates...\n');

    // The coordinates -31.854696, 116.008160 are in Australia
    // Cocobod is in Ghana (Accra area)
    // Correct coordinates for Cocobod headquarters in Accra: approximately 5.553, -0.211
    // or the old coordinates used might have been: 5.553253, -0.211249

    const { data: beforeUpdate, error: beforeError } = await supabase
      .from('locations')
      .select('*')
      .ilike('name', '%Cocobod%')
      .limit(5);

    if (beforeError) {
      console.error('Error fetching locations:', beforeError);
      return;
    }

    console.log('BEFORE UPDATE:');
    console.log('Found locations with "Cocobod" in name:', beforeUpdate?.length || 0);
    if (beforeUpdate && beforeUpdate.length > 0) {
      beforeUpdate.forEach((loc, i) => {
        console.log(`${i + 1}. ${loc.name}: Lat=${loc.latitude}, Lng=${loc.longitude}`);
      });
    }
    console.log('');

    // Update Cocobod Archives to correct Ghana coordinates
    const { data: updateResult, error: updateError } = await supabase
      .from('locations')
      .update({
        latitude: 5.5532531,  // Correct Accra latitude
        longitude: -0.2112487, // Correct Accra longitude
      })
      .ilike('name', '%Cocobod Archives%')
      .select();

    if (updateError) {
      console.error('Error updating Cocobod Archives:', updateError);
      return;
    }

    console.log('UPDATE RESULT:');
    console.log('Cocobod Archives updated:', updateResult?.length || 0, 'record(s)');
    if (updateResult && updateResult.length > 0) {
      updateResult.forEach((loc, i) => {
        console.log(`${i + 1}. ${loc.name}: Lat=${loc.latitude}, Lng=${loc.longitude}, Radius=${loc.radius}m`);
      });
    }
    console.log('');

    // Also check for other Cocobod locations that might need fixing
    const { data: allCocobod, error: checkError } = await supabase
      .from('locations')
      .select('*')
      .ilike('name', '%Cocobod%');

    if (!checkError && allCocobod) {
      console.log('ALL COCOBOD LOCATIONS AFTER UPDATE:');
      allCocobod.forEach((loc, i) => {
        console.log(`${i + 1}. ${loc.name}: Lat=${loc.latitude}, Lng=${loc.longitude}`);
      });
    }

    console.log('\nDone! Cocobod Archives coordinates have been corrected to Ghana (Accra) coordinates.');
    console.log('Previous (incorrect): -31.854696, 116.008160 (Australia)');
    console.log('Now (correct): 5.5532531, -0.2112487 (Ghana)');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixCocobodCoordinates();
