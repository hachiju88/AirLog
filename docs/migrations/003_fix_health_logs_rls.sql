-- Fix RLS and Add Missing Columns for health_logs

-- 1. Enable RLS
ALTER TABLE health_logs ENABLE ROW LEVEL SECURITY;

-- 2. Re-create Policy
DROP POLICY IF EXISTS "Users can manage their own health logs" ON health_logs;
CREATE POLICY "Users can manage their own health logs"
ON health_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Add Missing Columns (Idempotent)
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS visceral_fat_rating FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS basal_metabolic_rate FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS metric_source TEXT DEFAULT 'manual';

-- Added in fix for 400 Error (Missing Columns)
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS body_water_percentage FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS bone_mass_kg FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS protein_percentage FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS metabolic_age FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS lean_body_mass_kg FLOAT;
ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'; -- 'bluetooth' or 'manual'
