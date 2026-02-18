-- Add reason column to pending_offpremises_checkins table
ALTER TABLE pending_offpremises_checkins
ADD COLUMN reason TEXT DEFAULT NULL;

-- Add google_maps_name column to pending_offpremises_checkins table
ALTER TABLE pending_offpremises_checkins
ADD COLUMN google_maps_name TEXT DEFAULT NULL;
