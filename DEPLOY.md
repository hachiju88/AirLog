# Google Cloud Run デプロイガイド

このガイドでは、Next.jsアプリケーション「AirLog」をGoogle Cloud Runにデプロイする手順を説明します。
Dockerコンテナとしてビルドし、無料枠（Free Tier）を最大限活用できる設定でデプロイします。

## 前提条件

1.  **Google Cloud SDK (gcloud)** がインストールされ、ログイン済みであること。
    -   まだの場合は `gcloud auth login` を実行してください。
2.  **Google Cloud Project** が作成済みでお、課金が有効になっていること（無料枠を利用する場合でも課金アカウントの紐付けが必要です）。

## 手順

### 1. 環境設定

ターミナルで以下の変数を設定するか、コマンド内で直接ご自身のプロジェクトIDに置き換えてください。

```bash
export PROJECT_ID="your-project-id" # ここをあなたのプロジェクトIDに変更
export REGION="asia-northeast1" # 東京リージョン
export SERVICE_NAME="airlog-app"
```

> [!IMPORTANT]
> **環境変数の設定**:
> Cloud Runへのデプロイ時に、以下の環境変数を設定してください（コマンドライン引数 `--set-env-vars` またはコンソール画面から設定可能）。
> *   `BASE_URL`: **必須**。デプロイ先のURL（例: `https://airlog-app-xyz.a.run.app`）。認証後のリダイレクト先を正しく解決するために必要です。（※ビルド時ではなく実行時に適用されるよう、`NEXT_PUBLIC_` プレフィックスのない `BASE_URL` を使用します）
> *   `AI_REQUEST_MODE`: `true` (AI機能を使用する場合)

プロジェクトを設定します。

```bash
gcloud config set project $PROJECT_ID
```

### 2. コンテナイメージのビルドとプッシュ

Cloud Build を使用して、ソースコードからコンテナイメージをビルドし、Artifact Registry (または Container Registry) にプッシュします。

```bash
# Artifact Registry のリポジトリを作成していない場合は作成（初回のみ）
gcloud artifacts repositories create airlog-repo \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for AirLog"

# ビルドとプッシュ（Cloud Build 設定ファイルを使用）
# Supabaseの環境変数をビルド時に埋め込むため、cloudbuild.yaml を使用します。

# 環境変数の設定 (実際の値に置き換えてください)
export SUPABASE_URL="your-supabase-url"
export SUPABASE_KEY="your-supabase-anon-key"

gcloud builds submit --config cloudbuild.yaml \
    --substitutions=_SUPABASE_URL="$SUPABASE_URL",_SUPABASE_KEY="$SUPABASE_KEY"
```
※ `cloudbuild.yaml` 内で `_REGION` や `_SERVICE_NAME` も定義されています。必要に応じてファイル内または `--substitutions` で上書き可能です。


### 3. Cloud Run へのデプロイ（コスト最適化設定）

以下のコマンドでデプロイします。無料枠を意識した設定を含んでいます。

```bash
gcloud run deploy $SERVICE_NAME \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/airlog-repo/$SERVICE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 1
```

**設定のポイント:**
- `--allow-unauthenticated`: 誰でもアクセスできるようにします（Webアプリとして公開する場合）。
- `--memory 512Mi`: Next.jsの軽量アプリであれば512MBで動作する場合が多いです。必要に応じて `1Gi` に増やしてください。メモリ量が少ない方がコストが低くなります。
- `--cpu 1`: 1 vCPU。
- `--min-instances 0`: アイドル時にインスタンスを0にします（コールドスタートが発生しますが、使用していない時間の課金を防げます）。
- `--max-instances 1`: コスト暴発を防ぐため、最大インスタンス数を1に制限します（トラフィックが増えた場合はこの値を増やしてください）。

### 4. 動作確認

デプロイが完了すると、Service URL が表示されます。ブラウザでアクセスして動作を確認してください。

## トラブルシューティング

- **デプロイ失敗**: ログを確認してください。
  ```bash
  gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" --limit 20
  ```
- **503 エラー**: コンテナの起動に時間がかかっている可能性があります（コールドスタート）。少し待ってから再読み込みしてください。

## PWAの確認

Android端末のChromeでアクセスし、「ホーム画面に追加」プロンプトが表示されるか、またはメニューから「アプリをインストール」が可能かを確認してください。


## デプロイコマンド実例 (Reference)

実際にデプロイに成功したコマンドのテンプレートです。環境変数などを置き換えて使用してください。

### 1. ビルド & プッシュ
```bash
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_SERVICE_NAME="$SERVICE_NAME",_SUPABASE_URL="[YOUR_SUPABASE_URL]",_SUPABASE_KEY="[YOUR_SUPABASE_KEY]"
```

### 2. Cloud Run デプロイ
```bash
gcloud run deploy airlog-app \
    --image asia-northeast1-docker.pkg.dev/[PROJECT_ID]/airlog-repo/airlog-app:latest \
    --region asia-northeast1 \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 1 \
    --port 3000 \
    --update-env-vars BASE_URL="https://[YOUR_APP_URL].run.app",AI_REQUEST_MODE="true",NEXT_PUBLIC_SUPABASE_URL="[YOUR_SUPABASE_URL]",NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_SUPABASE_KEY]",GEMINI_API_KEY="[YOUR_GEMINI_API_KEY]"
```
