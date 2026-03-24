-- Add github_token to profiles for persistent token storage
ALTER TABLE public.profiles ADD COLUMN github_token TEXT;

-- Add last_synced_at to projects to track sync status
ALTER TABLE public.projects ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;