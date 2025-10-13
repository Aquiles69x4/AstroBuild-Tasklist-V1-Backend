-- Force remove ALL mechanic point-related triggers and functions
-- This ensures no automatic point updates happen in the background

-- Drop trigger that updates mechanic points
DROP TRIGGER IF EXISTS trigger_update_mechanic_points ON tasks;

-- Drop the function that the trigger calls
DROP FUNCTION IF EXISTS update_mechanic_points();

-- Also drop any other variations that might exist
DROP TRIGGER IF EXISTS trigger_add_points_on_completion ON tasks;
DROP TRIGGER IF EXISTS trigger_remove_points_on_uncompletion ON tasks;
DROP FUNCTION IF EXISTS add_points_on_completion();
DROP FUNCTION IF EXISTS remove_points_on_uncompletion();

-- Verify triggers are removed (this will show in migration logs)
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name IN (
    'trigger_update_mechanic_points',
    'trigger_add_points_on_completion',
    'trigger_remove_points_on_uncompletion'
  );

  IF trigger_count > 0 THEN
    RAISE NOTICE 'WARNING: % mechanic point trigger(s) still exist!', trigger_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All mechanic point triggers removed';
  END IF;
END $$;
