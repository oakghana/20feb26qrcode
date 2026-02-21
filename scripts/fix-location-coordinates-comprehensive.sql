-- Fix incorrect location coordinates that prevent users from checking in
-- These locations have incorrect GPS data stored in the database

-- Fix Cocobod Archives (currently has Australia coordinates, should be Ghana)
UPDATE public.locations
SET 
  latitude = 5.5532531,
  longitude = -0.2112487,
  address = 'Swanzy Arcade, Accra, Ghana',
  updated_at = NOW()
WHERE name = 'Cocobod Archives'
  AND latitude = -31.854696;

-- Also update any other location with incorrect Australian coordinates
UPDATE public.locations
SET 
  latitude = 5.5532531,
  longitude = -0.2112487,
  updated_at = NOW()
WHERE (latitude BETWEEN -45 AND -10 AND longitude BETWEEN 113 AND 154)
  AND id NOT IN (SELECT id FROM public.locations WHERE latitude BETWEEN 4 AND 12 AND longitude BETWEEN -4 AND 2)
  LIMIT 5;

-- Log all locations to verify they're in Ghana (lat: ~2-12, lng: ~-4 to 2)
SELECT name, latitude, longitude, radius_meters 
FROM public.locations 
WHERE latitude < 0 OR longitude > 5 OR longitude < -5
ORDER BY name;

-- Verify the correction
SELECT name, latitude, longitude, address, updated_at 
FROM public.locations 
WHERE name IN ('Cocobod Archives', 'Swanzy Arcade', 'HEAD OFFICE SWANZY ARCADE')
ORDER BY name;
