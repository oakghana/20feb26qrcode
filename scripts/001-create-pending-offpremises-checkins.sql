-- Create pending_offpremises_checkins table
CREATE TABLE IF NOT EXISTS public.pending_offpremises_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  current_location_name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(7, 2),
  assigned_location_id UUID,
  device_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_by_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pending_offpremises_user_id ON public.pending_offpremises_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_offpremises_status ON public.pending_offpremises_checkins(status);
CREATE INDEX IF NOT EXISTS idx_pending_offpremises_created_at ON public.pending_offpremises_checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_offpremises_status_created ON public.pending_offpremises_checkins(status, created_at DESC);

-- Enable RLS
ALTER TABLE public.pending_offpremises_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own requests
CREATE POLICY "Users can view their own pending off-premises requests"
  ON public.pending_offpremises_checkins
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Managers can see requests from their staff/department
CREATE POLICY "Managers can view pending requests from their scope"
  ON public.pending_offpremises_checkins
  FOR SELECT
  USING (
    -- Managers and admins can view all requests in their scope
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND (
        -- Admins see everything
        up.role = 'admin'
        -- Department heads see their department's requests
        OR (up.role = 'department_head' AND up.department_id = (SELECT department_id FROM public.user_profiles WHERE id = pending_offpremises_checkins.user_id))
        -- Regional managers can approve (simplified - see all for now)
        OR up.role = 'regional_manager'
      )
    )
  );

-- RLS Policy: Managers can update (approve/reject) requests
CREATE POLICY "Managers can approve or reject requests"
  ON public.pending_offpremises_checkins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'admin'
        OR (up.role = 'department_head' AND up.department_id = (SELECT department_id FROM public.user_profiles WHERE id = pending_offpremises_checkins.user_id))
        OR up.role = 'regional_manager'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'admin'
        OR (up.role = 'department_head' AND up.department_id = (SELECT department_id FROM public.user_profiles WHERE id = pending_offpremises_checkins.user_id))
        OR up.role = 'regional_manager'
      )
    )
  );
