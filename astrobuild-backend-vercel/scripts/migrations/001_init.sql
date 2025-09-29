-- AstroBuild List Database Schema for PostgreSQL (Migrated from SQLite)

-- Cars table
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    repair_time TEXT,
    start_date TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined mechanics
INSERT INTO mechanics (name) VALUES
    ('IgenieroErick'),
    ('ChristianCobra'),
    ('Chicanto'),
    ('SpiderSteven'),
    ('LaBestiaPelua'),
    ('PhonKing'),
    ('CarlosMariconGay')
ON CONFLICT (name) DO NOTHING;

-- Tasks table with mechanic assignment and points
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_mechanic TEXT REFERENCES mechanics(name),
    points INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_car_id ON tasks(car_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_mechanic ON tasks(assigned_mechanic);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_mechanics_points ON mechanics(total_points DESC);

-- Function to update timestamps (PostgreSQL way)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update timestamps
DROP TRIGGER IF EXISTS trigger_update_cars_timestamp ON cars;
CREATE TRIGGER trigger_update_cars_timestamp
    BEFORE UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tasks_timestamp ON tasks;
CREATE TRIGGER trigger_update_tasks_timestamp
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_mechanics_timestamp ON mechanics;
CREATE TRIGGER trigger_update_mechanics_timestamp
    BEFORE UPDATE ON mechanics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to set completed_at when task is marked as completed
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to manage completed_at
DROP TRIGGER IF EXISTS trigger_manage_completed_at ON tasks;
CREATE TRIGGER trigger_manage_completed_at
    BEFORE UPDATE OF status ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- Function to update mechanic points when task completion status changes
CREATE OR REPLACE FUNCTION update_mechanic_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Add points when task is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_mechanic IS NOT NULL THEN
        UPDATE mechanics
        SET total_points = total_points + NEW.points,
            total_tasks = total_tasks + 1
        WHERE name = NEW.assigned_mechanic;
    -- Remove points when task is uncompleted
    ELSIF OLD.status = 'completed' AND NEW.status != 'completed' AND NEW.assigned_mechanic IS NOT NULL THEN
        UPDATE mechanics
        SET total_points = total_points - NEW.points,
            total_tasks = total_tasks - 1
        WHERE name = NEW.assigned_mechanic;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update mechanic points
DROP TRIGGER IF EXISTS trigger_update_mechanic_points ON tasks;
CREATE TRIGGER trigger_update_mechanic_points
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_mechanic_points();