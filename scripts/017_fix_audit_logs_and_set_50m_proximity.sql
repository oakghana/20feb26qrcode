-- Fix audit_logs table by adding missing details column and set 50m proximity distance
-- This addresses the database error and ensures consistent 50m proximity for all users

-- Add the missing details column to audit_logs table
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

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

-- Add audit log entry for this change (now with the details column available)
INSERT INTO public.audit_logs (user_id, action, table_name, details, ip_address, user_agent)
SELECT 
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1), -- Use admin user if available
    'update_global_proximity_distance',
    'system_settings',
    '{"message": "Global proximity distance updated to 50 meters for all users", "old_value": "500", "new_value": "50", "applies_to": "all_staff_members", "affects": "check_in_and_check_out"}',
    NULL, -- Use NULL instead of 'system' to fix PostgreSQL inet type error
    'database_migration'
WHERE EXISTS (SELECT 1 FROM auth.users);

-- Update default proximity settings in components to use 50m
COMMENT ON TABLE public.system_settings IS 'Proximity distance set to 50 meters for both check-in and check-out operations across all users';
