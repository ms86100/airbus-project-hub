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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      discussion_action_items: {
        Row: {
          created_at: string
          created_by: string
          discussion_id: string
          id: string
          owner_id: string | null
          status: string
          target_date: string | null
          task_description: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          discussion_id: string
          id?: string
          owner_id?: string | null
          status?: string
          target_date?: string | null
          task_description: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          discussion_id?: string
          id?: string
          owner_id?: string | null
          status?: string
          target_date?: string | null
          task_description?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_action_items_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "project_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_change_log: {
        Row: {
          action_item_id: string | null
          change_type: string
          changed_by: string
          created_at: string
          discussion_id: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action_item_id?: string | null
          change_type: string
          changed_by: string
          created_at?: string
          discussion_id?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action_item_id?: string | null
          change_type?: string
          changed_by?: string
          created_at?: string
          discussion_id?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          due_date: string
          id: string
          name: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          due_date: string
          id?: string
          name: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          due_date?: string
          id?: string
          name?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_discussions: {
        Row: {
          attendees: Json | null
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          meeting_title: string
          project_id: string
          summary_notes: string | null
          updated_at: string
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          created_by: string
          id?: string
          meeting_date: string
          meeting_title: string
          project_id: string
          summary_notes?: string | null
          updated_at?: string
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          meeting_title?: string
          project_id?: string
          summary_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          department_id: string | null
          id: string
          joined_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          department_id?: string | null
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          department_id?: string | null
          id?: string
          joined_at?: string | null
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          priority: string | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          priority?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          priority?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      retrospective_action_items: {
        Row: {
          backlog_ref_id: string | null
          backlog_status: string | null
          converted_to_task: boolean | null
          created_at: string
          created_by: string
          from_card_id: string | null
          how_approach: string | null
          id: string
          retrospective_id: string
          task_id: string | null
          updated_at: string
          what_task: string
          when_sprint: string | null
          who_responsible: string | null
        }
        Insert: {
          backlog_ref_id?: string | null
          backlog_status?: string | null
          converted_to_task?: boolean | null
          created_at?: string
          created_by: string
          from_card_id?: string | null
          how_approach?: string | null
          id?: string
          retrospective_id: string
          task_id?: string | null
          updated_at?: string
          what_task: string
          when_sprint?: string | null
          who_responsible?: string | null
        }
        Update: {
          backlog_ref_id?: string | null
          backlog_status?: string | null
          converted_to_task?: boolean | null
          created_at?: string
          created_by?: string
          from_card_id?: string | null
          how_approach?: string | null
          id?: string
          retrospective_id?: string
          task_id?: string | null
          updated_at?: string
          what_task?: string
          when_sprint?: string | null
          who_responsible?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retrospective_action_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_backlog"
            referencedColumns: ["id"]
          },
        ]
      }
      retrospective_card_votes: {
        Row: {
          card_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retrospective_card_votes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "retrospective_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      retrospective_cards: {
        Row: {
          card_order: number
          column_id: string
          created_at: string
          created_by: string
          id: string
          text: string
          updated_at: string
          votes: number
        }
        Insert: {
          card_order?: number
          column_id: string
          created_at?: string
          created_by: string
          id?: string
          text: string
          updated_at?: string
          votes?: number
        }
        Update: {
          card_order?: number
          column_id?: string
          created_at?: string
          created_by?: string
          id?: string
          text?: string
          updated_at?: string
          votes?: number
        }
        Relationships: []
      }
      retrospective_columns: {
        Row: {
          column_order: number
          created_at: string
          id: string
          retrospective_id: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          column_order?: number
          created_at?: string
          id?: string
          retrospective_id: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          column_order?: number
          created_at?: string
          id?: string
          retrospective_id?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      retrospectives: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          framework: string
          id: string
          iteration_id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          framework?: string
          id?: string
          iteration_id: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          framework?: string
          id?: string
          iteration_id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_register: {
        Row: {
          category: string | null
          cause: string | null
          consequence: string | null
          contingency_plan: string | null
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          id: string
          identified_date: string | null
          impact: number | null
          last_updated: string | null
          likelihood: number | null
          mitigation_plan: string[] | null
          next_review_date: string | null
          notes: string | null
          owner: string | null
          project_id: string
          residual_impact: number | null
          residual_likelihood: number | null
          residual_risk_score: number | null
          response_strategy: string | null
          risk_code: string
          risk_score: number | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cause?: string | null
          consequence?: string | null
          contingency_plan?: string | null
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          id?: string
          identified_date?: string | null
          impact?: number | null
          last_updated?: string | null
          likelihood?: number | null
          mitigation_plan?: string[] | null
          next_review_date?: string | null
          notes?: string | null
          owner?: string | null
          project_id: string
          residual_impact?: number | null
          residual_likelihood?: number | null
          residual_risk_score?: number | null
          response_strategy?: string | null
          risk_code: string
          risk_score?: number | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cause?: string | null
          consequence?: string | null
          contingency_plan?: string | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          id?: string
          identified_date?: string | null
          impact?: number | null
          last_updated?: string | null
          likelihood?: number | null
          mitigation_plan?: string[] | null
          next_review_date?: string | null
          notes?: string | null
          owner?: string | null
          project_id?: string
          residual_impact?: number | null
          residual_likelihood?: number | null
          residual_risk_score?: number | null
          response_strategy?: string | null
          risk_code?: string
          risk_score?: number | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stakeholders: {
        Row: {
          created_at: string
          created_by: string
          department: string | null
          email: string | null
          id: string
          influence_level: string | null
          name: string
          notes: string | null
          project_id: string
          raci: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department?: string | null
          email?: string | null
          id?: string
          influence_level?: string | null
          name: string
          notes?: string | null
          project_id: string
          raci?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department?: string | null
          email?: string | null
          id?: string
          influence_level?: string | null
          name?: string
          notes?: string | null
          project_id?: string
          raci?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_backlog: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          id: string
          owner_id: string | null
          priority: string | null
          project_id: string
          source_id: string | null
          source_type: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          project_id: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          id?: string
          owner_id?: string | null
          priority?: string | null
          project_id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          task_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          task_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          task_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_id: string | null
          owner_id: string | null
          priority: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_id?: string | null
          priority?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string | null
          owner_id?: string | null
          priority?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_capacity_iterations: {
        Row: {
          committed_story_points: number
          created_at: string
          created_by: string
          department_id: string | null
          end_date: string
          id: string
          iteration_name: string
          project_id: string
          start_date: string
          updated_at: string
          working_days: number
        }
        Insert: {
          committed_story_points?: number
          created_at?: string
          created_by: string
          department_id?: string | null
          end_date: string
          id?: string
          iteration_name: string
          project_id: string
          start_date: string
          updated_at?: string
          working_days: number
        }
        Update: {
          committed_story_points?: number
          created_at?: string
          created_by?: string
          department_id?: string | null
          end_date?: string
          id?: string
          iteration_name?: string
          project_id?: string
          start_date?: string
          updated_at?: string
          working_days?: number
        }
        Relationships: []
      }
      team_capacity_members: {
        Row: {
          availability_percent: number
          created_at: string
          created_by: string
          department_id: string | null
          effective_capacity_days: number
          id: string
          iteration_id: string
          leaves: number
          member_name: string
          role: string
          stakeholder_id: string | null
          team_id: string | null
          updated_at: string
          work_mode: string
        }
        Insert: {
          availability_percent?: number
          created_at?: string
          created_by: string
          department_id?: string | null
          effective_capacity_days?: number
          id?: string
          iteration_id: string
          leaves?: number
          member_name: string
          role: string
          stakeholder_id?: string | null
          team_id?: string | null
          updated_at?: string
          work_mode: string
        }
        Update: {
          availability_percent?: number
          created_at?: string
          created_by?: string
          department_id?: string | null
          effective_capacity_days?: number
          id?: string
          iteration_id?: string
          leaves?: number
          member_name?: string
          role?: string
          stakeholder_id?: string | null
          team_id?: string | null
          updated_at?: string
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_capacity_members_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      team_capacity_settings: {
        Row: {
          created_at: string
          created_by: string
          hybrid_weight: number
          id: string
          iteration_basis: string
          office_weight: number
          project_id: string
          updated_at: string
          wfh_weight: number
          work_week: number
        }
        Insert: {
          created_at?: string
          created_by: string
          hybrid_weight?: number
          id?: string
          iteration_basis?: string
          office_weight?: number
          project_id: string
          updated_at?: string
          wfh_weight?: number
          work_week?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          hybrid_weight?: number
          id?: string
          iteration_basis?: string
          office_weight?: number
          project_id?: string
          updated_at?: string
          wfh_weight?: number
          work_week?: number
        }
        Relationships: []
      }
      team_definitions: {
        Row: {
          created_at: string
          created_by: string
          default_availability_percent: number
          default_leaves: number
          id: string
          stakeholder_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_availability_percent?: number
          default_leaves?: number
          id?: string
          stakeholder_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_availability_percent?: number
          default_leaves?: number
          id?: string
          stakeholder_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          project_id: string
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          project_id: string
          team_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          project_id?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_effective_capacity: {
        Args: {
          availability_percent: number
          hybrid_weight?: number
          leaves: number
          office_weight?: number
          wfh_weight?: number
          work_mode: string
          working_days: number
        }
        Returns: number
      }
      get_user_department: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "project_coordinator"
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
      app_role: ["admin", "project_coordinator"],
    },
  },
} as const
