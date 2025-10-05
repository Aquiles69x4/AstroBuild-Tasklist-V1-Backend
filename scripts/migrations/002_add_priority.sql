-- Migration: Add is_priority field to tasks table
-- Date: 2025-10-02

-- Add is_priority column to existing tasks table
ALTER TABLE tasks ADD COLUMN is_priority INTEGER DEFAULT 0 CHECK (is_priority IN (0, 1));

-- Create index for better query performance on priority tasks
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(is_priority DESC);
