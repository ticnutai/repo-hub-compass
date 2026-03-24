
CREATE OR REPLACE FUNCTION public.execute_readonly_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  trimmed text;
BEGIN
  trimmed := lower(trim(query_text));
  
  IF NOT (trimmed LIKE 'select%' OR trimmed LIKE 'explain%' OR trimmed LIKE 'with%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  IF trimmed LIKE '%insert %' OR trimmed LIKE '%update %' OR trimmed LIKE '%delete %' 
     OR trimmed LIKE '%drop %' OR trimmed LIKE '%alter %' OR trimmed LIKE '%create %'
     OR trimmed LIKE '%truncate%' OR trimmed LIKE '%grant%' THEN
    RAISE EXCEPTION 'Modification queries are not allowed in read-only console';
  END IF;

  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE TABLE IF NOT EXISTS public.migration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sql_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  executed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own migrations" ON public.migration_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
