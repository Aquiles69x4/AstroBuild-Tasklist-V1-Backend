-- Remove foreign key constraint to allow multiple mechanics format (comma-separated)
-- This allows assigned_mechanic to contain values like "IgenieroErick,ChristianCobra"
-- The backend will handle validation and point division manually

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_assigned_mechanic_fkey;
