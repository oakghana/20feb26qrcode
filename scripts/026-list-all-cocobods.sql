-- Find all Cocobod locations in the database
SELECT 
  id,
  name,
  address,
  latitude,
  longitude,
  radius_meters,
  is_active,
  created_at,
  updated_at
FROM geofence_locations
WHERE name ILIKE '%cocobod%' OR address ILIKE '%cocobod%'
ORDER BY updated_at DESC;
