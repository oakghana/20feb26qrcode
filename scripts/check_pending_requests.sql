SELECT 
  id,
  user_id,
  current_location_name,
  latitude,
  longitude,
  status,
  created_at
FROM pending_offpremises_checkins
ORDER BY created_at DESC
LIMIT 20;
