-- Add missing columns to exercise_logs
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS weight_kg FLOAT;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS sets INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS reps_per_set INTEGER;

-- Ensure duration_minutes exists (might have been durationtimestamp or something else, but schema says duration_minutes)
-- If duration_min existed properly, we might rename:
-- ALTER TABLE exercise_logs RENAME COLUMN duration_min TO duration_minutes;
-- But safer to just add if exists:
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Ensure favorites exists (if missed)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  content JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_type ON favorites (user_id, type);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own favorites" ON favorites FOR ALL USING (auth.uid() = user_id);
