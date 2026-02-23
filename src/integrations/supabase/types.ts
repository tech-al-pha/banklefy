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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anonymous_usage: {
        Row: {
          conversions_count: number
          created_at: string
          id: string
          ip_address: string
          last_reset_date: string
          timezone: string
          updated_at: string
        }
        Insert: {
          conversions_count?: number
          created_at?: string
          id?: string
          ip_address: string
          last_reset_date?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          conversions_count?: number
          created_at?: string
          id?: string
          ip_address?: string
          last_reset_date?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_corrections: {
        Row: {
          corrected_category: string
          created_at: string
          description_pattern: string
          id: string
          original_category: string
          updated_at: string
          usage_count: number | null
          user_id: string
          weight: number | null
        }
        Insert: {
          corrected_category: string
          created_at?: string
          description_pattern: string
          id?: string
          original_category: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
          weight?: number | null
        }
        Update: {
          corrected_category?: string
          created_at?: string
          description_pattern?: string
          id?: string
          original_category?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      conversions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_path: string
          id: string
          original_filename: string
          result_path: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path: string
          id?: string
          original_filename: string
          result_path?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string
          id?: string
          original_filename?: string
          result_path?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      conversion_feedback: {
        Row: {
          allow_template: boolean
          conversion_id: string
          created_at: string
          id: string
          is_accurate: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          allow_template?: boolean
          conversion_id: string
          created_at?: string
          id?: string
          is_accurate: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          allow_template?: boolean
          conversion_id?: string
          created_at?: string
          id?: string
          is_accurate?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_feedback_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          affected_rows: Json | null
          alert_type: string
          conversion_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["fraud_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          user_id: string
        }
        Insert: {
          affected_rows?: Json | null
          alert_type: string
          conversion_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["fraud_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          user_id: string
        }
        Update: {
          affected_rows?: Json | null
          alert_type?: string
          conversion_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["fraud_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      razorpay_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          notes: Json | null
          payment_capture: boolean | null
          plan_id: string
          razorpay_order_id: string
          receipt: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: Json | null
          payment_capture?: boolean | null
          plan_id: string
          razorpay_order_id: string
          receipt?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: Json | null
          payment_capture?: boolean | null
          plan_id?: string
          razorpay_order_id?: string
          receipt?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      razorpay_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          order_id: string | null
          plan_id: string
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          plan_id: string
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          plan_id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string
          razorpay_signature?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "razorpay_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "razorpay_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_analysis: {
        Row: {
          average_daily_balance: number | null
          balance_mismatches: number | null
          conversion_id: string
          created_at: string
          emi_debits: Json | null
          foir_score: number | null
          id: string
          integrity_score: number | null
          max_dip_amount: number | null
          max_dip_date: string | null
          net_cashflow: number | null
          risk_flags: Json | null
          salary_credits: Json | null
          total_inflow: number | null
          total_outflow: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_daily_balance?: number | null
          balance_mismatches?: number | null
          conversion_id: string
          created_at?: string
          emi_debits?: Json | null
          foir_score?: number | null
          id?: string
          integrity_score?: number | null
          max_dip_amount?: number | null
          max_dip_date?: string | null
          net_cashflow?: number | null
          risk_flags?: Json | null
          salary_credits?: Json | null
          total_inflow?: number | null
          total_outflow?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_daily_balance?: number | null
          balance_mismatches?: number | null
          conversion_id?: string
          created_at?: string
          emi_debits?: Json | null
          foir_score?: number | null
          id?: string
          integrity_score?: number | null
          max_dip_amount?: number | null
          max_dip_date?: string | null
          net_cashflow?: number | null
          risk_flags?: Json | null
          salary_credits?: Json | null
          total_inflow?: number | null
          total_outflow?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_analysis_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle_end: string
          billing_cycle_start: string
          conversions_limit: number
          conversions_used: number
          created_at: string
          id: string
          last_reset_date: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle_end?: string
          billing_cycle_start?: string
          conversions_limit?: number
          conversions_used?: number
          created_at?: string
          id?: string
          last_reset_date?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle_end?: string
          billing_cycle_start?: string
          conversions_limit?: number
          conversions_used?: number
          created_at?: string
          id?: string
          last_reset_date?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      check_and_reset_daily_limit: {
        Args: { p_ip_address?: string; p_timezone?: string; p_user_id?: string }
        Returns: {
          conversions_limit: number
          conversions_used: number
          needs_reset: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage_count: {
        Args: { p_ip_address?: string; p_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_status: "pending" | "reviewed" | "dismissed" | "confirmed"
      app_role: "admin" | "user"
      fraud_severity: "low" | "medium" | "high" | "critical"
      subscription_tier: "free" | "daily" | "business"
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
      alert_status: ["pending", "reviewed", "dismissed", "confirmed"],
      app_role: ["admin", "user"],
      fraud_severity: ["low", "medium", "high", "critical"],
      subscription_tier: ["free", "daily", "business"],
    },
  },
} as const
