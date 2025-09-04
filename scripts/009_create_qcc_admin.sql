-- Create QCC Admin User
-- This script creates an admin user profile for QCC@qccgh.onmicrosoft.com
-- The user will need to sign up with these credentials to activate the account

-- Ensure IT department exists (should already exist from previous scripts)
INSERT INTO departments (id, name, code, description, is_active) 
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Information Technology',
    'IT',
    'Information Technology Department',
    true
) ON CONFLICT (code) DO NOTHING;

-- Create trigger function to auto-assign admin role for QCC admin email
CREATE OR REPLACE FUNCTION assign_qcc_admin_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is the QCC admin email
    IF NEW.email = 'QCC@qccgh.onmicrosoft.com' THEN
        -- Insert admin profile
        INSERT INTO user_profiles (
            id,
            employee_id,
            first_name,
            last_name,
            email,
            phone,
            department_id,
            position,
            role,
            hire_date,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            '1000000',  -- Special admin staff number
            'QCC',
            'Administrator',
            NEW.email,
            '+233000000000',
            '11111111-1111-1111-1111-111111111111',  -- IT department
            'System Administrator',
            'admin',
            CURRENT_DATE,
            true,  -- Active by default for admin
            NOW(),
            NOW()
        );
        
        -- Log the admin account creation
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            NEW.id,
            'ADMIN_ACCOUNT_CREATED',
            'user_profiles',
            NEW.id,
            '{}',
            jsonb_build_object(
                'email', NEW.email,
                'role', 'admin',
                'employee_id', '1000000'
            ),
            '127.0.0.1',
            'System',
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for QCC admin auto-assignment
DROP TRIGGER IF EXISTS trigger_assign_qcc_admin_role ON auth.users;
CREATE TRIGGER trigger_assign_qcc_admin_role
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION assign_qcc_admin_role();

-- Create a view to show admin users for easy reference
CREATE OR REPLACE VIEW admin_users_info AS
SELECT 
    up.employee_id as "Staff Number",
    up.email as "Email",
    up.first_name || ' ' || up.last_name as "Full Name",
    up.role as "Role",
    d.name as "Department",
    up.is_active as "Active Status",
    'Sign up required' as "Login Note"
FROM user_profiles up
LEFT JOIN departments d ON up.department_id = d.id
WHERE up.role = 'admin'
ORDER BY up.created_at;

-- Grant necessary permissions
GRANT SELECT ON admin_users_info TO authenticated;

-- Display admin user information
SELECT 
    'QCC@qccgh.onmicrosoft.com' as "Admin Email",
    'admin' as "Password (for signup)",
    '1000000' as "Staff Number",
    'Must sign up first at /auth/signup' as "Instructions";
