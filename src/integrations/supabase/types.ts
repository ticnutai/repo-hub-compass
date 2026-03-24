export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_projects: {
        Row: {
          account_id: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          api_key: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          password: string | null
          service_name: string
          service_type: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          password?: string | null
          service_name: string
          service_type?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          password?: string | null
          service_name?: string
          service_type?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_type: Database["public"]["Enums"]["backup_type"]
          created_at: string
          id: string
          notes: string | null
          project_id: string
          size: string | null
          status: Database["public"]["Enums"]["backup_status"]
          user_id: string
        }
        Insert: {
          backup_type?: Database["public"]["Enums"]["backup_type"]
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          size?: string | null
          status?: Database["public"]["Enums"]["backup_status"]
          user_id: string
        }
        Update: {
          backup_type?: Database["public"]["Enums"]["backup_type"]
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          size?: string | null
          status?: Database["public"]["Enums"]["backup_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      changelogs: {
        Row: {
          change_type: Database["public"]["Enums"]["change_type"]
          created_at: string
          description: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          change_type?: Database["public"]["Enums"]["change_type"]
          created_at?: string
          description: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          change_type?: Database["public"]["Enums"]["change_type"]
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelogs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string
          display_name: string | null
          email: string | null
          github_token: string | null
          id: string
          sync_interval: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          github_token?: string | null
          id?: string
          sync_interval?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          github_token?: string | null
          id?: string
          sync_interval?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_env_vars: {
        Row: {
          created_at: string
          id: string
          is_secret: boolean | null
          project_id: string
          source_file: string | null
          user_id: string
          var_name: string
          var_value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_secret?: boolean | null
          project_id: string
          source_file?: string | null
          user_id: string
          var_name: string
          var_value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_secret?: boolean | null
          project_id?: string
          source_file?: string | null
          user_id?: string
          var_name?: string
          var_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_env_vars_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_links: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          link_type: string
          project_id: string
          url: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          link_type?: string
          project_id: string
          url?: string | null
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          link_type?: string
          project_id?: string
          url?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          project_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_services: {
        Row: {
          config_found: boolean | null
          created_at: string
          details: Json | null
          id: string
          project_id: string
          service_name: string
          service_type: string
          user_id: string
          version: string | null
        }
        Insert: {
          config_found?: boolean | null
          created_at?: string
          details?: Json | null
          id?: string
          project_id: string
          service_name: string
          service_type?: string
          user_id: string
          version?: string | null
        }
        Update: {
          config_found?: boolean | null
          created_at?: string
          details?: Json | null
          id?: string
          project_id?: string
          service_name?: string
          service_type?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_webhooks: {
        Row: {
          created_at: string
          event_types: string[]
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          project_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          project_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          project_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_webhooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_summary: string | null
          ai_summary_updated_at: string | null
          auto_backup_enabled: boolean | null
          backup_interval: string | null
          category: string | null
          created_at: string
          description: string | null
          folder_id: string | null
          id: string
          language: string | null
          last_backup_at: string | null
          last_synced_at: string | null
          local_path: string | null
          name: string
          platform: Database["public"]["Enums"]["project_platform"]
          repo_url: string | null
          status: Database["public"]["Enums"]["project_status"]
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          auto_backup_enabled?: boolean | null
          backup_interval?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          language?: string | null
          last_backup_at?: string | null
          last_synced_at?: string | null
          local_path?: string | null
          name: string
          platform?: Database["public"]["Enums"]["project_platform"]
          repo_url?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          auto_backup_enabled?: boolean | null
          backup_interval?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          language?: string | null
          last_backup_at?: string | null
          last_synced_at?: string | null
          local_path?: string | null
          name?: string
          platform?: Database["public"]["Enums"]["project_platform"]
          repo_url?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_connection_projects: {
        Row: {
          created_at: string
          id: string
          project_id: string
          service_connection_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          service_connection_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          service_connection_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_connection_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_connection_projects_service_connection_id_fkey"
            columns: ["service_connection_id"]
            isOneToOne: false
            referencedRelation: "service_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      service_connections: {
        Row: {
          config: Json
          connection_type: string
          created_at: string
          credentials: Json
          id: string
          last_tested_at: string | null
          notes: string | null
          provider: string
          service_category: string
          service_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          connection_type?: string
          created_at?: string
          credentials?: Json
          id?: string
          last_tested_at?: string | null
          notes?: string | null
          provider?: string
          service_category?: string
          service_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          connection_type?: string
          created_at?: string
          credentials?: Json
          id?: string
          last_tested_at?: string | null
          notes?: string | null
          provider?: string
          service_category?: string
          service_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          is_running: boolean | null
          project_id: string | null
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          is_running?: boolean | null
          project_id?: string | null
          start_time?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          is_running?: boolean | null
          project_id?: string | null
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      uptime_logs: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          monitor_id: string
          response_time: number | null
          status: string
          status_code: number | null
          user_id: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          monitor_id: string
          response_time?: number | null
          status: string
          status_code?: number | null
          user_id: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          monitor_id?: string
          response_time?: number | null
          status?: string
          status_code?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uptime_logs_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "uptime_monitors"
            referencedColumns: ["id"]
          },
        ]
      }
      uptime_monitors: {
        Row: {
          check_interval: number
          created_at: string
          id: string
          is_active: boolean
          last_checked_at: string | null
          last_response_time: number | null
          last_status: string | null
          name: string
          project_id: string | null
          updated_at: string
          uptime_percentage: number | null
          url: string
          user_id: string
        }
        Insert: {
          check_interval?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_response_time?: number | null
          last_status?: string | null
          name: string
          project_id?: string | null
          updated_at?: string
          uptime_percentage?: number | null
          url: string
          user_id: string
        }
        Update: {
          check_interval?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_response_time?: number | null
          last_status?: string | null
          name?: string
          project_id?: string | null
          updated_at?: string
          uptime_percentage?: number | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uptime_monitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      backup_status: "success" | "failed" | "pending"
      backup_type: "auto" | "manual"
      change_type: "feature" | "fix" | "update" | "deploy"
      project_platform: "github" | "local"
      project_status: "active" | "paused" | "completed"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      backup_status: ["success", "failed", "pending"],
      backup_type: ["auto", "manual"],
      change_type: ["feature", "fix", "update", "deploy"],
      project_platform: ["github", "local"],
      project_status: ["active", "paused", "completed"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "done"],
    },
  },
} as const
