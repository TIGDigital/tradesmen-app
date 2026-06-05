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
      apprentice_profiles: {
        Row: {
          created_at: string | null
          employer_code: string | null
          hourly_rate_pence: number | null
          id: string
          lead_tradesman_id: string | null
          share_location_with_lead: boolean | null
          share_shift_logs: boolean | null
          start_date: string | null
          trade_focus: Database["public"]["Enums"]["trade_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employer_code?: string | null
          hourly_rate_pence?: number | null
          id: string
          lead_tradesman_id?: string | null
          share_location_with_lead?: boolean | null
          share_shift_logs?: boolean | null
          start_date?: string | null
          trade_focus?: Database["public"]["Enums"]["trade_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employer_code?: string | null
          hourly_rate_pence?: number | null
          id?: string
          lead_tradesman_id?: string | null
          share_location_with_lead?: boolean | null
          share_shift_logs?: boolean | null
          start_date?: string | null
          trade_focus?: Database["public"]["Enums"]["trade_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apprentice_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apprentice_profiles_lead_tradesman_id_fkey"
            columns: ["lead_tradesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apprentice_update_approvals: {
        Row: {
          apprentice_id: string
          created_at: string | null
          draft_update_id: string
          id: string
          lead_id: string
          project_id: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
        }
        Insert: {
          apprentice_id: string
          created_at?: string | null
          draft_update_id: string
          id?: string
          lead_id: string
          project_id: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
        }
        Update: {
          apprentice_id?: string
          created_at?: string | null
          draft_update_id?: string
          id?: string
          lead_id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprentice_update_approvals_apprentice_id_fkey"
            columns: ["apprentice_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apprentice_update_approvals_draft_update_id_fkey"
            columns: ["draft_update_id"]
            isOneToOne: false
            referencedRelation: "project_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apprentice_update_approvals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apprentice_update_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_invitations: {
        Row: {
          id: string
          project_id: string
          inviter_id: string
          invitee_name: string
          invite_code: string
          role_on_project: string
          created_at: string
          accepted_at: string | null
          accepted_by: string | null
          expires_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          inviter_id: string
          invitee_name: string
          invite_code: string
          role_on_project?: string
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          expires_at?: string
          revoked_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          inviter_id?: string
          invitee_name?: string
          invite_code?: string
          role_on_project?: string
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          expires_at?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          created_at: string | null
          granted_at: string | null
          id: string
          ios_permission_state: string | null
          privacy_policy_version: string | null
          purpose: Database["public"]["Enums"]["consent_purpose"]
          revoked_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["consent_status"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          id?: string
          ios_permission_state?: string | null
          privacy_policy_version?: string | null
          purpose: Database["public"]["Enums"]["consent_purpose"]
          revoked_at?: string | null
          source?: string | null
          status: Database["public"]["Enums"]["consent_status"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          id?: string
          ios_permission_state?: string | null
          privacy_policy_version?: string | null
          purpose?: Database["public"]["Enums"]["consent_purpose"]
          revoked_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string | null
          home_address_line_1: string | null
          home_address_line_2: string | null
          home_city: string | null
          home_geofence_consent: boolean | null
          home_postcode: string | null
          id: string
          notification_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          home_address_line_1?: string | null
          home_address_line_2?: string | null
          home_city?: string | null
          home_geofence_consent?: boolean | null
          home_postcode?: string | null
          id: string
          notification_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          home_address_line_1?: string | null
          home_address_line_2?: string | null
          home_city?: string | null
          home_geofence_consent?: boolean | null
          home_postcode?: string | null
          id?: string
          notification_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          project_id: string | null
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          project_id?: string | null
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          project_id?: string | null
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          total_pence: number
          unit_price_pence: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          total_pence: number
          unit_price_pence: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          total_pence?: number
          unit_price_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string
          customer_id: string | null
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["invoice_kind"]
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          project_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_pence: number
          total_pence: number
          tradesman_id: string
          updated_at: string | null
          vat_pence: number
          vat_rate: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["invoice_kind"]
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          project_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_pence: number
          total_pence: number
          tradesman_id: string
          updated_at?: string | null
          vat_pence: number
          vat_rate?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["invoice_kind"]
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          project_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_pence?: number
          total_pence?: number
          tradesman_id?: string
          updated_at?: string | null
          vat_pence?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tradesman_id_fkey"
            columns: ["tradesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_events: {
        Row: {
          app_state: string | null
          created_at: string | null
          device_id: string | null
          geofence_id: string | null
          id: string
          is_confirmed: boolean | null
          kind: Database["public"]["Enums"]["location_event_kind"]
          occurred_at: string
          project_id: string | null
          superseded_by: string | null
          user_id: string
        }
        Insert: {
          app_state?: string | null
          created_at?: string | null
          device_id?: string | null
          geofence_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          kind: Database["public"]["Enums"]["location_event_kind"]
          occurred_at?: string
          project_id?: string | null
          superseded_by?: string | null
          user_id: string
        }
        Update: {
          app_state?: string | null
          created_at?: string | null
          device_id?: string | null
          geofence_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          kind?: Database["public"]["Enums"]["location_event_kind"]
          occurred_at?: string
          project_id?: string | null
          superseded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_events_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "site_geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_events_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "location_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_duration_ms: number | null
          attachment_url: string | null
          body: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          project_id: string
          read_at: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["user_role"] | null
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          attachment_duration_ms?: number | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          project_id: string
          read_at?: string | null
          sender_id: string
          sender_role?: Database["public"]["Enums"]["user_role"] | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          attachment_duration_ms?: number | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          project_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["user_role"] | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          milestones: Json
          template_name: string
          trade_type: Database["public"]["Enums"]["trade_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          milestones: Json
          template_name: string
          trade_type: Database["public"]["Enums"]["trade_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          milestones?: Json
          template_name?: string
          trade_type?: Database["public"]["Enums"]["trade_type"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          project_id: string | null
          read_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          project_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          project_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nudges: {
        Row: {
          acted_at: string | null
          created_at: string | null
          dismissed_at: string | null
          fired_at: string | null
          id: string
          kind: string
          project_id: string | null
          result_update_id: string | null
          scheduled_for: string
          trigger_event_id: string | null
          user_id: string
        }
        Insert: {
          acted_at?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          fired_at?: string | null
          id?: string
          kind: string
          project_id?: string | null
          result_update_id?: string | null
          scheduled_for: string
          trigger_event_id?: string | null
          user_id: string
        }
        Update: {
          acted_at?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          fired_at?: string | null
          id?: string
          kind?: string
          project_id?: string | null
          result_update_id?: string | null
          scheduled_for?: string
          trigger_event_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_result_update_id_fkey"
            columns: ["result_update_id"]
            isOneToOne: false
            referencedRelation: "project_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_trigger_event_id_fkey"
            columns: ["trigger_event_id"]
            isOneToOne: false
            referencedRelation: "location_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          marketing_opt_in: boolean | null
          phone: string | null
          phone_verified_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          marketing_opt_in?: boolean | null
          phone?: string | null
          phone_verified_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          marketing_opt_in?: boolean | null
          phone?: string | null
          phone_verified_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      project_crew: {
        Row: {
          assigned_at: string | null
          project_id: string
          removed_at: string | null
          role_on_project: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          project_id: string
          removed_at?: string | null
          role_on_project: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          project_id?: string
          removed_at?: string | null
          role_on_project?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_crew_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_crew_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          approved_by_customer_at: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          expected_date: string | null
          expected_start_date: string | null
          id: string
          project_id: string
          requires_customer_approval: boolean | null
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_by_customer_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_date?: string | null
          expected_start_date?: string | null
          id?: string
          project_id: string
          requires_customer_approval?: boolean | null
          sort_order: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_by_customer_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          expected_date?: string | null
          expected_start_date?: string | null
          id?: string
          project_id?: string
          requires_customer_approval?: boolean | null
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          id: string
          project_id: string
          uploader_id: string
          file_name: string
          storage_path: string
          mime_type: string
          size_bytes: number
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          uploader_id: string
          file_name: string
          storage_path: string
          mime_type: string
          size_bytes: number
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          uploader_id?: string
          file_name?: string
          storage_path?: string
          mime_type?: string
          size_bytes?: number
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_snags: {
        Row: {
          id: string
          project_id: string
          reporter_id: string
          title: string
          description: string | null
          location_hint: string | null
          status: Database["public"]["Enums"]["snag_status"]
          resolved_at: string | null
          resolved_by: string | null
          resolution_note: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          reporter_id: string
          title: string
          description?: string | null
          location_hint?: string | null
          status?: Database["public"]["Enums"]["snag_status"]
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_note?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          reporter_id?: string
          title?: string
          description?: string | null
          location_hint?: string | null
          status?: Database["public"]["Enums"]["snag_status"]
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_note?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_snags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_snags_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_snags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_snag_photos: {
        Row: {
          id: string
          snag_id: string
          storage_path: string
          sort_order: number
          kind: string
          created_at: string
        }
        Insert: {
          id?: string
          snag_id: string
          storage_path: string
          sort_order?: number
          kind?: string
          created_at?: string
        }
        Update: {
          id?: string
          snag_id?: string
          storage_path?: string
          sort_order?: number
          kind?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_snag_photos_snag_id_fkey"
            columns: ["snag_id"]
            isOneToOne: false
            referencedRelation: "project_snags"
            referencedColumns: ["id"]
          },
        ]
      }
      project_update_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          deleted_at: string | null
          id: string
          update_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          update_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_update_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_update_comments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "project_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_update_media: {
        Row: {
          blurhash: string | null
          bytes: number | null
          created_at: string | null
          height: number | null
          id: string
          media_type: string
          sort_order: number
          storage_path: string
          update_id: string
          width: number | null
        }
        Insert: {
          blurhash?: string | null
          bytes?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          media_type: string
          sort_order?: number
          storage_path: string
          update_id: string
          width?: number | null
        }
        Update: {
          blurhash?: string | null
          bytes?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          media_type?: string
          sort_order?: number
          storage_path?: string
          update_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_update_media_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "project_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_update_reactions: {
        Row: {
          created_at: string | null
          kind: Database["public"]["Enums"]["reaction_kind"]
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          kind: Database["public"]["Enums"]["reaction_kind"]
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          kind?: Database["public"]["Enums"]["reaction_kind"]
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_update_reactions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "project_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_update_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string
          body: string | null
          created_at: string | null
          delay_new_eta: string | null
          delay_reason: Database["public"]["Enums"]["delay_reason"] | null
          deleted_at: string | null
          edited_at: string | null
          eta_at: string | null
          eta_minutes: number | null
          id: string
          milestone_id: string | null
          project_id: string
          type: Database["public"]["Enums"]["update_type"]
          voice_note_transcript: string | null
          voice_note_url: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string | null
          delay_new_eta?: string | null
          delay_reason?: Database["public"]["Enums"]["delay_reason"] | null
          deleted_at?: string | null
          edited_at?: string | null
          eta_at?: string | null
          eta_minutes?: number | null
          id?: string
          milestone_id?: string | null
          project_id: string
          type?: Database["public"]["Enums"]["update_type"]
          voice_note_transcript?: string | null
          voice_note_url?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string | null
          delay_new_eta?: string | null
          delay_reason?: Database["public"]["Enums"]["delay_reason"] | null
          deleted_at?: string | null
          edited_at?: string | null
          eta_at?: string | null
          eta_minutes?: number | null
          id?: string
          milestone_id?: string | null
          project_id?: string
          type?: Database["public"]["Enums"]["update_type"]
          voice_note_transcript?: string | null
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          address_line_1: string | null
          address_line_2: string | null
          archived_at: string | null
          city: string | null
          cover_photo_url: string | null
          created_at: string | null
          customer_id: string | null
          delay_reason: Database["public"]["Enums"]["delay_reason"] | null
          delay_resolved_eta: string | null
          expected_end_date: string | null
          expected_start_date: string | null
          id: string
          invite_accepted_at: string | null
          invite_code: string | null
          invite_sent_at: string | null
          last_update_at: string | null
          pending_customer_name: string | null
          pending_customer_phone: string | null
          postcode: string | null
          status: Database["public"]["Enums"]["project_status"]
          status_reason: string | null
          title: string
          trade_type: Database["public"]["Enums"]["trade_type"]
          tradesman_id: string
          updated_at: string | null
          what3words: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          archived_at?: string | null
          city?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          delay_reason?: Database["public"]["Enums"]["delay_reason"] | null
          delay_resolved_eta?: string | null
          expected_end_date?: string | null
          expected_start_date?: string | null
          id?: string
          invite_accepted_at?: string | null
          invite_code?: string | null
          invite_sent_at?: string | null
          last_update_at?: string | null
          pending_customer_name?: string | null
          pending_customer_phone?: string | null
          postcode?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          status_reason?: string | null
          title: string
          trade_type: Database["public"]["Enums"]["trade_type"]
          tradesman_id: string
          updated_at?: string | null
          what3words?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          archived_at?: string | null
          city?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          delay_reason?: Database["public"]["Enums"]["delay_reason"] | null
          delay_resolved_eta?: string | null
          expected_end_date?: string | null
          expected_start_date?: string | null
          id?: string
          invite_accepted_at?: string | null
          invite_code?: string | null
          invite_sent_at?: string | null
          last_update_at?: string | null
          pending_customer_name?: string | null
          pending_customer_phone?: string | null
          postcode?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          status_reason?: string | null
          title?: string
          trade_type?: Database["public"]["Enums"]["trade_type"]
          tradesman_id?: string
          updated_at?: string | null
          what3words?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tradesman_id_fkey"
            columns: ["tradesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_id: string | null
          id: string
          last_used_at: string | null
          platform: string | null
          token: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          last_used_at?: string | null
          platform?: string | null
          token: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          last_used_at?: string | null
          platform?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_public: boolean | null
          project_id: string
          rating: number
          tradesman_id: string
          tradesman_responded_at: string | null
          tradesman_response: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_public?: boolean | null
          project_id: string
          rating: number
          tradesman_id: string
          tradesman_responded_at?: string | null
          tradesman_response?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_public?: boolean | null
          project_id?: string
          rating?: number
          tradesman_id?: string
          tradesman_responded_at?: string | null
          tradesman_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tradesman_id_fkey"
            columns: ["tradesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_geofences: {
        Row: {
          active: boolean | null
          address_label: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          kind: string
          latitude: number
          longitude: number
          project_id: string | null
          radius_meters: number
          updated_at: string | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          active?: boolean | null
          address_label?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          kind: string
          latitude: number
          longitude: number
          project_id?: string | null
          radius_meters?: number
          updated_at?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          active?: boolean | null
          address_label?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          kind?: string
          latitude?: number
          longitude?: number
          project_id?: string | null
          radius_meters?: number
          updated_at?: string | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_geofences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_geofences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tradesman_profiles: {
        Row: {
          avg_rating: number | null
          bio: string | null
          business_name: string
          completed_projects: number | null
          created_at: string | null
          cscs_card_number: string | null
          gas_safe_number: string | null
          id: string
          insurance_expiry: string | null
          insurance_provider: string | null
          logo_url: string | null
          niceic_number: string | null
          primary_trade: Database["public"]["Enums"]["trade_type"]
          secondary_trades: Database["public"]["Enums"]["trade_type"][] | null
          service_postcodes: string[] | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_payouts_enabled: boolean | null
          subscription_period_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          total_projects: number | null
          total_reviews: number | null
          updated_at: string | null
          utr_number: string | null
          vat_number: string | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
          years_trading: number | null
        }
        Insert: {
          avg_rating?: number | null
          bio?: string | null
          business_name: string
          completed_projects?: number | null
          created_at?: string | null
          cscs_card_number?: string | null
          gas_safe_number?: string | null
          id: string
          insurance_expiry?: string | null
          insurance_provider?: string | null
          logo_url?: string | null
          niceic_number?: string | null
          primary_trade: Database["public"]["Enums"]["trade_type"]
          secondary_trades?: Database["public"]["Enums"]["trade_type"][] | null
          service_postcodes?: string[] | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_projects?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          utr_number?: string | null
          vat_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          years_trading?: number | null
        }
        Update: {
          avg_rating?: number | null
          bio?: string | null
          business_name?: string
          completed_projects?: number | null
          created_at?: string | null
          cscs_card_number?: string | null
          gas_safe_number?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_provider?: string | null
          logo_url?: string | null
          niceic_number?: string | null
          primary_trade?: Database["public"]["Enums"]["trade_type"]
          secondary_trades?: Database["public"]["Enums"]["trade_type"][] | null
          service_postcodes?: string[] | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_projects?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          utr_number?: string | null
          vat_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          years_trading?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tradesman_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tradesman_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_project_crew: { Args: { p_id: string }; Returns: boolean }
      is_project_participant: { Args: { p_id: string }; Returns: boolean }
      is_project_tradesman: { Args: { p_id: string }; Returns: boolean }
    }
    Enums: {
      consent_purpose:
        | "location_geofence"
        | "location_home_anchor"
        | "push_notifications"
        | "analytics"
        | "marketing_email"
      consent_status: "granted" | "denied" | "revoked"
      delay_reason:
        | "weather"
        | "materials"
        | "other_trade"
        | "customer_change"
        | "illness"
        | "inspection"
        | "other"
      invoice_kind: "quote" | "deposit" | "milestone" | "final"
      invoice_status:
        | "draft"
        | "sent"
        | "approved"
        | "paid"
        | "overdue"
        | "void"
        | "refunded"
      location_event_kind:
        | "arrived_at_site"
        | "left_site"
        | "home_geofence_set"
        | "manual_on_my_way"
      message_type: "text" | "photo" | "voice" | "system"
      milestone_status:
        | "pending"
        | "in_progress"
        | "awaiting_approval"
        | "completed"
        | "skipped"
      notification_kind:
        | "new_update"
        | "new_message"
        | "status_change"
        | "milestone_complete"
        | "eta_arrival"
        | "invoice_sent"
        | "invoice_paid"
        | "review_requested"
        | "project_invite"
        | "nudge"
        | "arrived_at_site"
        | "left_site"
        | "leave_site_nudge"
        | "apprentice_update_pending"
      project_status:
        | "quote_sent"
        | "scheduled"
        | "materials_ordered"
        | "in_progress"
        | "delayed"
        | "awaiting_approval"
        | "awaiting_inspection"
        | "completed"
      reaction_kind: "thumbs_up" | "question" | "heart"
      snag_status: "open" | "in_progress" | "resolved"
      trade_type:
        | "builder"
        | "kitchen_fitter"
        | "bathroom_fitter"
        | "electrician"
        | "plumber"
        | "roofer"
        | "plasterer"
        | "painter_decorator"
        | "landscaper"
        | "tiler"
        | "carpenter"
        | "flooring"
        | "hvac"
        | "general"
        | "other"
      update_type:
        | "progress"
        | "milestone"
        | "status"
        | "eta"
        | "delay"
        | "system"
      user_role: "customer" | "tradesman" | "apprentice" | "admin"
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
      consent_purpose: [
        "location_geofence",
        "location_home_anchor",
        "push_notifications",
        "analytics",
        "marketing_email",
      ],
      consent_status: ["granted", "denied", "revoked"],
      delay_reason: [
        "weather",
        "materials",
        "other_trade",
        "customer_change",
        "illness",
        "inspection",
        "other",
      ],
      invoice_kind: ["quote", "deposit", "milestone", "final"],
      invoice_status: [
        "draft",
        "sent",
        "approved",
        "paid",
        "overdue",
        "void",
        "refunded",
      ],
      location_event_kind: [
        "arrived_at_site",
        "left_site",
        "home_geofence_set",
        "manual_on_my_way",
      ],
      message_type: ["text", "photo", "voice", "system"],
      milestone_status: [
        "pending",
        "in_progress",
        "awaiting_approval",
        "completed",
        "skipped",
      ],
      notification_kind: [
        "new_update",
        "new_message",
        "status_change",
        "milestone_complete",
        "eta_arrival",
        "invoice_sent",
        "invoice_paid",
        "review_requested",
        "project_invite",
        "nudge",
        "arrived_at_site",
        "left_site",
        "leave_site_nudge",
        "apprentice_update_pending",
      ],
      project_status: [
        "quote_sent",
        "scheduled",
        "materials_ordered",
        "in_progress",
        "delayed",
        "awaiting_approval",
        "awaiting_inspection",
        "completed",
      ],
      reaction_kind: ["thumbs_up", "question", "heart"],
      snag_status: ["open", "in_progress", "resolved"],
      trade_type: [
        "builder",
        "kitchen_fitter",
        "bathroom_fitter",
        "electrician",
        "plumber",
        "roofer",
        "plasterer",
        "painter_decorator",
        "landscaper",
        "tiler",
        "carpenter",
        "flooring",
        "hvac",
        "general",
        "other",
      ],
      update_type: [
        "progress",
        "milestone",
        "status",
        "eta",
        "delay",
        "system",
      ],
      user_role: ["customer", "tradesman", "apprentice", "admin"],
    },
  },
} as const
