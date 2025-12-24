-- Add weekly device sharing detection system
-- This creates a view and functions to track devices used by multiple staff within a week

-- Create a view to identify devices shared by multiple users in the past 7 days
CREATE OR REPLACE VIEW weekly_shared_devices AS
SELECT 
  ds.device_id,
  ds.ip_address,
  COUNT(DISTINCT ds.user_id) as unique_users_count,
  ARRAY_AGG(DISTINCT ds.user_id) as user_ids,
  ARRAY_AGG(DISTINCT up.first_name || ' ' || up.last_name) as user_names,
  ARRAY_AGG(DISTINCT up.email) as user_emails,
  ARRAY_AGG(DISTINCT d.name) as departments,
  MIN(ds.last_activity) as first_activity,
  MAX(ds.last_activity) as last_activity,
  COUNT(DISTINCT DATE(ar.check_in_time)) as check_in_days
FROM device_sessions ds
JOIN user_profiles up ON ds.user_id = up.id
LEFT JOIN departments d ON up.department_id = d.id
LEFT JOIN attendance_records ar ON ds.user_id = ar.user_id 
  AND ar.check_in_time >= NOW() - INTERVAL '7 days'
WHERE ds.last_activity >= NOW() - INTERVAL '7 days'
GROUP BY ds.device_id, ds.ip_address
HAVING COUNT(DISTINCT ds.user_id) > 1;

-- Create a function to get weekly device sharing report for a specific department
CREATE OR REPLACE FUNCTION get_weekly_device_sharing_by_department(dept_id UUID DEFAULT NULL)
RETURNS TABLE (
  device_id VARCHAR,
  ip_address INET,
  unique_users_count BIGINT,
  user_names TEXT[],
  user_emails TEXT[],
  departments TEXT[],
  first_activity TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  check_in_days BIGINT,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wsd.device_id,
    wsd.ip_address,
    wsd.unique_users_count,
    wsd.user_names,
    wsd.user_emails,
    wsd.departments,
    wsd.first_activity,
    wsd.last_activity,
    wsd.check_in_days,
    CASE 
      WHEN wsd.unique_users_count >= 5 THEN 'critical'
      WHEN wsd.unique_users_count >= 3 THEN 'high'
      WHEN wsd.unique_users_count = 2 THEN 'medium'
      ELSE 'low'
    END as risk_level
  FROM weekly_shared_devices wsd
  WHERE dept_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = ANY(wsd.user_ids) 
      AND up.department_id = dept_id
    )
  ORDER BY wsd.unique_users_count DESC, wsd.last_activity DESC;
END;
$$ LANGUAGE plpgsql;

-- Add new violation type for weekly device sharing
ALTER TABLE device_security_violations 
ADD COLUMN IF NOT EXISTS violation_details JSONB;

COMMENT ON VIEW weekly_shared_devices IS 'Tracks devices used by multiple staff members within the past 7 days for security monitoring';
COMMENT ON FUNCTION get_weekly_device_sharing_by_department IS 'Returns device sharing statistics filtered by department with risk level assessment';
