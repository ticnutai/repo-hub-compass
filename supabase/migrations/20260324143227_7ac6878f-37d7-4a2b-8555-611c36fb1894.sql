
CREATE TABLE public.service_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_name text NOT NULL,
  service_category text NOT NULL DEFAULT 'other',
  provider text NOT NULL DEFAULT '',
  connection_type text NOT NULL DEFAULT 'api_key',
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  last_tested_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own service_connections" ON public.service_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own service_connections" ON public.service_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own service_connections" ON public.service_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own service_connections" ON public.service_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_service_connections_updated_at BEFORE UPDATE ON public.service_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
