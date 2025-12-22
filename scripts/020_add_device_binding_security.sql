-- Add device binding tracking to prevent multiple users on same device
-- This ensures one device = one user for security

-- Add table to track device-user bindings
CREATE TABLE IF NOT EXISTS device_user_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    first_bound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB,
    is_active BOOLEAN DEFAULT true,
    violation_count INTEGER DEFAULT 0,
    UNIQUE(device_id, user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_user_bindings_device_id ON device_user_bindings(device_id);
CREATE INDEX IF NOT EXISTS idx_device_user_bindings_ip_address ON device_user_bindings(ip_address);
CREATE INDEX IF NOT EXISTS idx_device_user_bindings_user_id ON device_user_bindings(user_id);

-- Add table to track device violations
CREATE TABLE IF NOT EXISTS device_security_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL,
    ip_address INET,
    attempted_user_id UUID NOT NULL REFERENCES user_profiles(id),
    bound_user_id UUID NOT NULL REFERENCES user_profiles(id),
    violation_type VARCHAR(50) NOT NULL, -- 'login_attempt', 'checkin_attempt'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    department_notified BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    device_info JSONB
);

-- Add index for violation tracking
CREATE INDEX IF NOT EXISTS idx_device_violations_device_id ON device_security_violations(device_id);
CREATE INDEX IF NOT EXISTS idx_device_violations_attempted_user ON device_security_violations(attempted_user_id);
CREATE INDEX IF NOT EXISTS idx_device_violations_created_at ON device_security_violations(created_at);

-- Add RLS policies
ALTER TABLE device_user_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_security_violations ENABLE ROW LEVEL SECURITY;

-- Users can view their own bindings
CREATE POLICY users_view_own_bindings ON device_user_bindings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all bindings
CREATE POLICY admins_view_all_bindings ON device_user_bindings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'it-admin')
        )
    );

-- Department heads can view violations in their department
CREATE POLICY dept_heads_view_violations ON device_security_violations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up1
            INNER JOIN user_profiles up2 ON up1.department_id = up2.department_id
            WHERE up1.id = auth.uid()
            AND up1.role = 'department_head'
            AND up2.id = attempted_user_id
        )
    );

-- Admins can view all violations
CREATE POLICY admins_view_all_violations ON device_security_violations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'it-admin')
        )
    );

COMMENT ON TABLE device_user_bindings IS 'Tracks which devices are bound to which users to prevent device sharing';
COMMENT ON TABLE device_security_violations IS 'Logs security violations when different users attempt to use same device';
