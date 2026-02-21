-- Fix Cocobod Archives coordinates (currently has Australian coords, should be Ghana)
UPDATE locations
SET latitude = 5.5532531, longitude = -0.2112487, radius = 100
WHERE name = 'Cocobod Archives'
AND (latitude = -31.854696 AND longitude = 116.00816);

-- Verify the update
SELECT id, name, latitude, longitude, radius
FROM locations
WHERE name IN ('Cocobod Archives', 'HEAD OFFICE SWANZY ARCADE', 'QCC Head Office')
ORDER BY name;
