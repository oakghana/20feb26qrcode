import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

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
          desktop: { checkIn: 2000, checkOut: 1500 },
        },
      })
    }

    // If no settings found, use defaults
    if (!settingsData) {
      const defaults = {
        mobile: { checkIn: 100, checkOut: 100 },
        tablet: { checkIn: 150, checkOut: 150 },
        laptop: { checkIn: 400, checkOut: 400 },
        desktop: { checkIn: 2000, checkOut: 1500 },
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
        desktop: { checkIn: 2000, checkOut: 1500 },
      },
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings) {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 })
    }

    // Validate settings structure
    const requiredDevices = ['mobile', 'tablet', 'laptop', 'desktop']
    for (const device of requiredDevices) {
      if (!settings[device] || typeof settings[device].checkIn !== 'number' || typeof settings[device].checkOut !== 'number') {
        return NextResponse.json(
          { error: `Invalid settings structure for ${device}` },
          { status: 400 }
        )
      }
    }

    console.log('[v0] Updating device radius settings:', {
      admin: user.id,
      newSettings: settings,
      timestamp: new Date().toISOString(),
    })

    // Update or insert settings
    const { error: upsertError } = await adminClient
      .from('system_settings')
      .upsert(
        {
          key: 'device_radius_settings',
          device_radius_settings: settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (upsertError) {
      console.error('[v0] Error updating device radius settings:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update settings', details: upsertError.message },
        { status: 500 }
      )
    }

    console.log('[v0] Device radius settings updated successfully')
    return NextResponse.json({
      success: true,
      message: 'Device radius settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('[v0] Error in device-radius PUT endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

