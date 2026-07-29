-- Migration 005: meal_logs に食物繊維・塩分を追加 ＋ movement_logs（移動記録）新設
-- Supabaseで実行してください。既存環境でも安全なよう冪等（IF NOT EXISTS / DO ブロック）で記述。

-- ============================================================
-- 1. meal_logs に食物繊維・塩分カラムを追加
--    （既にスキーマ上存在する環境でもエラーにならないよう IF NOT EXISTS）
-- ============================================================
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS fiber_g FLOAT DEFAULT 0; -- 食物繊維 g
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS salt_g FLOAT DEFAULT 0;  -- 塩分 g（食塩相当量）

-- ============================================================
-- 2. movement_logs（移動記録: 距離ベース）テーブルを新設
--    筋トレは既存 exercise_logs、移動はこのテーブルに分離する。
-- ============================================================
CREATE TABLE IF NOT EXISTS movement_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  distance_km FLOAT NOT NULL,                 -- 移動距離 km
  movement_type TEXT,                          -- 'walking' / 'running' / 'mixed' など
  calories_burned FLOAT DEFAULT 0,             -- 推定消費 kcal
  input_type TEXT DEFAULT 'manual',            -- 'manual' / 'voice' など
  ai_analysis_raw JSONB                        -- AI解析の生データ・下書きステータス等
);

-- 3. RLS を有効化
ALTER TABLE movement_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー（既存テーブルと同形: 自分のデータのみ操作可）。冪等化のため存在チェック。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'movement_logs'
          AND policyname = 'Users can manage their own movement logs'
    ) THEN
        CREATE POLICY "Users can manage their own movement logs"
            ON movement_logs FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 5. インデックス（ダッシュボード/アナリティクスの日付範囲クエリ用）
CREATE INDEX IF NOT EXISTS idx_movement_logs_user_date ON movement_logs (user_id, recorded_at DESC);
