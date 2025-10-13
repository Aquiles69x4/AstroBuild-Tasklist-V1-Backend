-- Remove the trigger_update_mechanic_points trigger and function
-- This trigger was causing point duplication for single mechanics
-- Points are now handled manually in the backend code (routes/tasks.js)

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_update_mechanic_points ON tasks CASCADE;

-- Drop the function
DROP FUNCTION IF EXISTS update_mechanic_points() CASCADE;

-- Verify removal
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check for trigger
  SELECT COUNT(*)
  INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_update_mechanic_points';

  -- Check for function
  SELECT COUNT(*)
  INTO function_count
  FROM information_schema.routines
  WHERE routine_name = 'update_mechanic_points';

  IF trigger_count > 0 THEN
    RAISE NOTICE 'WARNING: trigger_update_mechanic_points still exists!';
  ELSE
    RAISE NOTICE 'SUCCESS: trigger_update_mechanic_points removed';
  END IF;

  IF function_count > 0 THEN
    RAISE NOTICE 'WARNING: update_mechanic_points() function still exists!';
  ELSE
    RAISE NOTICE 'SUCCESS: update_mechanic_points() function removed';
  END IF;
END $$;
