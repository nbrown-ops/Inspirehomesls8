-- =============================================
-- Fix audit_profile_changes trigger column names
-- Migration: 00008_fix_audit_trigger
-- =============================================

-- The trigger used wrong column names (actor_id, target_type, target_id, metadata)
-- The actual audit_logs table uses: user_id, table_name, record_id, new_values

CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
      auth.uid(),
      'role_change',
      'profiles',
      NEW.id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profile_changes ON profiles;
CREATE TRIGGER trg_audit_profile_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_profile_changes();
