ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS github_auto_import_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS github_import_interval_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS github_target_project_id uuid NULL,
  ADD COLUMN IF NOT EXISTS github_last_import_at timestamptz NULL;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_github_import_interval_minutes_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_github_import_interval_minutes_check
  CHECK (github_import_interval_minutes >= 5 AND github_import_interval_minutes <= 10080);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'accounts_github_target_project_id_fkey'
      AND table_schema = 'public'
      AND table_name = 'accounts'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_github_target_project_id_fkey
      FOREIGN KEY (github_target_project_id)
      REFERENCES public.projects(id)
      ON DELETE SET NULL;
  END IF;
END $$;
