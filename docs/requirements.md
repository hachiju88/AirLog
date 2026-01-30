# 要件定義書 (Requirements Document)

## 1. プロジェクトビジョン
「入力の壁」をAIで取り払い、挫折しないセルフケアを実現する。
写真・音声・デバイス連携を軸に、既存アプリを超える利便性と、AIによる情緒的なサポート（褒める・励ます）を統合した次世代セルフケア管理Webアプリケーション。

## 2. ターゲット機能 (Core Features)

### A. シームレスなデータ入力
*   **AI Vision Log**: 食事写真を自動解析（Gemini 2.0 Flash）。料理名・カロリー・PFCを高精度に推定。
*   **Voice Activity Log**: 音声入力による運動記録。自然言語解析で消費カロリーも自動算出。
*   **Smart Analytics**:
    *   **Numeric Display**: グラフ上の数値ラベル表示により、一目で値を把握。
    *   **Detailed History**: グラフと連動した詳細履歴リスト表示。
*   **Bluetooth Link**: Web Bluetooth API (Chocozap CM3-HM対応 / Experimental)。
*   **Seed Data Generator**: ワンクリックでテスト用データを生成し、検証を容易化。

### B. 高度な分析と可視化
*   **目標達成トラッキング**: 摂取/消費カロリーの目標に対する進捗をリアルタイム表示。
*   **PFCバランス可視化**: タンパク質・脂質・炭水化物の摂取バランスをバーチャート表示。

### C. AI褒めパートナー
*   **パーソナライズド・フィードバック**: 具体的な食事名や運動内容を引用し、Geminiがポジティブに称賛。

## 3. 技術仕様 (Technical Stack)
*   **Framework**: Next.js 16 (App Router)
*   **Styling**: Tailwind CSS v4 / shadcn/ui
*   **Charts**: Recharts
*   **PWA**: Supported (@ducanh2912/next-pwa)
*   **Backend**: Supabase (Auth, Database, Storage)
*   **AI Models**: Gemini 2.0 Flash
*   **Web APIs**: Web Bluetooth API, Web Speech API

## 4. データ構造・スキーマ (Database Schema)

### Profiles
ユーザー基本情報。`auth.users`と1対1で紐づく。
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  height_cm FLOAT,
  birth_date DATE,
  gender TEXT,
  target_weight_kg FLOAT,
  activity_level INTEGER DEFAULT 1 -- 1:低, 2:中, 3:高
);
```

### Health Logs
体重・体組成データ。
```sql
CREATE TABLE health_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  weight_kg FLOAT NOT NULL,
  bmi FLOAT,
  body_fat_percentage FLOAT,
  source TEXT DEFAULT 'manual' -- 'manual', 'bluetooth'
);
```

### Meal Logs
食事記録。写真解析結果も保持。
```sql
CREATE TABLE meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  food_name TEXT NOT NULL,
  calories FLOAT DEFAULT 0,
  protein_g FLOAT DEFAULT 0,
  fat_g FLOAT DEFAULT 0,
  carbohydrates_g FLOAT DEFAULT 0,
  image_url TEXT,
  input_type TEXT DEFAULT 'manual', -- 'photo', 'voice', 'manual'
  ai_analysis_raw JSONB
);
```

### Exercise Logs
運動記録。
```sql
CREATE TABLE exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  exercise_name TEXT NOT NULL,
  duration_minutes INTEGER,
  sets INTEGER,
  reps_per_set INTEGER,
  calories_burned FLOAT DEFAULT 0,
  input_type TEXT DEFAULT 'manual' -- 'voice', 'manual'
);
```

## 5. Security
*   **RLS (Row Level Security)**: 全テーブルに対して有効化。ユーザーは自身のデータのみ閲覧・操作可能とする。
