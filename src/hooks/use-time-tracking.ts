import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTimeEntries(projectId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["time_entries", projectId],
    queryFn: async () => {
      let query = supabase
        .from("time_entries")
        .select("*, projects(name)")
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useRunningTimer() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["running_timer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, projects(name)")
        .eq("user_id", user!.id)
        .eq("is_running", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 1000,
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ projectId, description }: { projectId?: string; description?: string }) => {
      // Stop any running timer first
      const { data: running } = await supabase
        .from("time_entries")
        .select("id, start_time")
        .eq("user_id", user!.id)
        .eq("is_running", true);
      
      if (running?.length) {
        for (const entry of running) {
          const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000);
          await supabase
            .from("time_entries")
            .update({ is_running: false, end_time: new Date().toISOString(), duration_seconds: duration })
            .eq("id", entry.id);
        }
      }

      const { data, error } = await supabase
        .from("time_entries")
        .insert({ user_id: user!.id, project_id: projectId || null, description: description || '', is_running: true, start_time: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time_entries"] });
      qc.invalidateQueries({ queryKey: ["running_timer"] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data: entry } = await supabase
        .from("time_entries")
        .select("start_time")
        .eq("id", entryId)
        .single();
      
      if (!entry) throw new Error("Entry not found");
      const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000);
      
      const { error } = await supabase
        .from("time_entries")
        .update({ is_running: false, end_time: new Date().toISOString(), duration_seconds: duration })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time_entries"] });
      qc.invalidateQueries({ queryKey: ["running_timer"] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time_entries"] }),
  });
}
