-- Fix Cocobod Archives coordinates from Australia to Ghana
UPDATE locations 
SET latitude = 5.5532531, longitude = -0.2112487
WHERE name = 'Cocobod Archives' OR name LIKE '%Cocobod%';

-- Verify the fix
SELECT id, name, latitude, longitude, radius FROM locations WHERE name LIKE '%Cocobod%' OR name LIKE '%HEAD OFFICE%';
