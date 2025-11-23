-- Add column to track if warning was issued by admin/management vs department head
ALTER TABLE staff_warnings 
ADD COLUMN IF NOT EXISTS issued_by_role VARCHAR(50);

-- Add column to track the sender label to display
ALTER TABLE staff_warnings 
ADD COLUMN IF NOT EXISTS sender_label VARCHAR(100) DEFAULT 'Department Head';

-- Create index for filtering by issued role
CREATE INDEX IF NOT EXISTS idx_staff_warnings_issued_by_role ON staff_warnings(issued_by_role);
