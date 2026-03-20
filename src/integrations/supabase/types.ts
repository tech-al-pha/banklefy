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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      anonymous_usage: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      conversions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_name: string | null
          id: string
          processing_timings: Json | null
          processing_total_ms: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_name?: string | null
          id?: string
          processing_timings?: Json | null
          processing_total_ms?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_name?: string | null
          id?: string
          processing_timings?: Json | null
          processing_total_ms?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
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
          payment_capture: boolean
          plan_id: string
          razorpay_order_id: string
          receipt: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: Json | null
          payment_capture?: boolean
          plan_id: string
          razorpay_order_id: string
          receipt: string
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          notes?: Json | null
          payment_capture?: boolean
          plan_id?: string
          razorpay_order_id?: string
          receipt?: string
          status?: string
          updated_at?: string
          user_id?: string | null
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
      subscriptions: {
        Row: {
          conversions_limit: number
          conversions_used: number
          current_period_end: string | null
          free_daily_limit: number
          free_daily_used: number
          id: string
          last_reset_date: string | null
          monthly_limit: number
          monthly_reset_date: string | null
          monthly_used: number
          pack_limit: number
          pack_used: number
          pages_used_this_month: number
          plan_type: string | null
          status: string | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
          timezone: string | null
          user_id: string | null
          yearly_limit: number
          yearly_reset_date: string | null
          yearly_used: number
        }
        Insert: {
          conversions_limit?: number
          conversions_used?: number
          current_period_end?: string | null
          free_daily_limit?: number
          free_daily_used?: number
          id?: string
          last_reset_date?: string | null
          monthly_limit?: number
          monthly_reset_date?: string | null
          monthly_used?: number
          pack_limit?: number
          pack_used?: number
          pages_used_this_month?: number
          plan_type?: string | null
          status?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          timezone?: string | null
          user_id?: string | null
          yearly_limit?: number
          yearly_reset_date?: string | null
          yearly_used?: number
        }
        Update: {
          conversions_limit?: number
          conversions_used?: number
          current_period_end?: string | null
          free_daily_limit?: number
          free_daily_used?: number
          id?: string
          last_reset_date?: string | null
          monthly_limit?: number
          monthly_reset_date?: string | null
          monthly_used?: number
          pack_limit?: number
          pack_used?: number
          pages_used_this_month?: number
          plan_type?: string | null
          status?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          timezone?: string | null
          user_id?: string | null
          yearly_limit?: number
          yearly_reset_date?: string | null
          yearly_used?: number
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string | null
          source: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name?: string | null
          source?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          source?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          role?: string | null
          user_id?: string | null
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
      derive_subscription_tier: {
        Args: { p_plan_type: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      ensure_purge_expired_conversions_cron: { Args: never; Returns: Json }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_usage_count: {
        Args: {
          p_increment?: number
          p_ip_address?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      process_razorpay_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_order_id: string
          p_pages_to_add: number
          p_plan_id: string
          p_razorpay_order_id: string
          p_razorpay_payment_id: string
          p_razorpay_signature: string
          p_user_id: string
        }
        Returns: {
          already_processed: boolean
          pages_added: number
        }[]
      }
      purge_expired_conversions: { Args: never; Returns: undefined }
      recalculate_subscription_totals: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      retention_health_check: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
      subscription_tier: ["free", "daily", "business"],
    },
  },
} as const
