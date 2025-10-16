-- Migration 013: Add pause/resume functionality for lunch breaks
-- Adds columns to track paused time in punches and creates pause history table

-- Add pause tracking columns to punches table
ALTER TABLE punches
  ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_pause_start TIMESTAMP;

-- Create table to track pause history (lunch breaks, etc.)
CREATE TABLE IF NOT EXISTS punch_pauses (
  id SERIAL PRIMARY KEY,
  punch_id INTEGER NOT NULL REFERENCES punches(id) ON DELETE CASCADE,
  pause_start TIMESTAMP NOT NULL,
  pause_end TIMESTAMP,
  duration_seconds INTEGER,
  reason TEXT DEFAULT 'lunch',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_punch_pauses_punch_id ON punch_pauses(punch_id);
CREATE INDEX IF NOT EXISTS idx_punch_pauses_pause_start ON punch_pauses(pause_start);

-- Update the calculate_punch_hours trigger to subtract paused time
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_calculate_punch_hours ON punches;
DROP FUNCTION IF EXISTS calculate_punch_hours();

-- Recreate function with pause time subtraction
CREATE OR REPLACE FUNCTION calculate_punch_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if punch_out is set
    IF NEW.punch_out IS NOT NULL THEN
        -- Calculate total hours: (punch_out - punch_in) - total_paused_seconds
        -- Convert to hours and round to 2 decimal places
        NEW.total_hours = ROUND(
            (EXTRACT(EPOCH FROM (NEW.punch_out - NEW.punch_in)) - COALESCE(NEW.total_paused_seconds, 0)) / 3600.0,
            2
        );

        -- Mark as completed
        NEW.status = 'completed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_calculate_punch_hours
    BEFORE UPDATE OF punch_out ON punches
    FOR EACH ROW
    EXECUTE FUNCTION calculate_punch_hours();

-- Add comment for documentation
COMMENT ON COLUMN punches.total_paused_seconds IS 'Total accumulated pause time in seconds (e.g., lunch breaks)';
COMMENT ON COLUMN punches.current_pause_start IS 'Timestamp when current pause started (NULL if not paused)';
COMMENT ON TABLE punch_pauses IS 'Historical record of all pauses during punch sessions';
