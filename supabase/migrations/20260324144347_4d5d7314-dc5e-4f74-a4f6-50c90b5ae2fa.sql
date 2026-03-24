
CREATE TABLE public.service_connection_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_connection_id uuid NOT NULL REFERENCES public.service_connections(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(service_connection_id, project_id)
);

ALTER TABLE public.service_connection_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own service_connection_projects"
  ON public.service_connection_projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own service_connection_projects"
  ON public.service_connection_projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service_connection_projects"
  ON public.service_connection_projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
