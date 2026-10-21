CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    dustbin_id BIGINT NOT NULL REFERENCES dustbins(id) ON DELETE CASCADE,
    fill_level DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    air_quality DOUBLE PRECISION,
    moisture DOUBLE PRECISION,
    battery_level DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
