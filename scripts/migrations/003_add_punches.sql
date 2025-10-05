-- Punches Migration: Time clock system for employees
-- This migration adds tables to track employee work hours and car-specific work sessions

-- Punches table: Main time clock entries (punch in/out)
CREATE TABLE IF NOT EXISTS punches (
    id SERIAL PRIMARY KEY,
    mechanic_name TEXT NOT NULL REFERENCES mechanics(name),
    punch_in TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    punch_out TIMESTAMP,
    total_hours DECIMAL(5,2), -- Calculated hours (e.g., 8.50 for 8.5 hours)
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Car work sessions: Track time spent on each car
CREATE TABLE IF NOT EXISTS car_work_sessions (
    id SERIAL PRIMARY KEY,
    punch_id INTEGER NOT NULL REFERENCES punches(id) ON DELETE CASCADE,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    mechanic_name TEXT NOT NULL REFERENCES mechanics(name),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    total_hours DECIMAL(5,2), -- Calculated hours for this car
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_punches_mechanic ON punches(mechanic_name);
CREATE INDEX IF NOT EXISTS idx_punches_date ON punches(date);
CREATE INDEX IF NOT EXISTS idx_punches_status ON punches(status);
CREATE INDEX IF NOT EXISTS idx_car_work_sessions_punch ON car_work_sessions(punch_id);
CREATE INDEX IF NOT EXISTS idx_car_work_sessions_car ON car_work_sessions(car_id);
CREATE INDEX IF NOT EXISTS idx_car_work_sessions_mechanic ON car_work_sessions(mechanic_name);

-- Triggers to update timestamps
DROP TRIGGER IF EXISTS trigger_update_punches_timestamp ON punches;
CREATE TRIGGER trigger_update_punches_timestamp
    BEFORE UPDATE ON punches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_car_work_sessions_timestamp ON car_work_sessions;
CREATE TRIGGER trigger_update_car_work_sessions_timestamp
    BEFORE UPDATE ON car_work_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total hours for punch
CREATE OR REPLACE FUNCTION calculate_punch_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.punch_out IS NOT NULL THEN
        NEW.total_hours = ROUND(
            EXTRACT(EPOCH FROM (NEW.punch_out - NEW.punch_in)) / 3600.0,
            2
        );
        NEW.status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-calculate punch hours on punch_out
DROP TRIGGER IF EXISTS trigger_calculate_punch_hours ON punches;
CREATE TRIGGER trigger_calculate_punch_hours
    BEFORE UPDATE OF punch_out ON punches
    FOR EACH ROW
    EXECUTE FUNCTION calculate_punch_hours();

-- Function to calculate total hours for car work session
CREATE OR REPLACE FUNCTION calculate_car_work_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL THEN
        NEW.total_hours = ROUND(
            EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0,
            2
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-calculate car work hours on end_time
DROP TRIGGER IF EXISTS trigger_calculate_car_work_hours ON car_work_sessions;
CREATE TRIGGER trigger_calculate_car_work_hours
    BEFORE UPDATE OF end_time ON car_work_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_car_work_hours();
