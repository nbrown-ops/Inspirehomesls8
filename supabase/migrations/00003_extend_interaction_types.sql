-- =============================================
-- INSPIRE HOMES — Extend interaction_type enum
-- Migration: 00003_extend_interaction_types
-- Adds types requested by prompt 6
-- =============================================

ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'safeguarding_concern';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'positive_achievement';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'community_activity';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'medical_appointment';

-- Enable Supabase Realtime on interaction_timeline
-- (run in Supabase dashboard → Database → Replication, or via CLI)
alter publication supabase_realtime add table interaction_timeline;
