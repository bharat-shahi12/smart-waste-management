CREATE TABLE collection_tasks (
    id BIGSERIAL PRIMARY KEY,
    dustbin_id BIGINT REFERENCES dustbins(id) ON DELETE CASCADE,
    collector_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(30) NOT NULL DEFAULT 'LOW',
    assigned_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);
