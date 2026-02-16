-- Create staff_assignments table for tracking off-location work assignments
CREATE TABLE IF NOT EXISTS staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_id UUID NOT NULL REFERENCES auth.users(id),
  assignment_date DATE NOT NULL,
  reason TEXT NOT NULL,
  location_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requires_confirmation BOOLEAN DEFAULT false,
  auto_checkin BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT no_duplicate_assignments UNIQUE(user_id, assignment_date)
);

-- Create assignment_approvals table for tracking approval workflow
CREATE TABLE IF NOT EXISTS assignment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES staff_assignments(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approval_status TEXT NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_level TEXT NOT NULL CHECK (approval_level IN ('department_head', 'regional_manager', 'admin')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT one_approval_per_level UNIQUE(assignment_id, approval_level)
);

-- Create assignment_checkins table to track auto-checkins for assignments
CREATE TABLE IF NOT EXISTS assignment_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES staff_assignments(id) ON DELETE CASCADE,
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  checkin_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  checkout_time TIMESTAMP WITH TIME ZONE,
  on_assignment BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_assignments
CREATE POLICY "Users can view their own assignments" ON staff_assignments
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_by_id);

CREATE POLICY "Department heads can view their team's assignments" ON staff_assignments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users u 
      WHERE u.raw_user_meta_data->>'role' IN ('department_head', 'regional_manager', 'admin')
    )
  );

CREATE POLICY "Users can create assignment requests" ON staff_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Assigned users can update their requests" ON staff_assignments
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- RLS Policies for assignment_approvals
CREATE POLICY "Approvers can view their approvals" ON assignment_approvals
  FOR SELECT USING (auth.uid() = approver_id);

CREATE POLICY "Managers can create approvals" ON assignment_approvals
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users u 
      WHERE u.raw_user_meta_data->>'role' IN ('department_head', 'regional_manager', 'admin')
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_staff_assignments_user_id ON staff_assignments(user_id);
CREATE INDEX idx_staff_assignments_assigned_by_id ON staff_assignments(assigned_by_id);
CREATE INDEX idx_staff_assignments_assignment_date ON staff_assignments(assignment_date);
CREATE INDEX idx_staff_assignments_status ON staff_assignments(status);
CREATE INDEX idx_assignment_approvals_assignment_id ON assignment_approvals(assignment_id);
CREATE INDEX idx_assignment_approvals_approver_id ON assignment_approvals(approver_id);
CREATE INDEX idx_assignment_approvals_approval_level ON assignment_approvals(approval_level);
CREATE INDEX idx_assignment_checkins_assignment_id ON assignment_checkins(assignment_id);
