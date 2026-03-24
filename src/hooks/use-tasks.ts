import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      let query = supabase
        .from("tasks" as any)
        .select("*")
        .order("position", { ascending: true });
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Task[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      due_date?: string | null;
      project_id?: string | null;
      position?: number;
    }) => {
      const { data, error } = await supabase
        .from("tasks" as any)
        .insert({ ...task, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      due_date?: string | null;
      project_id?: string | null;
      position?: number;
    }) => {
      const { data, error } = await supabase
        .from("tasks" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
