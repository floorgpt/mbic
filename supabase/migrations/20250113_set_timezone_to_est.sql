-- Migration: Set database timezone to America/New_York (Eastern Time)
-- This ensures all timestamp operations use EST/EDT automatically

-- Set the default timezone for the database to America/New_York
ALTER DATABASE postgres SET timezone TO 'America/New_York';

-- Set the timezone for the current session (will apply to all new connections after migration)
SET timezone TO 'America/New_York';

-- Verify the timezone setting
SHOW timezone;

-- Add comment for documentation
COMMENT ON DATABASE postgres IS
'Database timezone set to America/New_York (Eastern Time) for consistent timestamp handling across all MBIC operations.';
