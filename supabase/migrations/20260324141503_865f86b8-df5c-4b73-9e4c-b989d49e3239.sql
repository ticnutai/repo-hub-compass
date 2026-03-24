
-- Table for project links/URLs
CREATE TABLE public.project_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'url',
  label TEXT NOT NULL,
  url TEXT,
  value TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for detected services/technologies
CREATE TABLE public.project_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'dependency',
  version TEXT,
  config_found BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for environment variables found in project
CREATE TABLE public.project_env_vars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  var_name TEXT NOT NULL,
  var_value TEXT,
  source_file TEXT,
  is_secret BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for project_links
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own project_links" ON public.project_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own project_links" ON public.project_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own project_links" ON public.project_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own project_links" ON public.project_links FOR DELETE USING (auth.uid() = user_id);

-- RLS for project_services
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own project_services" ON public.project_services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own project_services" ON public.project_services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own project_services" ON public.project_services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own project_services" ON public.project_services FOR DELETE USING (auth.uid() = user_id);

-- RLS for project_env_vars
ALTER TABLE public.project_env_vars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own project_env_vars" ON public.project_env_vars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own project_env_vars" ON public.project_env_vars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own project_env_vars" ON public.project_env_vars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own project_env_vars" ON public.project_env_vars FOR DELETE USING (auth.uid() = user_id);
