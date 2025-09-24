-- Update default system settings to include checkInProximityRange
UPDATE public.system_settings 
SET geo_settings = jsonb_set(
    COALESCE(geo_settings, '{}'),
    '{checkInProximityRange}',
    '"500"'
)
WHERE id = 1;

-- If no system settings exist, create them
INSERT INTO public.system_settings (id, settings, geo_settings) 
VALUES (1, 
    '{"sessionTimeout": "480", "allowOfflineMode": false, "requirePhotoVerification": false, "enableAuditLog": true, "backupFrequency": "daily"}',
    '{"defaultRadius": "20", "allowManualOverride": false, "requireHighAccuracy": true, "maxLocationAge": "300000", "checkInProximityRange": "500"}'
) ON CONFLICT (id) DO UPDATE SET
    geo_settings = jsonb_set(
        COALESCE(system_settings.geo_settings, '{}'),
        '{checkInProximityRange}',
        '"500"'
    );
