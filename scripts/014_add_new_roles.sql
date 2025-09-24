-- Add NSP, Intern, and Contract roles to the system
-- Update the role constraint to include the new roles

-- First, drop the existing constraint
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add the new constraint with all roles including NSP, Intern, and Contract
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'department_head', 'staff', 'nsp', 'intern', 'contract'));

-- Update any existing users with invalid roles to 'staff' (safety measure)
UPDATE public.user_profiles 
SET role = 'staff' 
WHERE role NOT IN ('admin', 'department_head', 'staff', 'nsp', 'intern', 'contract');

-- Log the schema update
INSERT INTO public.audit_logs (
    action,
    table_name,
    new_values,
    created_at
) VALUES (
    'schema_update',
    'user_profiles',
    jsonb_build_object(
        'change', 'Added new roles: NSP, Intern, Contract',
        'constraint', 'user_profiles_role_check',
        'valid_roles', ARRAY['admin', 'department_head', 'staff', 'nsp', 'intern', 'contract']
    ),
    NOW()
);
