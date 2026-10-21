CREATE TABLE waste_detections (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    detected_category VARCHAR(100) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    recommended_disposal TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
