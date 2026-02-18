-- Add missing columns to attendance_records for off-premises tracking
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS actual_location_name TEXT,
ADD COLUMN IF NOT EXISTS actual_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS actual_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS on_official_duty_outside_premises BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS check_in_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS device_info TEXT;

-- Add google_maps_name to pending_offpremises_checkins if it doesn't exist
ALTER TABLE public.pending_offpremises_checkins
ADD COLUMN IF NOT EXISTS google_maps_name TEXT;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_attendance_offpremises
  ON public.attendance_records(on_official_duty_outside_premises)
  WHERE on_official_duty_outside_premises = TRUE;

CREATE INDEX IF NOT EXISTS idx_attendance_check_in_type
  ON public.attendance_records(check_in_type);

-- Now create the check-in record for the already-approved request
INSERT INTO public.attendance_records (
  user_id,
  check_in_time,
  actual_location_name,
  actual_latitude,
  actual_longitude,
  on_official_duty_outside_premises,
  check_in_type,
  device_info,
  notes,
  status
)
SELECT
  '8965c7c1-a5df-4cc0-a9d6-b02b65e48ec0'::uuid,
  '2026-02-18T06:17:42Z'::timestamp with time zone,
  'Client Meeting - Off-Site Location 8',
  5.60788,
  -0.150634,
  TRUE,
  'offpremises_confirmed',
  NULL,
  'Off-premises check-in approved by manager.',
  'present'
WHERE NOT EXISTS (
  SELECT 1 FROM public.attendance_records
  WHERE user_id = '8965c7c1-a5df-4cc0-a9d6-b02b65e48ec0'::uuid
  AND check_in_time = '2026-02-18T06:17:42Z'::timestamp with time zone
);
