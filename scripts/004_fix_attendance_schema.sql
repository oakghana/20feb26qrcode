-- Add missing columns to attendance_records table
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS check_out_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS check_in_location_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS check_out_location_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_remote_location BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS qr_check_in_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qr_check_out_timestamp TIMESTAMP WITH TIME ZONE;

-- Update existing records to have default values
UPDATE attendance_records 
SET check_in_method = 'manual', 
    check_out_method = 'manual',
    is_remote_location = FALSE
WHERE check_in_method IS NULL OR check_out_method IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_check_in_method ON attendance_records(check_in_method);
CREATE INDEX IF NOT EXISTS idx_attendance_records_check_out_method ON attendance_records(check_out_method);
CREATE INDEX IF NOT EXISTS idx_attendance_records_is_remote ON attendance_records(is_remote_location);
