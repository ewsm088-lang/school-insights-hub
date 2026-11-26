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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_data: {
        Row: {
          created_at: string
          id: string
          nota: number
          nota_max: number
          nota_min: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nota: number
          nota_max?: number
          nota_min?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nota?: number
          nota_max?: number
          nota_min?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_data_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          ano_letivo: number
          created_at: string
          id: string
          nome_turma: string
          school_id: string
          serie: string
        }
        Insert: {
          ano_letivo?: number
          created_at?: string
          id?: string
          nome_turma: string
          school_id: string
          serie: string
        }
        Update: {
          ano_letivo?: number
          created_at?: string
          id?: string
          nome_turma?: string
          school_id?: string
          serie?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      credes: {
        Row: {
          cidade_sede: string
          created_at: string
          id: string
          nome: string
          numero: number
        }
        Insert: {
          cidade_sede: string
          created_at?: string
          id?: string
          nome: string
          numero: number
        }
        Update: {
          cidade_sede?: string
          created_at?: string
          id?: string
          nome?: string
          numero?: number
        }
        Relationships: []
      }
      observacoes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          student_id: string
          texto: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          student_id: string
          texto: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          student_id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          cidade: string
          created_at: string
          crede_id: string
          id: string
          inep: string | null
          nome: string
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          cidade: string
          created_at?: string
          crede_id: string
          id?: string
          inep?: string | null
          nome: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          crede_id?: string
          id?: string
          inep?: string | null
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_crede_id_fkey"
            columns: ["crede_id"]
            isOneToOne: false
            referencedRelation: "credes"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string
          codigo_aluno: string
          created_at: string
          id: string
          nome: string | null
        }
        Insert: {
          class_id: string
          codigo_aluno: string
          created_at?: string
          id?: string
          nome?: string | null
        }
        Update: {
          class_id?: string
          codigo_aluno?: string
          created_at?: string
          id?: string
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          e01: number
          e02: number
          e03: number
          e04: number
          e05: number
          e06: number
          e07: number
          e08: number
          e09: number
          e10: number
          e11: number
          e12: number
          e13: number
          e14: number
          e15: number
          e16: number
          e17: number
          e18: number
          e19: number
          e20: number
          id: string
          s01: number
          s02: number
          s03: number
          s04: number
          s05: number
          s06: number
          s07: number
          s08: number
          s09: number
          s10: number
          s11: number
          s12: number
          s13: number
          s14: number
          s15: number
          s16: number
          s17: number
          s18: number
          s19: number
          s20: number
          student_id: string
          submitted_at: string
        }
        Insert: {
          e01?: number
          e02?: number
          e03?: number
          e04?: number
          e05?: number
          e06?: number
          e07?: number
          e08?: number
          e09?: number
          e10?: number
          e11?: number
          e12?: number
          e13?: number
          e14?: number
          e15?: number
          e16?: number
          e17?: number
          e18?: number
          e19?: number
          e20?: number
          id?: string
          s01?: number
          s02?: number
          s03?: number
          s04?: number
          s05?: number
          s06?: number
          s07?: number
          s08?: number
          s09?: number
          s10?: number
          s11?: number
          s12?: number
          s13?: number
          s14?: number
          s15?: number
          s16?: number
          s17?: number
          s18?: number
          s19?: number
          s20?: number
          student_id: string
          submitted_at?: string
        }
        Update: {
          e01?: number
          e02?: number
          e03?: number
          e04?: number
          e05?: number
          e06?: number
          e07?: number
          e08?: number
          e09?: number
          e10?: number
          e11?: number
          e12?: number
          e13?: number
          e14?: number
          e15?: number
          e16?: number
          e17?: number
          e18?: number
          e19?: number
          e20?: number
          id?: string
          s01?: number
          s02?: number
          s03?: number
          s04?: number
          s05?: number
          s06?: number
          s07?: number
          s08?: number
          s09?: number
          s10?: number
          s11?: number
          s12?: number
          s13?: number
          s14?: number
          s15?: number
          s16?: number
          s17?: number
          s18?: number
          s19?: number
          s20?: number
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_public_credes: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          numero: number
          nome: string
          cidade_sede: string
        }[]
      }
      list_public_schools: {
        Args: {
          p_crede_id?: string | null
          p_school_id?: string | null
        }
        Returns: {
          id: string
          nome: string
          crede_id: string
        }[]
      }
      list_public_classes: {
        Args: {
          p_school_id: string
        }
        Returns: {
          id: string
          nome_turma: string
          serie: string
        }[]
      }
      submit_survey_response: {
        Args: {
          p_answers: Json
          p_class_id: string
          p_codigo_aluno: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "school_responsible"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "school_responsible"],
    },
  },
} as const
