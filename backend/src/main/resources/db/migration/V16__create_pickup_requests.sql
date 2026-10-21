CREATE TABLE pickup_requests (
    id BIGSERIAL PRIMARY KEY,
    pickup_id VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waste_type VARCHAR(100) NOT NULL,
    quantity VARCHAR(100),
    address TEXT NOT NULL,
    preferred_date DATE,
    preferred_time VARCHAR(50),
    notes TEXT,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'REQUESTED',
    assigned_team_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pickup_updates (
    id BIGSERIAL PRIMARY KEY,
    pickup_request_id BIGINT NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
