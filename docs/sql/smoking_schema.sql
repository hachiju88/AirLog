-- 喫煙履歴管理のためのデータベーススキーマ
-- Supabaseで実行してください

-- 1. profiles テーブルに喫煙関連カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_smoker BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cigarette_brand TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cigarettes_per_pack INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS price_per_pack FLOAT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_cigarettes_per_day INTEGER;

-- 2. smoking_logs テーブルを作成
CREATE TABLE IF NOT EXISTS smoking_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  cigarette_count INTEGER NOT NULL DEFAULT 1,
  brand_name TEXT,
  price_per_cigarette FLOAT,
  is_different_brand BOOLEAN DEFAULT FALSE,
  ai_analysis_raw JSONB
);

-- 3. RLS (Row Level Security) を有効化
ALTER TABLE smoking_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシーを作成
CREATE POLICY "Users can view own smoking logs" ON smoking_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own smoking logs" ON smoking_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own smoking logs" ON smoking_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own smoking logs" ON smoking_logs
  FOR DELETE USING (auth.uid() = user_id);

-- 5. インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_smoking_logs_user_id ON smoking_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_smoking_logs_recorded_at ON smoking_logs(recorded_at);
