import { createAdminClient } from '@/lib/supabase/server'

async function setupDeviceRadiusSettings() {
  try {
    console.log('[v0] Setting up device radius settings...')

    const adminClient = await createAdminClient()

    // Check if settings already exist
    const { data: existing, error: checkError } = await adminClient
      .from('system_settings')
      .select('key')
      .eq('key', 'device_radius_settings')
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[v0] Error checking existing settings:', checkError)
      return
    }

    const deviceRadiusSettings = {
      mobile: { checkIn: 100, checkOut: 100 },
      tablet: { checkIn: 150, checkOut: 150 },
      laptop: { checkIn: 400, checkOut: 400 },
      desktop: { checkIn: 2000, checkOut: 2000 },
    }

    if (existing) {
      // Update existing
      const { error: updateError } = await adminClient
        .from('system_settings')
        .update({
          device_radius_settings: deviceRadiusSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'device_radius_settings')

      if (updateError) {
        console.error('[v0] Error updating device radius settings:', updateError)
        return
      }

      console.log('[v0] Device radius settings updated successfully')
    } else {
      // Insert new
      const { error: insertError } = await adminClient
        .from('system_settings')
        .insert({
          key: 'device_radius_settings',
          value: 'Trade-secret device-specific check-in/check-out radius settings',
          device_radius_settings: deviceRadiusSettings,
          description:
            'Device-specific radius settings: Display 100m to users but use these actual values for validation. Mobile: 100m, Tablet: 150m, Laptop: 400m, Desktop: 2000m',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('[v0] Error inserting device radius settings:', insertError)
        return
      }

      console.log('[v0] Device radius settings inserted successfully')
    }

    // Verify
    const { data: verified, error: verifyError } = await adminClient
      .from('system_settings')
      .select('device_radius_settings')
      .eq('key', 'device_radius_settings')
      .maybeSingle()

    if (verifyError) {
      console.error('[v0] Error verifying settings:', verifyError)
    } else {
      console.log('[v0] Verified device radius settings:', verified?.device_radius_settings)
    }
  } catch (error) {
    console.error('[v0] Setup error:', error)
  }
}

setupDeviceRadiusSettings()
