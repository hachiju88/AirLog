-- Migration: Fix health_logs and add age/gender to profiles

-- 1. Ensure profiles has necessary columns for Body Composition
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT; -- 'male' or 'female'

-- 2. Ensure health_logs table exists (Fix for 404 error)
CREATE TABLE IF NOT EXISTS health_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  weight_kg FLOAT NOT NULL,
  bmi FLOAT,
  body_fat_percentage FLOAT,
  muscle_mass_kg FLOAT,
  visceral_fat_rating FLOAT, -- Added
  basal_metabolic_rate FLOAT, -- Added
  metric_source TEXT DEFAULT 'manual' -- 'manual', 'bluetooth', 'calculated'
);

-- 3. Enable RLS for health_logs if newly created
ALTER TABLE health_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy if not exists (Drop first to be safe or use DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'health_logs' AND policyname = 'Users can manage their own health logs'
    ) THEN
        CREATE POLICY "Users can manage their own health logs" ON health_logs FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 5. Create Index if not exists
CREATE INDEX IF NOT EXISTS idx_health_logs_user_date ON health_logs (user_id, recorded_at DESC);
