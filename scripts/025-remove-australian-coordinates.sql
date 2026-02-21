-- Fix Cocobod Archives location with correct Ghana coordinates
-- Remove the Australian coordinates and replace with Ghana coordinates

UPDATE geofence_locations
SET 
  latitude = 5.5592846,
  longitude = -0.1974306,
  address = 'Cocobod, Accra, Ghana',
  updated_at = NOW()
WHERE name = 'Cocobod Archives' AND latitude = -31.854696;

-- Verify the update
SELECT id, name, latitude, longitude, address FROM geofence_locations WHERE name = 'Cocobod Archives';
