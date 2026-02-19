-- Create a test pending off-premises check-in request
-- This will help verify the approval flow works correctly

-- Insert a test request for the first IT admin user
INSERT INTO pending_offpremises_checkins (
  user_id,
  current_location_name,
  latitude,
  longitude,
  accuracy,
  device_info,
  status,
  created_at,
  google_maps_name
)
SELECT 
  id as user_id,
  'Test Location - Client Meeting' as current_location_name,
  5.636096 as latitude,
  -0.196608 as longitude,
  25 as accuracy,
  '{"userAgent": "Test Request", "platform": "Web"}' as device_info,
  'pending' as status,
  NOW() as created_at,
  'Accra, Ghana' as google_maps_name
FROM user_profiles
WHERE role = 'it-admin'
AND is_active = true
LIMIT 1;

-- Show the inserted request
SELECT 
  p.id,
  p.user_id,
  u.first_name,
  u.last_name,
  u.email,
  p.status,
  p.created_at,
  p.current_location_name
FROM pending_offpremises_checkins p
JOIN user_profiles u ON p.user_id = u.id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC
LIMIT 1;
