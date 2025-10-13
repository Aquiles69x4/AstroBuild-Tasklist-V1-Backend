-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trigger_add_points_on_completion ON tasks;
DROP TRIGGER IF EXISTS trigger_remove_points_on_uncompletion ON tasks;
DROP FUNCTION IF EXISTS add_points_on_completion();
DROP FUNCTION IF EXISTS remove_points_on_uncompletion();

-- Function to add points ONLY for single mechanics (no comma)
CREATE OR REPLACE FUNCTION add_points_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed'
       AND NEW.assigned_mechanic IS NOT NULL
       AND NEW.assigned_mechanic NOT LIKE '%,%' THEN
        UPDATE mechanics
        SET total_points = total_points + NEW.points,
            total_tasks = total_tasks + 1
        WHERE name = NEW.assigned_mechanic;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to remove points ONLY for single mechanics (no comma)
CREATE OR REPLACE FUNCTION remove_points_on_uncompletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'completed' AND NEW.status != 'completed'
       AND NEW.assigned_mechanic IS NOT NULL
       AND NEW.assigned_mechanic NOT LIKE '%,%' THEN
        UPDATE mechanics
        SET total_points = total_points - NEW.points,
            total_tasks = total_tasks - 1
        WHERE name = NEW.assigned_mechanic;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_add_points_on_completion
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION add_points_on_completion();

CREATE TRIGGER trigger_remove_points_on_uncompletion
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION remove_points_on_uncompletion();
