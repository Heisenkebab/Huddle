export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      guest_trip: {
        Row: {
          id: string;
          profile_id: string;
          trip_id: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          trip_id: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_trip_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guest_trip_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trip";
            referencedColumns: ["id"];
          },
        ];
      };
      profile: {
        Row: {
          color: string;
          created_at: string;
          emoji: string | null;
          id: string;
          image_url: string | null;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color: string;
          created_at?: string;
          emoji?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          emoji?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      shopping_list_history: {
        Row: {
          amount: number;
          bought_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          removed_at: string | null;
          shopping_list_item_id: string;
          unit: Database["public"]["Enums"]["Unit"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          amount: number;
          bought_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          removed_at?: string | null;
          shopping_list_item_id: string;
          unit: Database["public"]["Enums"]["Unit"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number;
          bought_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          removed_at?: string | null;
          shopping_list_item_id?: string;
          unit?: Database["public"]["Enums"]["Unit"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_history_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_list_history_shopping_list_item_id_fkey";
            columns: ["shopping_list_item_id"];
            isOneToOne: false;
            referencedRelation: "shopping_list_item";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_list_history_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_list_item: {
        Row: {
          category: Database["public"]["Enums"]["Category"];
          created_at: string;
          id: string;
          name: string;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["Category"];
          created_at?: string;
          id?: string;
          name: string;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["Category"];
          created_at?: string;
          id?: string;
          name?: string;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_item_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trip";
            referencedColumns: ["id"];
          },
        ];
      };
      trip: {
        Row: {
          end_date: string;
          id: string;
          name: string;
          owner_id: string;
          start_date: string;
        };
        Insert: {
          end_date: string;
          id?: string;
          name: string;
          owner_id: string;
          start_date: string;
        };
        Update: {
          end_date?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_invite: {
        Row: {
          created_at: string;
          ending_at: string;
          id: string;
          invite_id: string;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          ending_at?: string;
          id?: string;
          invite_id: string;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          ending_at?: string;
          id?: string;
          invite_id?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_invite_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trip";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_shopping_list_item: {
        Args: {
          p_amount: number;
          p_category: Database["public"]["Enums"]["Category"];
          p_name: string;
          p_trip_id: string;
          p_unit: Database["public"]["Enums"]["Unit"];
        };
        Returns: {
          amount: number;
          category: Database["public"]["Enums"]["Category"];
          id: string;
          merged: boolean;
          name: string;
          shopping_list_item_id: string;
          unit: Database["public"]["Enums"]["Unit"];
        }[];
      };
      current_profile_id: { Args: Record<PropertyKey, never>; Returns: string };
      get_all_active_shopping_list_items: {
        Args: { p_trip_id: string };
        Returns: {
          amount: number;
          bought_at: string;
          category: Database["public"]["Enums"]["Category"];
          created_at: string;
          created_by: string;
          created_by_color: string;
          created_by_name: string;
          id: string;
          name: string;
          trip_id: string;
          unit: Database["public"]["Enums"]["Unit"];
          updated_at: string;
          updated_by: string;
          updated_by_color: string;
          updated_by_name: string;
        }[];
      };
      is_anonymous_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_trip_member: { Args: { p_trip_id: string }; Returns: boolean };
      is_trip_owner: { Args: { p_trip_id: string }; Returns: boolean };
      is_valid_amount: {
        Args: { p_amount: number; p_unit: Database["public"]["Enums"]["Unit"] };
        Returns: boolean;
      };
      remove_shopping_list_item: {
        Args: { p_item_id: string; p_trip_id: string };
        Returns: undefined;
      };
      set_shopping_list_item_bought: {
        Args: { p_bought: boolean; p_item_id: string; p_trip_id: string };
        Returns: undefined;
      };
      shares_trip_with: { Args: { p_profile_id: string }; Returns: boolean };
      unit_factor: {
        Args: { p_unit: Database["public"]["Enums"]["Unit"] };
        Returns: number;
      };
      unit_group: {
        Args: { p_unit: Database["public"]["Enums"]["Unit"] };
        Returns: string;
      };
      update_shopping_list_item: {
        Args: {
          p_amount?: number;
          p_category?: Database["public"]["Enums"]["Category"];
          p_item_id: string;
          p_name?: string;
          p_trip_id: string;
          p_unit?: Database["public"]["Enums"]["Unit"];
        };
        Returns: {
          amount: number;
          category: Database["public"]["Enums"]["Category"];
          id: string;
          name: string;
          shopping_list_item_id: string;
          unit: Database["public"]["Enums"]["Unit"];
        }[];
      };
    };
    Enums: {
      Category: "PRODUCE" | "CHILLED" | "BAKERY" | "DRINKS" | "BBQ" | "OTHER";
      Unit: "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "AMOUNT";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      Category: ["PRODUCE", "CHILLED", "BAKERY", "DRINKS", "BBQ", "OTHER"],
      Unit: ["KILOGRAM", "GRAM", "LITER", "MILLILITER", "AMOUNT"],
    },
  },
} as const;
