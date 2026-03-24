import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ---- Projects ----
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (project: {
      name: string; description?: string; platform: "github" | "local";
      language?: string; category?: string; tags?: string[];
      repo_url?: string; local_path?: string;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ---- Accounts ----
export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (account: {
      service_name: string; service_type?: string; username?: string;
      email?: string; password?: string; api_key?: string; notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("accounts")
        .insert({ ...account, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

// ---- Changelogs ----
export function useChangelogs(projectId?: string) {
  return useQuery({
    queryKey: ["changelogs", projectId],
    queryFn: async () => {
      let query = supabase.from("changelogs").select("*, projects(name)").order("created_at", { ascending: false });
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateChangelog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (log: { project_id: string; description: string; change_type: "feature" | "fix" | "update" | "deploy" }) => {
      const { data, error } = await supabase
        .from("changelogs")
        .insert({ ...log, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["changelogs"] }),
  });
}

// ---- Backups ----
export function useBackups(projectId?: string) {
  return useQuery({
    queryKey: ["backups", projectId],
    queryFn: async () => {
      let query = supabase.from("backups").select("*, projects(name)").order("created_at", { ascending: false });
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (backup: { project_id: string; size?: string; status?: "success" | "failed" | "pending"; backup_type?: "auto" | "manual" }) => {
      const { data, error } = await supabase
        .from("backups")
        .insert({ ...backup, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backups"] }),
  });
}

// ---- Account-Projects link ----
export function useAccountProjects(accountId?: string) {
  return useQuery({
    queryKey: ["account_projects", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_projects")
        .select("*, projects(name)")
        .eq("account_id", accountId!);
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}
