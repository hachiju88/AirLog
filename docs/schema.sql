-- AirLog Database Schema

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  full_name TEXT,
  height_cm FLOAT,
  birth_date DATE,
  gender TEXT,
  target_weight_kg FLOAT,
  target_calories_intake INTEGER DEFAULT 2200, -- Added
  target_calories_burned INTEGER DEFAULT 300,  -- Added
  activity_level INTEGER DEFAULT 1 -- 1:Low, 2:Medium, 3:High
);

-- 2. Health Logs (Weight, Body Composition)
CREATE TABLE health_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  weight_kg FLOAT NOT NULL,
  bmi FLOAT,
  body_fat_percentage FLOAT,
  muscle_mass_kg FLOAT,
  source TEXT DEFAULT 'manual' -- 'manual', 'bluetooth'
);

-- 3. Meal Logs (Food, Photo Analysis)
CREATE TABLE meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  food_name TEXT NOT NULL,
  calories FLOAT DEFAULT 0,
  protein_g FLOAT DEFAULT 0,
  fat_g FLOAT DEFAULT 0,
  carbohydrates_g FLOAT DEFAULT 0,
  fiber_g FLOAT DEFAULT 0,
  salt_g FLOAT DEFAULT 0,
  image_url TEXT,
  input_type TEXT DEFAULT 'manual', -- 'photo', 'voice', 'manual'
  ai_analysis_raw JSONB -- Raw JSON from Gemini
);

-- 4. Exercise Logs (Activity, Voice Analysis)
CREATE TABLE exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  exercise_name TEXT NOT NULL,
  duration_minutes INTEGER,
  sets INTEGER,
  reps_per_set INTEGER,
  weight_kg FLOAT,
  calories_burned FLOAT DEFAULT 0,
  input_type TEXT DEFAULT 'manual', -- 'voice', 'manual'
  ai_analysis_raw JSONB -- Raw JSON from Gemini (includes emoji)
);

-- Indexes for performance
CREATE INDEX idx_health_logs_user_date ON health_logs (user_id, recorded_at DESC);
CREATE INDEX idx_meal_logs_user_date ON meal_logs (user_id, recorded_at DESC);
CREATE INDEX idx_exercise_logs_user_date ON exercise_logs (user_id, recorded_at DESC);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their own health logs" ON health_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own meal logs" ON meal_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own exercise logs" ON exercise_logs FOR ALL USING (auth.uid() = user_id);
