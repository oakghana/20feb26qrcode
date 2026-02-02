-- Fix Admin and IT-Admin permissions for user management
-- This allows admins and IT-admins to insert and update user profiles

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Recreate policy allowing users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add policy allowing admins to insert new user profiles
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
CREATE POLICY "Admins can insert user profiles" ON user_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'it-admin')
  )
);

-- Add policy allowing admins to update any user profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'it-admin', 'regional_manager')
  )
);

-- Add policy allowing admins to delete user profiles (soft delete via is_active)
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;
CREATE POLICY "Admins can delete user profiles" ON user_profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Add comment to document the fix
COMMENT ON TABLE user_profiles IS 'Admin and IT-Admin users can now insert, update, and manage user profiles. Regional managers can update profiles.';
