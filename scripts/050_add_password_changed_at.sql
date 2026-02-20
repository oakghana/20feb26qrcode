-- Add password_changed_at timestamp to user_profiles for enforcing periodic password updates
ALTER TABLE IF EXISTS public.user_profiles
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- index for querying old passwords
CREATE INDEX IF NOT EXISTS idx_user_profiles_password_changed_at
  ON public.user_profiles(password_changed_at);