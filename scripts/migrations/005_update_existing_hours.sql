-- Update existing car work sessions with hours from notes
-- Format: "Xh Ym trabajadas"

UPDATE car_work_sessions
SET total_hours = (
    -- Extract hours and minutes from notes and convert to decimal
    COALESCE(
        CAST(
            SUBSTRING(notes FROM '([0-9]+)h') AS DECIMAL
        ), 0
    ) +
    COALESCE(
        CAST(
            SUBSTRING(notes FROM '([0-9]+)m') AS DECIMAL
        ), 0
    ) / 60.0
)
WHERE end_time IS NOT NULL
  AND notes IS NOT NULL
  AND notes LIKE '%h %m trabajadas'
  AND total_hours = 0.00;

-- Also update sessions that don't have the note pattern but have end_time
-- (these should use the actual time difference)
UPDATE car_work_sessions
SET total_hours = ROUND(
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0,
    2
)
WHERE end_time IS NOT NULL
  AND (notes IS NULL OR notes NOT LIKE '%h %m trabajadas')
  AND total_hours = 0.00;
