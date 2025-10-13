-- Disable automatic point triggers completely
-- The backend now handles all point updates manually (both 1 and 2 mechanics)

DROP TRIGGER IF EXISTS trigger_add_points_on_completion ON tasks;
DROP TRIGGER IF EXISTS trigger_remove_points_on_uncompletion ON tasks;

-- Keep the functions for reference but they won't be called
-- (We're not dropping them in case we need to rollback)
