-- Fix device_sessions table schema
-- Add missing attendance_record_id column for QR check-in tracking

-- Add attendance_record_id column to device_sessions table
ALTER TABLE device_sessions 
ADD COLUMN IF NOT EXISTS attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_sessions_attendance_record 
ON device_sessions(attendance_record_id);

-- Add comment for documentation
COMMENT ON COLUMN device_sessions.attendance_record_id IS 'Links device session to attendance record created during check-in';
