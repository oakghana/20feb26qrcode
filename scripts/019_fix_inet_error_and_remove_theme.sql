-- Fix PostgreSQL inet type error by using NULL instead of 'system' for IP addresses
-- This script addresses the database error: invalid input syntax for type inet: "system"

-- 1. Add the missing details column to audit_logs table if it doesn't exist
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

-- 2. Update system settings to use 50 meters proximity distance with correct JSON syntax
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

-- 3. If no system settings exist, create them with 50m proximity and correct JSON
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

-- 4. Add audit log entry for this change (using NULL for ip_address instead of 'system')
INSERT INTO public.audit_logs (user_id, action, table_name, details, ip_address, user_agent)
SELECT 
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1), -- Use admin user if available
    'fix_proximity_distance_and_checkout_policy',
    'system_settings',
    '{"message": "Fixed proximity distance to 50 meters and updated check-out policy", "old_proximity": "120m", "new_proximity": "50m", "checkout_policy": "requires_50m_proximity", "applies_to": "all_staff_members", "affects": "check_in_and_check_out", "theme_toggle": "removed"}',
    NULL, -- Use NULL instead of 'system' to fix inet type error
    'database_migration'
WHERE EXISTS (SELECT 1 FROM auth.users);

-- 5. Update default proximity settings comment
COMMENT ON TABLE public.system_settings IS 'Proximity distance set to 50 meters for both check-in and check-out operations. Check-out now requires being within 50m of any QCC location. Theme toggle removed from application.';

-- 6. Create a system notification about the policy change
INSERT INTO public.email_notifications (user_id, subject, body, email_type, status)
SELECT 
    up.id,
    'Attendance Policy Update: 50m Proximity Required',
    'Important Update: The attendance system now requires you to be within 50 meters of any QCC location for both check-in and check-out. This ensures accurate location tracking and compliance with attendance policies. The theme toggle has also been removed from the application.',
    'policy_update',
    'pending'
FROM public.user_profiles up
WHERE up.is_active = true AND up.role IN ('staff', 'department_head', 'admin');
