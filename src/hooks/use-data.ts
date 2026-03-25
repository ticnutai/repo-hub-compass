import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

async function createAuditLogEntry(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  // Best-effort logging: never block UX on audit failures.
  await supabase.from("audit_logs" as any).insert({
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    metadata: params.metadata || {},
  } as any);
}

// ---- Profile ----
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

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
      await createAuditLogEntry({
        userId: user!.id,
        action: "project_created",
        entityType: "project",
        entityId: data.id,
        metadata: { name: data.name, platform: data.platform },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; name?: string; description?: string; platform?: "github" | "local";
      language?: string; category?: string; tags?: string[]; status?: "active" | "paused" | "completed";
      repo_url?: string; local_path?: string;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      if (user?.id) {
        await createAuditLogEntry({
          userId: user.id,
          action: "project_deleted",
          entityType: "project",
          entityId: id,
        });
      }
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
      github_auto_import_enabled?: boolean;
      github_import_interval_minutes?: number;
      github_target_project_id?: string | null;
      github_last_import_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("accounts")
        .insert({ ...account, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      await createAuditLogEntry({
        userId: user!.id,
        action: "account_created",
        entityType: "account",
        entityId: data.id,
        metadata: { service_name: data.service_name, username: data.username },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; service_name?: string; service_type?: string; username?: string;
      email?: string; password?: string; api_key?: string; notes?: string;
      github_auto_import_enabled?: boolean;
      github_import_interval_minutes?: number;
      github_target_project_id?: string | null;
      github_last_import_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
      if (user?.id) {
        await createAuditLogEntry({
          userId: user.id,
          action: "account_deleted",
          entityType: "account",
          entityId: id,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useSystemAlerts(limit = 20) {
  return useQuery({
    queryKey: ["system_alerts", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as any[];
    },
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

// ---- Folders ----
export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folders" as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (folder: { name: string; color?: string; icon?: string; parent_id?: string }) => {
      const { data, error } = await supabase
        .from("folders" as any)
        .insert({ ...folder, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; icon?: string; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from("folders" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("folders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useMoveProjectToFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, folderId }: { projectId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from("projects")
        .update({ folder_id: folderId } as any)
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProjectBackupSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, auto_backup_enabled, backup_interval }: { id: string; auto_backup_enabled: boolean; backup_interval: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({ auto_backup_enabled, backup_interval } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
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

export function useProjectAccounts(projectId?: string) {
  return useQuery({
    queryKey: ["project_accounts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_projects")
        .select("*, accounts(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useProjectAccountLinks() {
  return useQuery({
    queryKey: ["project_accounts_index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_projects")
        .select("project_id, account_id, accounts(id, service_name, username, email, api_key, password)");
      if (error) throw error;
      return data;
    },
  });
}

export function useLinkAccountToProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ account_id, project_id }: { account_id: string; project_id: string }) => {
      const { data, error } = await supabase
        .from("account_projects")
        .insert({ account_id, project_id, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["project_accounts_index"] });
      queryClient.invalidateQueries({ queryKey: ["account_projects"] });
    },
  });
}

export function useUnlinkAccountFromProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("account_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["project_accounts_index"] });
      queryClient.invalidateQueries({ queryKey: ["account_projects"] });
    },
  });
}

// ---- Project Links ----
export function useProjectLinks(projectId?: string) {
  return useQuery({
    queryKey: ["project_links", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_links")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// ---- Project Services ----
export function useProjectServices(projectId?: string) {
  return useQuery({
    queryKey: ["project_services", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_services")
        .select("*")
        .eq("project_id", projectId!)
        .order("service_type", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// ---- Project Env Vars ----
export function useProjectEnvVars(projectId?: string) {
  return useQuery({
    queryKey: ["project_env_vars", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_env_vars")
        .select("*")
        .eq("project_id", projectId!)
        .order("var_name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

// ---- Service Connections ----
export function useServiceConnections() {
  return useQuery({
    queryKey: ["service_connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_connections" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateServiceConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (conn: {
      service_name: string; service_category?: string; provider?: string;
      connection_type?: string; credentials?: any; config?: any; notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("service_connections" as any)
        .insert({ ...conn, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_connections"] }),
  });
}

export function useUpdateServiceConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("service_connections" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_connections"] }),
  });
}

export function useDeleteServiceConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_connections" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_connections"] }),
  });
}

// ---- Service Connection <-> Project Links ----
export function useProjectServiceConnections(projectId?: string) {
  return useQuery({
    queryKey: ["service_connection_projects", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_connection_projects" as any)
        .select("*, service_connections(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });
}

export function useLinkServiceConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (link: { service_connection_id: string; project_id: string }) => {
      const { data, error } = await supabase
        .from("service_connection_projects" as any)
        .insert({ ...link, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_connection_projects"] }),
  });
}

export function useUnlinkServiceConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_connection_projects" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_connection_projects"] }),
  });
}

// ---- Project Notes ----
export function useProjectNotes(projectId?: string) {
  return useQuery({
    queryKey: ["project_notes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_notes" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (note: { project_id: string; title: string; content: string }) => {
      const { data, error } = await supabase
        .from("project_notes" as any)
        .insert({ ...note, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_notes"] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; content?: string }) => {
      const { data, error } = await supabase
        .from("project_notes" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_notes"] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_notes"] }),
  });
}

// ---- Uptime Monitors ----
export function useUptimeMonitors() {
  return useQuery({
    queryKey: ["uptime_monitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uptime_monitors" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (monitor: { name: string; url: string; check_interval: number; project_id?: string }) => {
      const { data, error } = await supabase
        .from("uptime_monitors" as any)
        .insert({ ...monitor, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uptime_monitors"] }),
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("uptime_monitors" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uptime_monitors"] }),
  });
}

export function useCheckMonitor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (monitorId: string) => {
      // Get monitor details
      const { data: monitor, error: fetchError } = await supabase
        .from("uptime_monitors" as any)
        .select("*")
        .eq("id", monitorId)
        .single();
      if (fetchError || !monitor) throw new Error("Monitor not found");

      const m = monitor as any;
      const startTime = Date.now();
      let status = "down";
      let statusCode = 0;
      let errorMessage = "";

      try {
        const res = await fetch(m.url, { method: "HEAD", mode: "no-cors" });
        statusCode = res.status;
        status = res.ok || res.type === "opaque" ? "up" : "down";
      } catch (e: any) {
        errorMessage = e.message;
        status = "down";
      }

      const responseTime = Date.now() - startTime;

      // Log the check
      await supabase.from("uptime_logs" as any).insert({
        monitor_id: monitorId,
        user_id: user!.id,
        status,
        response_time: responseTime,
        status_code: statusCode,
        error_message: errorMessage || null,
      } as any);

      // Update monitor
      await supabase
        .from("uptime_monitors" as any)
        .update({
          last_status: status,
          last_checked_at: new Date().toISOString(),
          last_response_time: responseTime,
        } as any)
        .eq("id", monitorId);

      return { status, responseTime };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uptime_monitors"] }),
  });
}

// ---- Project Webhooks ----
export function useProjectWebhooks(projectId?: string) {
  return useQuery({
    queryKey: ["project_webhooks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_webhooks" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (webhook: { project_id: string; name: string; url: string; event_types: string[] }) => {
      const { data, error } = await supabase
        .from("project_webhooks" as any)
        .insert({ ...webhook, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_webhooks"] }),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_webhooks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_webhooks"] }),
  });
}

// ---- Project Members / Roles ----
export function useProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: ["project_members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });
}

export function useUpsertProjectMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ project_id, user_id, role }: { project_id: string; user_id: string; role: "owner" | "admin" | "viewer" }) => {
      const { data, error } = await supabase
        .from("project_members" as any)
        .upsert({ project_id, user_id, role } as any, { onConflict: "project_id,user_id" })
        .select()
        .single();
      if (error) throw error;

      if (user?.id) {
        await createAuditLogEntry({
          userId: user.id,
          action: "project_member_upserted",
          entityType: "project_member",
          entityId: data.id,
          metadata: { project_id, user_id, role },
        });
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_members"] }),
  });
}
