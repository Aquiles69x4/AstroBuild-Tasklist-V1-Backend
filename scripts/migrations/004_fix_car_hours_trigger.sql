-- Fix: Car work sessions hours trigger
-- Only auto-calculate hours if total_hours was not explicitly set

-- Drop old trigger
DROP TRIGGER IF EXISTS trigger_calculate_car_work_hours ON car_work_sessions;

-- Updated function that respects manual total_hours
CREATE OR REPLACE FUNCTION calculate_car_work_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-calculate if end_time is set AND total_hours was NOT explicitly provided
    IF NEW.end_time IS NOT NULL AND (NEW.total_hours IS NULL OR NEW.total_hours = OLD.total_hours) THEN
        NEW.total_hours = ROUND(
            EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0,
            2
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate trigger
CREATE TRIGGER trigger_calculate_car_work_hours
    BEFORE UPDATE OF end_time ON car_work_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_car_work_hours();
