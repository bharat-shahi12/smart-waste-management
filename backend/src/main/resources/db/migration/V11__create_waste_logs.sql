CREATE TABLE waste_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waste_type VARCHAR(50) NOT NULL,
    quantity_kg DECIMAL(10, 2) NOT NULL,
    points_earned INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waste_logs_user_id ON waste_logs(user_id);
