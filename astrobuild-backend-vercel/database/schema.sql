-- AstroBuild List Database Schema for SQLite (Simplified)

-- Cars table
CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    repair_time TEXT,
    start_date TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mechanics table
CREATE TABLE IF NOT EXISTS mechanics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined mechanics
INSERT OR IGNORE INTO mechanics (name) VALUES
    ('IgenieroErick'),
    ('ChristianCobra'),
    ('Chicanto'),
    ('SpiderSteven'),
    ('LaBestiaPelua'),
    ('PhonKing'),
    ('CarlosMariconGay');

-- Tasks table with mechanic assignment and points
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_mechanic TEXT REFERENCES mechanics(name),
    points INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_car_id ON tasks(car_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_mechanic ON tasks(assigned_mechanic);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_mechanics_points ON mechanics(total_points DESC);

-- Trigger to update timestamps
CREATE TRIGGER IF NOT EXISTS trigger_update_cars_timestamp
    AFTER UPDATE ON cars
    FOR EACH ROW
    BEGIN
        UPDATE cars SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS trigger_update_tasks_timestamp
    AFTER UPDATE ON tasks
    FOR EACH ROW
    BEGIN
        UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS trigger_update_mechanics_timestamp
    AFTER UPDATE ON mechanics
    FOR EACH ROW
    BEGIN
        UPDATE mechanics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger to set completed_at when task is marked as completed
CREATE TRIGGER IF NOT EXISTS trigger_set_completed_at
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
    BEGIN
        UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger to clear completed_at when task is unmarked as completed
CREATE TRIGGER IF NOT EXISTS trigger_clear_completed_at
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN OLD.status = 'completed' AND NEW.status != 'completed'
    BEGIN
        UPDATE tasks SET completed_at = NULL WHERE id = NEW.id;
    END;

-- Trigger to update mechanic points when task is completed
CREATE TRIGGER IF NOT EXISTS trigger_add_points_on_completion
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_mechanic IS NOT NULL
    BEGIN
        UPDATE mechanics
        SET total_points = total_points + NEW.points,
            total_tasks = total_tasks + 1
        WHERE name = NEW.assigned_mechanic;
    END;

-- Trigger to remove mechanic points when task is uncompleted
CREATE TRIGGER IF NOT EXISTS trigger_remove_points_on_uncompletion
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN OLD.status = 'completed' AND NEW.status != 'completed' AND NEW.assigned_mechanic IS NOT NULL
    BEGIN
        UPDATE mechanics
        SET total_points = total_points - NEW.points,
            total_tasks = total_tasks - 1
        WHERE name = NEW.assigned_mechanic;
    END;