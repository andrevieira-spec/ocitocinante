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
      access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          email: string
          id: string
          ip: string | null
          name: string | null
          reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["access_request_status"]
          user_agent: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          email: string
          id?: string
          ip?: string | null
          name?: string | null
          reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["access_request_status"]
          user_agent?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          email?: string
          id?: string
          ip?: string | null
          name?: string | null
          reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["access_request_status"]
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_policies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          policy_data: Json
          policy_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          policy_data: Json
          policy_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          policy_data?: Json
          policy_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          api_name: string
          created_at: string
          expires_at: string
          id: string
          is_healthy: boolean | null
          last_error: string | null
          last_health_check: string | null
          token_added_at: string
          updated_at: string
        }
        Insert: {
          api_name: string
          created_at?: string
          expires_at: string
          id?: string
          is_healthy?: boolean | null
          last_error?: string | null
          last_health_check?: string | null
          token_added_at?: string
          updated_at?: string
        }
        Update: {
          api_name?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_healthy?: boolean | null
          last_error?: string | null
          last_health_check?: string | null
          token_added_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      archived_analyses: {
        Row: {
          analyses: Json
          analysis_date: string
          archived_at: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          analyses: Json
          analysis_date: string
          archived_at?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          analyses?: Json
          analysis_date?: string
          archived_at?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      campaign_approvals: {
        Row: {
          action: string
          campaign_id: string | null
          comments: string | null
          created_at: string | null
          id: string
          user_id: string | null
          version_diff: Json | null
        }
        Insert: {
          action: string
          campaign_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          version_diff?: Json | null
        }
        Update: {
          action?: string
          campaign_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          version_diff?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_approvals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "daily_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          content: Json
          created_at: string | null
          description: string | null
          id: string
          performance_metrics: Json | null
          status: string | null
          target_audience: Json | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          description?: string | null
          id?: string
          performance_metrics?: Json | null
          status?: string | null
          target_audience?: Json | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          performance_metrics?: Json | null
          status?: string | null
          target_audience?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      canva_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string | null
          scope: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      competitors: {
        Row: {
          category: string | null
          created_at: string
          id: string
          instagram_url: string | null
          is_active: boolean | null
          is_national: boolean | null
          name: string
          priority: string | null
          tiktok_url: string | null
          updated_at: string
          website_url: string
          x_url: string | null
          youtube_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_national?: boolean | null
          name: string
          priority?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website_url: string
          x_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_national?: boolean | null
          name?: string
          priority?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website_url?: string
          x_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          created_at: string | null
          embargo_rules: Json | null
          event_date: string
          event_name: string
          event_type: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          embargo_rules?: Json | null
          event_date: string
          event_name: string
          event_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          embargo_rules?: Json | null
          event_date?: string
          event_name?: string
          event_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_campaigns: {
        Row: {
          ab_tests: Json | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          campaign_date: string
          campaign_plan: Json
          checklist: Json | null
          created_at: string | null
          diagnosis: Json
          evidence: Json | null
          id: string
          status: string | null
          strategic_directive: Json
          visible_until: string | null
        }
        Insert: {
          ab_tests?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          campaign_date: string
          campaign_plan: Json
          checklist?: Json | null
          created_at?: string | null
          diagnosis: Json
          evidence?: Json | null
          id?: string
          status?: string | null
          strategic_directive: Json
          visible_until?: string | null
        }
        Update: {
          ab_tests?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          campaign_date?: string
          campaign_plan?: Json
          checklist?: Json | null
          created_at?: string | null
          diagnosis?: Json
          evidence?: Json | null
          id?: string
          status?: string | null
          strategic_directive?: Json
          visible_until?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          campaign_id: string | null
          conversation_id: string | null
          created_at: string | null
          email: string | null
          id: string
          interest_level: string | null
          interested_products: string[] | null
          name: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          interest_level?: string | null
          interested_products?: string[] | null
          name?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          interest_level?: string | null
          interested_products?: string[] | null
          name?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "public_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_patterns: {
        Row: {
          confidence_score: number | null
          conversation_id: string | null
          created_at: string | null
          id: string
          pattern_data: Json
          pattern_type: string
        }
        Insert: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          pattern_data: Json
          pattern_type: string
        }
        Update: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          pattern_data?: Json
          pattern_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_patterns_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      market_alerts: {
        Row: {
          action_items: Json | null
          alert_date: string | null
          alert_type: string
          created_at: string | null
          description: string
          id: string
          is_read: boolean | null
          related_competitor_id: string | null
          severity: string | null
          title: string
        }
        Insert: {
          action_items?: Json | null
          alert_date?: string | null
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          is_read?: boolean | null
          related_competitor_id?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          action_items?: Json | null
          alert_date?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          is_read?: boolean | null
          related_competitor_id?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_alerts_related_competitor_id_fkey"
            columns: ["related_competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      market_analysis: {
        Row: {
          analysis_type: string
          analyzed_at: string
          archived_at: string | null
          competitor_id: string | null
          confidence_score: number | null
          created_at: string
          data: Json
          id: string
          insights: string
          is_automated: boolean | null
          recommendations: string | null
        }
        Insert: {
          analysis_type: string
          analyzed_at?: string
          archived_at?: string | null
          competitor_id?: string | null
          confidence_score?: number | null
          created_at?: string
          data: Json
          id?: string
          insights: string
          is_automated?: boolean | null
          recommendations?: string | null
        }
        Update: {
          analysis_type?: string
          analyzed_at?: string
          archived_at?: string | null
          competitor_id?: string | null
          confidence_score?: number | null
          created_at?: string
          data?: Json
          id?: string
          insights?: string
          is_automated?: boolean | null
          recommendations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_analysis_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      market_insights: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          insight_type: string
          relevance_score: number | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          insight_type: string
          relevance_score?: number | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          insight_type?: string
          relevance_score?: number | null
          source?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      perplexity_conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perplexity_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "perplexity_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "perplexity_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_destinations: {
        Row: {
          created_at: string | null
          destination_name: string
          id: string
          is_active: boolean | null
          key_periods: Json | null
          notes: string | null
          priority: string | null
        }
        Insert: {
          created_at?: string | null
          destination_name: string
          id?: string
          is_active?: boolean | null
          key_periods?: Json | null
          notes?: string | null
          priority?: string | null
        }
        Update: {
          created_at?: string | null
          destination_name?: string
          id?: string
          is_active?: boolean | null
          key_periods?: Json | null
          notes?: string | null
          priority?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          availability: boolean | null
          category: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          external_id: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          name: string
          original_price: number | null
          price: number | null
          scraped_at: string | null
          url: string
        }
        Insert: {
          availability?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name: string
          original_price?: number | null
          price?: number | null
          scraped_at?: string | null
          url: string
        }
        Update: {
          availability?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name?: string
          original_price?: number | null
          price?: number | null
          scraped_at?: string | null
          url?: string
        }
        Relationships: []
      }
      public_conversations: {
        Row: {
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          session_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "public_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          products_found: number | null
          products_updated: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          products_found?: number | null
          products_updated?: number | null
          status: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          products_found?: number | null
          products_updated?: number | null
          status?: string
        }
        Relationships: []
      }
      social_trends: {
        Row: {
          caution_notes: string | null
          created_at: string | null
          creative_suggestions: Json | null
          id: string
          is_sensitive: boolean | null
          source: string
          tourism_correlation_score: number | null
          trend_date: string
          trend_name: string
          volume_estimate: number | null
        }
        Insert: {
          caution_notes?: string | null
          created_at?: string | null
          creative_suggestions?: Json | null
          id?: string
          is_sensitive?: boolean | null
          source: string
          tourism_correlation_score?: number | null
          trend_date?: string
          trend_name: string
          volume_estimate?: number | null
        }
        Update: {
          caution_notes?: string | null
          created_at?: string | null
          creative_suggestions?: Json | null
          id?: string
          is_sensitive?: boolean | null
          source?: string
          tourism_correlation_score?: number | null
          trend_date?: string
          trend_name?: string
          volume_estimate?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      archive_old_manual_analyses: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_request_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "moderator"
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
      access_request_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "moderator"],
    },
  },
} as const
