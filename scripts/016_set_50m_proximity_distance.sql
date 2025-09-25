-- Update system settings to use 50 meters proximity distance for all users
UPDATE public.system_settings 
SET geo_settings = jsonb_set(
    jsonb_set(
        COALESCE(geo_settings, '{}'),
        '{checkInProximityRange}',
        '"50"'
    ),
    '{globalProximityDistance}',
    '"50"'
)
WHERE id = 1;

-- If no system settings exist, create them with 50m proximity
INSERT INTO public.system_settings (id, settings, geo_settings) 
VALUES (1, 
    '{"sessionTimeout": "480", "allowOfflineMode": false, "requirePhotoVerification": false, "enableAuditLog": true, "backupFrequency": "daily"}',
    '{"defaultRadius": "20", "allowManualOverride": false, "requireHighAccuracy": true, "maxLocationAge": "300000", "checkInProximityRange": "50", "globalProximityDistance": "50"}'
) ON CONFLICT (id) DO UPDATE SET
    geo_settings = jsonb_set(
        jsonb_set(
            COALESCE(system_settings.geo_settings, '{}'),
            '{checkInProximityRange}',
            '"50"'
        ),
        '{globalProximityDistance}',
        '"50"'
    );

-- Add audit log entry for this change (requires details column to exist)
-- This will be handled by the main fix script
