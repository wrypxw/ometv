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
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      gender_coin_prices: {
        Row: {
          active: boolean
          coin_cost: number
          created_at: string
          gender_key: string
          gender_label: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          coin_cost?: number
          created_at?: string
          gender_key: string
          gender_label: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          coin_cost?: number
          created_at?: string
          gender_key?: string
          gender_label?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_queue: {
        Row: {
          created_at: string
          id: string
          matched_with: string | null
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_with?: string | null
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_with?: string | null
          session_id?: string
          status?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          bonus_amount: number
          coins_amount: number
          coupon_code: string | null
          created_at: string
          currency: string
          discount_percent: number | null
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          package_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          bonus_amount?: number
          coins_amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_percent?: number | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          package_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          bonus_amount?: number
          coins_amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_percent?: number | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          package_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "shop_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          bio: string | null
          coins: number
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          instagram: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          bio?: string | null
          coins?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          instagram?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          bio?: string | null
          coins?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          coins_reward: number
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          coins_reward?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          coins_reward?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          coins_received: number
          id: string
          promo_code_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coins_received?: number
          id?: string
          promo_code_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coins_received?: number
          id?: string
          promo_code_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      region_coin_prices: {
        Row: {
          active: boolean
          coin_cost: number
          created_at: string
          id: string
          parent_code: string | null
          region_code: string
          region_name: string
          region_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          coin_cost?: number
          created_at?: string
          id?: string
          parent_code?: string | null
          region_code: string
          region_name: string
          region_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          coin_cost?: number
          created_at?: string
          id?: string
          parent_code?: string | null
          region_code?: string
          region_name?: string
          region_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_packages: {
        Row: {
          active: boolean
          bonus: number
          coins: number
          created_at: string
          currency: string
          id: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bonus?: number
          coins?: number
          created_at?: string
          currency?: string
          id?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bonus?: number
          coins?: number
          created_at?: string
          currency?: string
          id?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      signaling: {
        Row: {
          created_at: string
          id: string
          payload: Json
          room_id: string
          sender_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          room_id: string
          sender_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          room_id?: string
          sender_id?: string
          type?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      admin_update_coins: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      cleanup_old_queue_entries: { Args: never; Returns: undefined }
      get_all_users: {
        Args: never
        Returns: {
          coins: number
          created_at: string
          display_name: string
          email: string
          id: string
          role: string
        }[]
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
