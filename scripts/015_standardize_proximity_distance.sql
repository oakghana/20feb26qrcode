-- Standardize proximity distance to use only global settings
-- Update system settings to ensure consistent proximity range

-- Update the system settings to have a clear global proximity distance
UPDATE public.system_settings 
SET geo_settings = jsonb_set(
    COALESCE(geo_settings, '{}'),
    '{globalProximityDistance}',
    '500'
)
WHERE id = 1;

-- Add a comment to clarify that individual location radius is now for reference only
COMMENT ON COLUMN public.geofence_locations.radius_meters IS 'Location radius for reference - actual proximity validation uses global system setting';

-- Create a view that shows effective proximity settings for all locations
CREATE OR REPLACE VIEW location_proximity_settings AS
SELECT 
    l.id,
    l.name,
    l.address,
    l.latitude,
    l.longitude,
    l.radius_meters as location_radius,
    COALESCE(
        (s.geo_settings->>'globalProximityDistance')::integer,
        (s.geo_settings->>'checkInProximityRange')::integer,
        500
    ) as effective_proximity_distance,
    l.is_active
FROM geofence_locations l
CROSS JOIN system_settings s
WHERE s.id = 1;
