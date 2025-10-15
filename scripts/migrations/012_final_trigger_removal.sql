-- Final removal of trigger_update_mechanic_points
-- This trigger was causing point duplication for single mechanics
-- Points are now handled exclusively in the backend code (routes/tasks.js)
--
-- The backend handles:
-- 1. Single mechanic: Full points (manually in tasks.js)
-- 2. Two mechanics: Divided points (manually in tasks.js)
--
-- Applied on: 2025-10-15

-- Drop the trigger (if it still exists)
DROP TRIGGER IF EXISTS trigger_update_mechanic_points ON tasks CASCADE;

-- Drop the function (if it still exists)
DROP FUNCTION IF EXISTS update_mechanic_points() CASCADE;

-- Verification query to ensure removal
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check for trigger
  SELECT COUNT(*)
  INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_update_mechanic_points'
    AND event_object_schema = 'public';

  -- Check for function
  SELECT COUNT(*)
  INTO function_count
  FROM information_schema.routines
  WHERE routine_name = 'update_mechanic_points'
    AND routine_schema = 'public';

  IF trigger_count > 0 THEN
    RAISE EXCEPTION 'Trigger trigger_update_mechanic_points still exists after removal attempt!';
  END IF;

  IF function_count > 0 THEN
    RAISE EXCEPTION 'Function update_mechanic_points() still exists after removal attempt!';
  END IF;

  RAISE NOTICE '✅ SUCCESS: Both trigger and function have been completely removed';
  RAISE NOTICE '✅ Points are now handled exclusively by backend code';
END $$;
