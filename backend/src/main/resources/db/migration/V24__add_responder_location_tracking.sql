-- Add responder location tracking to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS responder_latitude DOUBLE PRECISION;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS responder_longitude DOUBLE PRECISION;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS responder_location_name VARCHAR(255);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS responder_eta_minutes INTEGER;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS responder_updated_at TIMESTAMP WITH TIME ZONE;
