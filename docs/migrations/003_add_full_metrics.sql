-- Migration: Add remaining body composition metrics to health_logs

ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS body_water_percentage FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS bone_mass_kg FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS protein_percentage FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS metabolic_age INTEGER;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS lean_body_mass_kg FLOAT;
