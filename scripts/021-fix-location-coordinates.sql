-- Fix location coordinates that are incorrectly set or have wrong GPS data
-- Cocobod Archives should be in Ghana, not Australia

UPDATE public.locations
SET 
  latitude = 5.5532531,
  longitude = -0.2112487,
  updated_at = NOW()
WHERE name = 'Cocobod Archives' 
  AND (latitude = -31.854696 OR latitude IS NULL);

-- Log the update
SELECT name, latitude, longitude, updated_at 
FROM public.locations 
WHERE name = 'Cocobod Archives';
