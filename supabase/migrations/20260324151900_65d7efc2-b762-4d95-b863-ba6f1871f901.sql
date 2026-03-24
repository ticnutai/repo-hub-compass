
-- Project Notes/Wiki table
CREATE TABLE public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes" ON public.project_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON public.project_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.project_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.project_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Uptime Monitors table
CREATE TABLE public.uptime_monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  check_interval integer NOT NULL DEFAULT 300,
  is_active boolean NOT NULL DEFAULT true,
  last_status text DEFAULT 'unknown',
  last_checked_at timestamptz,
  last_response_time integer,
  uptime_percentage numeric(5,2) DEFAULT 100.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uptime_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monitors" ON public.uptime_monitors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own monitors" ON public.uptime_monitors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own monitors" ON public.uptime_monitors FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own monitors" ON public.uptime_monitors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Uptime Check Logs table
CREATE TABLE public.uptime_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid REFERENCES public.uptime_monitors(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL,
  response_time integer,
  status_code integer,
  error_message text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uptime_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs" ON public.uptime_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own logs" ON public.uptime_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Project Webhooks table
CREATE TABLE public.project_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  event_types text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhooks" ON public.project_webhooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own webhooks" ON public.project_webhooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own webhooks" ON public.project_webhooks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own webhooks" ON public.project_webhooks FOR DELETE TO authenticated USING (auth.uid() = user_id);
