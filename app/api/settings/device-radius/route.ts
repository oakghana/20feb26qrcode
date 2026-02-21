import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const adminClient = await createAdminClient()

    // Fetch device radius settings from system_settings table
    const { data: settingsData, error } = await adminClient
      .from('system_settings')
      .select('device_radius_settings')
      .eq('key', 'device_radius_settings')
      .maybeSingle()

    if (error) {
      console.error('[v0] Error fetching device radius settings:', error)
      // Return default settings on error
      return NextResponse.json({
        settings: {
          mobile: { checkIn: 100, checkOut: 100 },
          tablet: { checkIn: 150, checkOut: 150 },
          laptop: { checkIn: 400, checkOut: 400 },
          desktop: { checkIn: 2000, checkOut: 2000 },
        },
      })
    }

    // If no settings found, use defaults
    if (!settingsData) {
      const defaults = {
        mobile: { checkIn: 100, checkOut: 100 },
        tablet: { checkIn: 150, checkOut: 150 },
        laptop: { checkIn: 400, checkOut: 400 },
        desktop: { checkIn: 2000, checkOut: 2000 },
      }

      console.log('[v0] No device radius settings found, using defaults:', defaults)
      return NextResponse.json({ settings: defaults })
    }

    // Parse the settings (might be stored as JSON string or object)
    let settings = settingsData.device_radius_settings
    if (typeof settings === 'string') {
      settings = JSON.parse(settings)
    }

    console.log('[v0] Device radius settings retrieved:', settings)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[v0] Error in device-radius settings endpoint:', error)
    
    // Return default settings on error
    return NextResponse.json({
      settings: {
        mobile: { checkIn: 100, checkOut: 100 },
        tablet: { checkIn: 150, checkOut: 150 },
        laptop: { checkIn: 400, checkOut: 400 },
        desktop: { checkIn: 2000, checkOut: 2000 },
      },
    })
  }
}
