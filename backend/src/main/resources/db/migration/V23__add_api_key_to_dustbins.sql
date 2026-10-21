ALTER TABLE dustbins ADD COLUMN IF NOT EXISTS api_key VARCHAR(100);

-- Populate pre-existing dustbins with a default device API key
UPDATE dustbins SET api_key = 'esp32_smartwaste_secret_key_2025' WHERE api_key IS NULL;
