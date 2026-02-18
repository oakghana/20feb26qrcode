-- Add missing columns to attendance_records for off-premises tracking
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS actual_location_name TEXT,
ADD COLUMN IF NOT EXISTS actual_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS actual_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS on_official_duty_outside_premises BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS check_in_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS device_info TEXT;

-- Add google_maps_name to pending_offpremises_checkins
ALTER TABLE public.pending_offpremises_checkins
ADD COLUMN IF NOT EXISTS google_maps_name TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_offpremises
  ON public.attendance_records(on_official_duty_outside_premises)
  WHERE on_official_duty_outside_premises = TRUE;

CREATE INDEX IF NOT EXISTS idx_attendance_check_in_type
  ON public.attendance_records(check_in_type);
