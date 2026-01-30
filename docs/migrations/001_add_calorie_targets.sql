-- Add target_calories_burned if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_calories_burned') THEN
        ALTER TABLE profiles ADD COLUMN target_calories_burned INTEGER DEFAULT 300;
        COMMENT ON COLUMN profiles.target_calories_burned IS 'Daily target for burned calories (kcal)';
    END IF;
END $$;

-- Add target_calories_intake if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_calories_intake') THEN
        ALTER TABLE profiles ADD COLUMN target_calories_intake INTEGER DEFAULT 2200;
        COMMENT ON COLUMN profiles.target_calories_intake IS 'Daily target for intake calories (kcal)';
    END IF;
END $$;
