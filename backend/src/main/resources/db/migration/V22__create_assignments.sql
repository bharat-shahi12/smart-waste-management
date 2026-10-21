CREATE TABLE assignments (
    id BIGSERIAL PRIMARY KEY,
    responder_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    complaint_id BIGINT,
    pickup_id BIGINT,
    bin_id BIGINT,
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'ASSIGNED',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_note TEXT,
    proof_image VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_assignment_responder FOREIGN KEY (responder_id) REFERENCES users(id),
    CONSTRAINT fk_assignment_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    CONSTRAINT fk_assignment_pickup FOREIGN KEY (pickup_id) REFERENCES pickup_requests(id),
    CONSTRAINT fk_assignment_bin FOREIGN KEY (bin_id) REFERENCES dustbins(id)
);
