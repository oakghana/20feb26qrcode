import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vgtajtqxgczhjboatvol.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3NTI0OCwiZXhwIjoyMDcyNTUxMjQ4fQ.x3by0hGUAO3GQcPs1_sla6gdGY8QuxcYiGmSRdj4-yA'

const client = createClient(supabaseUrl, supabaseServiceKey)

async function fixCocobodCoordinates() {
  try {
    console.log('Starting to fix Cocobod Archives coordinates...')
    
    // First, check current coordinates
    const { data: before } = await client
      .from('locations')
      .select('id, name, latitude, longitude, radius')
      .eq('name', 'Cocobod Archives')
      .single()
    
    console.log('Current Cocobod Archives coordinates:', before)
    
    // Fix the coordinates to Ghana location (Accra area)
    const { data: updated, error } = await client
      .from('locations')
      .update({
        latitude: 5.5532531,
        longitude: -0.2112487,
        radius: 100
      })
      .eq('name', 'Cocobod Archives')
      .select()
    
    if (error) {
      console.error('Error updating Cocobod Archives:', error)
      return
    }
    
    console.log('Updated Cocobod Archives coordinates:', updated)
    
    // Verify the update
    const { data: after } = await client
      .from('locations')
      .select('id, name, latitude, longitude, radius')
      .eq('name', 'Cocobod Archives')
      .single()
    
    console.log('Verification - New Cocobod Archives coordinates:', after)
    console.log('SUCCESS: Cocobod Archives coordinates have been fixed!')
    
  } catch (err) {
    console.error('Error fixing Cocobod coordinates:', err)
  }
}

fixCocobodCoordinates()
