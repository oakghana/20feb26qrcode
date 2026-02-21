-- Remove the Cocobod Archives record with Australian coordinates
-- Keep the correct Ghana coordinates version

DELETE FROM public.geofence_locations 
WHERE name = 'Cocobod Archives' 
AND latitude = -31.854696 
AND longitude = 116.00816;

-- Verify the correct Cocobod Archives remains
SELECT id, name, address, latitude, longitude, is_active 
FROM public.geofence_locations 
WHERE name ILIKE '%cocobod%'
ORDER BY latitude, longitude;
