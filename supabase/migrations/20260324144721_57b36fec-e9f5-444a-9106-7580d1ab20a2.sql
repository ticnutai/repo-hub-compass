
-- Folders table for organizing projects
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#D4AF37',
  icon text DEFAULT 'folder',
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON public.folders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own folders" ON public.folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add folder_id to projects
ALTER TABLE public.projects ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

-- Add auto_backup fields to projects
ALTER TABLE public.projects ADD COLUMN auto_backup_enabled boolean DEFAULT false;
ALTER TABLE public.projects ADD COLUMN backup_interval text DEFAULT 'weekly';
ALTER TABLE public.projects ADD COLUMN last_backup_at timestamp with time zone;

-- Add notes column to backups
ALTER TABLE public.backups ADD COLUMN notes text DEFAULT '';

-- Trigger for folders updated_at
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
