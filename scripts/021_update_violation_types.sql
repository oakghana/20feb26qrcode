-- Update device_security_violations table to support new violation types
-- Run this script to ensure all violation types are properly handled

-- Add new violation types if not already present
DO $$
BEGIN
  -- The violation_type column should accept these values:
  -- 'duplicate_checkin_attempt' - User tries to check in when already checked in
  -- 'double_checkin_attempt' - Same user tries to check in twice
  -- 'duplicate_ip_checkin' - Different user checks in from same IP
  -- 'double_checkout_attempt' - User tries to check out when already checked out
  -- 'checkin_attempt' - Original violation type for device sharing
  -- 'login_attempt' - Original violation type for login device sharing
  
  -- No schema changes needed, just documenting the violation types
  RAISE NOTICE 'Violation types documentation updated';
END $$;

-- Create index on violation_type for faster queries
CREATE INDEX IF NOT EXISTS idx_device_violations_type 
ON device_security_violations(violation_type);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_device_violations_created 
ON device_security_violations(created_at DESC);

-- Create composite index for department head queries
CREATE INDEX IF NOT EXISTS idx_device_violations_user_date 
ON device_security_violations(attempted_user_id, created_at DESC);
