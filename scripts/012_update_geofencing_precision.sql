-- Update GPS geofencing precision from 20 meters to 50 meters
-- This script updates the default radius in system settings and validation logic

-- Update the default radius in system settings from 20m to 50m
UPDATE public.system_settings 
SET geo_settings = jsonb_set(
    geo_settings, 
    '{defaultRadius}', 
    '"50"'
) 
WHERE id = 1;

-- Update all existing geofence locations that are using the old 20m default to 50m
UPDATE public.geofence_locations 
SET radius_meters = 50 
WHERE radius_meters = 20;

-- Fixed audit_logs insert to use correct table structure without details column
-- Log this change in audit logs
INSERT INTO public.audit_logs (
    id,
    user_id, 
    action, 
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address, 
    user_agent,
    created_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1), -- Use first admin user
    'update_geofencing_precision',
    'system_settings',
    NULL, -- Use NULL for record_id since this is a system-wide change, not tied to a specific UUID record
    '{"defaultRadius": "20"}',
    '{"defaultRadius": "50", "reason": "Increased GPS geofencing precision to 50 meters"}',
    '127.0.0.1',
    'database_script',
    NOW()
);
