-- Ensure device radius settings are stored in system_settings table
INSERT INTO public.system_settings (key, value, device_radius_settings, description, updated_at)
VALUES (
  'device_radius_settings',
  'Trade-secret device-specific check-in/check-out radius settings',
  jsonb_build_object(
    'mobile', jsonb_build_object('checkIn', 100, 'checkOut', 100),
    'tablet', jsonb_build_object('checkIn', 150, 'checkOut', 150),
    'laptop', jsonb_build_object('checkIn', 400, 'checkOut', 400),
    'desktop', jsonb_build_object('checkIn', 2000, 'checkOut', 2000)
  ),
  'Device-specific radius settings: Display 100m to users but use these actual values for validation. Mobile: 100m, Tablet: 150m, Laptop: 400m, Desktop: 2000m',
  NOW()
)
ON CONFLICT (key)
DO UPDATE SET
  device_radius_settings = EXCLUDED.device_radius_settings,
  updated_at = NOW()
WHERE system_settings.key = 'device_radius_settings';

-- Verify the settings were saved
SELECT key, device_radius_settings FROM public.system_settings WHERE key = 'device_radius_settings';
