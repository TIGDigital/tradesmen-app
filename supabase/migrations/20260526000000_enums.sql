-- Enums from 02_Technical_Architecture_and_DB_Schema.md §2.2
-- First migration: types only. Tables come in a follow-up migration.

create type user_role as enum ('customer', 'tradesman', 'apprentice', 'admin');

create type trade_type as enum (
  'builder', 'kitchen_fitter', 'bathroom_fitter', 'electrician',
  'plumber', 'roofer', 'plasterer', 'painter_decorator',
  'landscaper', 'tiler', 'carpenter', 'flooring', 'hvac', 'general', 'other'
);

create type project_status as enum (
  'quote_sent',          -- Awaiting customer approval of quote
  'scheduled',           -- Approved, start date set, not started
  'materials_ordered',   -- Materials lead time blocking start
  'in_progress',         -- Active work happening
  'delayed',             -- Off track with a reason recorded
  'awaiting_approval',   -- Tradesman needs customer sign-off (e.g. milestone)
  'awaiting_inspection', -- Pending third-party inspection (Building Control etc.)
  'completed'            -- Final invoice paid, review prompted
);

create type milestone_status as enum (
  'pending', 'in_progress', 'awaiting_approval', 'completed', 'skipped'
);

create type update_type as enum (
  'progress',     -- standard "here's what happened today" update
  'milestone',    -- auto-generated when a milestone changes state
  'status',       -- auto-generated when project status changes
  'eta',          -- "on my way" / arrival update
  'delay',        -- delay notification with reason
  'system'        -- system messages e.g. "Customer joined the project"
);

create type message_type as enum ('text', 'photo', 'voice', 'system');

create type invoice_status as enum (
  'draft', 'sent', 'approved', 'paid', 'overdue', 'void', 'refunded'
);

create type invoice_kind as enum ('quote', 'deposit', 'milestone', 'final');

create type notification_kind as enum (
  'new_update', 'new_message', 'status_change', 'milestone_complete',
  'eta_arrival', 'invoice_sent', 'invoice_paid', 'review_requested',
  'project_invite', 'nudge',
  'arrived_at_site',          -- tradesman/apprentice entered a project geofence
  'left_site',                -- they left it
  'leave_site_nudge',         -- prompt to send End-of-Day update
  'apprentice_update_pending' -- apprentice update awaiting lead approval
);

create type location_event_kind as enum (
  'arrived_at_site',
  'left_site',
  'home_geofence_set',         -- diagnostic: customer's home anchor created
  'manual_on_my_way'           -- fallback when geofence misses (signal/battery)
);

create type consent_purpose as enum (
  'location_geofence',         -- arrival/left events on project sites
  'location_home_anchor',      -- customer's home address geofence
  'push_notifications',
  'analytics',
  'marketing_email'
);

create type consent_status as enum ('granted', 'denied', 'revoked');

create type delay_reason as enum (
  'weather', 'materials', 'other_trade', 'customer_change',
  'illness', 'inspection', 'other'
);

create type reaction_kind as enum ('thumbs_up', 'question', 'heart');
