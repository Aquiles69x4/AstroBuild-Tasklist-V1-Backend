-- Add display_order column to cars table
ALTER TABLE cars ADD COLUMN display_order INTEGER;

-- Set display_order based on created_at for existing cars
UPDATE cars
SET display_order = (
  SELECT COUNT(*)
  FROM cars c2
  WHERE c2.created_at <= cars.created_at
);

-- Create index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_cars_display_order ON cars(display_order ASC);
