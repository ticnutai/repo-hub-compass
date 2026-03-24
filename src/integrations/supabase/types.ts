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
          project_id: string
          size: string | null
          status: Database["public"]["Enums"]["backup_status"]
          user_id: string
        }
        Insert: {
          backup_type?: Database["public"]["Enums"]["backup_type"]
          created_at?: string
          id?: string
          project_id: string
          size?: string | null
          status?: Database["public"]["Enums"]["backup_status"]
          user_id: string
        }
        Update: {
          backup_type?: Database["public"]["Enums"]["backup_type"]
          created_at?: string
          id?: string
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
      projects: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          language: string | null
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
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
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
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string | null
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
        Relationships: []
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
    },
  },
} as const
