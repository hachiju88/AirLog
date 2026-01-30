# AirLog - Next-Gen AI Self-Care App
![Status](https://img.shields.io/badge/Status-Beta-blue) ![Version](https://img.shields.io/badge/Version-0.8.0-green)

「入力の壁」をAIで取り払い、挫折しないセルフケアを実現するWebアプリケーション。

## 📖 Documentation
詳細な要件、仕様、データベース構造については [docs/requirements.md](./docs/requirements.md) を参照してください。

## 🚀 Features
- **AI Vision Log**: 食事写真をアップロードして料理名・カロリー・PFC（タンパク質・脂質・炭水化物）を自動解析。Gemini 2.0 Flashを活用し、高精度な栄養推定を実現。
- **Voice Activity Log**: 「腕立てを20回やった」などの発話をWeb Speech APIで認識し、自動で運動記録として保存。Geminiによる自然言語解析で消費カロリーも推定。
- **Smart Analytics**: 
  - 体重、摂取/消費カロリーの推移をグラフで可視化。
  - 具体的な数値ラベルと詳細履歴リストで、日々の努力を一目で確認可能。
- **AI Praise Partner**: 
  - 毎日の記録内容（食事名や運動種目）を具体的に引用して、AIがパーソナライズされた褒め言葉やフィードバックを提供。
  - ランチの内容やランニングの努力を見逃さず、ポジティブにサポート。
- **Bluetooth Link**: Web Bluetooth APIを利用し、対応する体重計から体重データを取得可能 (Experimental / Paired with Chocozap CM3-HM).
- **Seed Data Generator**: 設定画面からワンクリックで過去30日分のリアルなテストデータを生成し、アプリの使用感を即座に確認可能。

## 🛠 Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **State/Data**: Supabase (Auth, DB, Realtime)
- **UI**: Tailwind CSS v4, shadcn/ui, Recharts
- **PWA**: Supported (@ducanh2912/next-pwa)
- **AI**: Gemini 2.0 Flash (via Google AI Studio)

## 🏁 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- Supabase project
- Google AI Studio API Key

### Environment Variables
Create a `.env.local` file in the root directory and add the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.