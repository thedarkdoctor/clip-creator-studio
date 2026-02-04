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
      content_jobs: {
        Row: {
          auto_schedule: boolean | null
          company_name: string
          created_at: string
          error_message: string | null
          id: string
          niche: string
          posting_frequency: string | null
          progress: Json | null
          status: string | null
          top_opportunities: string[] | null
          updated_at: string
          user_id: string
          weak_platforms: string[] | null
        }
        Insert: {
          auto_schedule?: boolean | null
          company_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          niche: string
          posting_frequency?: string | null
          progress?: Json | null
          status?: string | null
          top_opportunities?: string[] | null
          updated_at?: string
          user_id: string
          weak_platforms?: string[] | null
        }
        Update: {
          auto_schedule?: boolean | null
          company_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          niche?: string
          posting_frequency?: string | null
          progress?: Json | null
          status?: string | null
          top_opportunities?: string[] | null
          updated_at?: string
          user_id?: string
          weak_platforms?: string[] | null
        }
        Relationships: []
      }
      generated_clips: {
        Row: {
          caption: string | null
          created_at: string
          duration_seconds: number
          hashtags: string[] | null
          id: string
          platform_id: string
          video_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration_seconds: number
          hashtags?: string[] | null
          id?: string
          platform_id: string
          video_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration_seconds?: number
          hashtags?: string[] | null
          id?: string
          platform_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_clips_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_clips_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_intelligence: {
        Row: {
          business_name: string | null
          created_at: string
          id: string
          niche: string | null
          platform_click_breakdown: Json | null
          top_platform: string | null
          total_clicks: number | null
          underperforming_platforms: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          id?: string
          niche?: string | null
          platform_click_breakdown?: Json | null
          top_platform?: string | null
          total_clicks?: number | null
          underperforming_platforms?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          id?: string
          niche?: string | null
          platform_click_breakdown?: Json | null
          top_platform?: string | null
          total_clicks?: number | null
          underperforming_platforms?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platforms: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      scraper_status: {
        Row: {
          id: string
          is_enabled: boolean
          last_error: string | null
          last_run_at: string | null
          last_success_at: string | null
          scraper_name: string
          total_failures: number
          total_runs: number
          total_successes: number
          updated_at: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          scraper_name: string
          total_failures?: number
          total_runs?: number
          total_successes?: number
          updated_at?: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          scraper_name?: string
          total_failures?: number
          total_runs?: number
          total_successes?: number
          updated_at?: string
        }
        Relationships: []
      }
      trend_hashtags: {
        Row: {
          created_at: string
          frequency_score: number
          hashtag: string
          id: string
          trend_id: string
        }
        Insert: {
          created_at?: string
          frequency_score?: number
          hashtag: string
          id?: string
          trend_id: string
        }
        Update: {
          created_at?: string
          frequency_score?: number
          hashtag?: string
          id?: string
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_hashtags_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_metrics: {
        Row: {
          collected_at: string
          comments: number | null
          engagement_rate: number | null
          id: string
          likes: number | null
          shares: number | null
          trend_id: string
          views: number | null
        }
        Insert: {
          collected_at?: string
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          trend_id: string
          views?: number | null
        }
        Update: {
          collected_at?: string
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          trend_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trend_metrics_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_patterns: {
        Row: {
          caption_structure: string | null
          color_grading: string | null
          created_at: string
          editing_style: string | null
          id: string
          intro_type: string | null
          pacing_pattern: string | null
          text_overlay_frequency: string | null
          transition_style: string | null
          trend_id: string
        }
        Insert: {
          caption_structure?: string | null
          color_grading?: string | null
          created_at?: string
          editing_style?: string | null
          id?: string
          intro_type?: string | null
          pacing_pattern?: string | null
          text_overlay_frequency?: string | null
          transition_style?: string | null
          trend_id: string
        }
        Update: {
          caption_structure?: string | null
          color_grading?: string | null
          created_at?: string
          editing_style?: string | null
          id?: string
          intro_type?: string | null
          pacing_pattern?: string | null
          text_overlay_frequency?: string | null
          transition_style?: string | null
          trend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_patterns_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_raw_data: {
        Row: {
          error: string | null
          id: string
          processed: boolean
          processed_trend_id: string | null
          raw_payload: Json
          scraped_at: string
          source: string
        }
        Insert: {
          error?: string | null
          id?: string
          processed?: boolean
          processed_trend_id?: string | null
          raw_payload: Json
          scraped_at?: string
          source: string
        }
        Update: {
          error?: string | null
          id?: string
          processed?: boolean
          processed_trend_id?: string | null
          raw_payload?: Json
          scraped_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_raw_data_processed_trend_id_fkey"
            columns: ["processed_trend_id"]
            isOneToOne: false
            referencedRelation: "trends_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      trends: {
        Row: {
          created_at: string
          description: string | null
          engagement: string | null
          id: string
          is_active: boolean
          platform_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          engagement?: string | null
          id?: string
          is_active?: boolean
          platform_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          engagement?: string | null
          id?: string
          is_active?: boolean
          platform_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "trends_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      trends_v2: {
        Row: {
          audio_name: string | null
          avg_duration: number | null
          created_at: string
          description: string | null
          duration_range_max: number | null
          duration_range_min: number | null
          format_type: Database["public"]["Enums"]["trend_format_type"] | null
          hook_style: string | null
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["trend_platform"]
          source_url: string
          title: string
          trend_score: number
          updated_at: string
        }
        Insert: {
          audio_name?: string | null
          avg_duration?: number | null
          created_at?: string
          description?: string | null
          duration_range_max?: number | null
          duration_range_min?: number | null
          format_type?: Database["public"]["Enums"]["trend_format_type"] | null
          hook_style?: string | null
          id?: string
          is_active?: boolean
          platform: Database["public"]["Enums"]["trend_platform"]
          source_url: string
          title: string
          trend_score?: number
          updated_at?: string
        }
        Update: {
          audio_name?: string | null
          avg_duration?: number | null
          created_at?: string
          description?: string | null
          duration_range_max?: number | null
          duration_range_min?: number | null
          format_type?: Database["public"]["Enums"]["trend_format_type"] | null
          hook_style?: string | null
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["trend_platform"]
          source_url?: string
          title?: string
          trend_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_platforms: {
        Row: {
          created_at: string
          id: string
          platform_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_platforms_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trends: {
        Row: {
          created_at: string
          id: string
          trend_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          trend_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          trend_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trends_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          brand_name: string | null
          created_at: string
          id: string
          niche: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          id: string
          niche?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          id?: string
          niche?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          file_name: string
          id: string
          status: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          status?: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          status?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      trend_format_type:
        | "pov"
        | "transformation"
        | "tutorial"
        | "meme"
        | "storytime"
        | "relatable"
        | "aesthetic"
        | "challenge"
        | "other"
      trend_platform:
        | "tiktok"
        | "instagram"
        | "youtube"
        | "twitter"
        | "facebook"
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
      trend_format_type: [
        "pov",
        "transformation",
        "tutorial",
        "meme",
        "storytime",
        "relatable",
        "aesthetic",
        "challenge",
        "other",
      ],
      trend_platform: ["tiktok", "instagram", "youtube", "twitter", "facebook"],
    },
  },
} as const
