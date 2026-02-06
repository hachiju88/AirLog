/**
 * 共通型定義 - 喫煙関連
 *
 * 喫煙ログと銘柄情報に使用する型を定義。
 *
 * @module types/smoking
 */

/**
 * 喫煙ログの型定義
 *
 * Supabaseのsmoking_logsテーブルに保存される喫煙記録。
 */
export type SmokingLog = {
    /** レコードID (UUID) */
    id: string;
    /** ユーザーID (UUID) */
    user_id: string;
    /** 記録日時 (ISO 8601形式) */
    recorded_at: string;
    /** 吸った本数 */
    cigarette_count: number;
    /** 銘柄名（別銘柄の場合） */
    brand_name?: string;
    /** 1本あたりの価格 */
    price_per_cigarette?: number;
    /** 別銘柄フラグ */
    is_different_brand: boolean;
    /** AI解析結果 */
    ai_analysis_raw?: SmokingAnalysisRaw;
};

/**
 * AI解析結果の型定義
 */
export type SmokingAnalysisRaw = {
    /** ステータス (pending, completed) */
    status: 'pending' | 'completed';
    /** 解析された銘柄情報 */
    brand_info?: CigaretteBrandInfo;
    /** 生のコンテンツ（下書き時） */
    raw_content?: string;
};

/**
 * タバコ銘柄情報の型定義
 *
 * AIから取得される銘柄の詳細情報。
 */
export type CigaretteBrandInfo = {
    /** 正式な銘柄名 */
    brand_name: string;
    /** 1箱あたりの本数 */
    cigarettes_per_pack: number;
    /** 1箱あたりの価格 (円) */
    price_per_pack: number;
    /** 1本あたりの価格 (計算値) */
    price_per_cigarette: number;
};

/**
 * 喫煙者プロフィールの拡張型
 *
 * Profile型に追加される喫煙関連フィールド。
 */
export type SmokingProfile = {
    /** 喫煙者フラグ */
    is_smoker: boolean;
    /** 設定銘柄名 */
    cigarette_brand?: string;
    /** 1箱あたりの本数 */
    cigarettes_per_pack?: number;
    /** 1箱あたりの価格 */
    price_per_pack?: number;
    /** 1日の目標本数 */
    target_cigarettes_per_day?: number;
};

/**
 * 喫煙サマリー型
 *
 * ダッシュボードやレポートで使用する集計データ。
 */
export type SmokingSummary = {
    /** 本日吸った本数 */
    todayCount: number;
    /** 目標本数 */
    targetCount: number;
    /** 本日の消費金額 */
    todaySpent: number;
    /** 目標超過フラグ */
    isOverTarget: boolean;
};

/**
 * 喫煙累計データ型
 *
 * レポート画面で使用する累計統計データ。
 */
export type SmokingCumulative = {
    /** 累計本数 */
    totalCount: number;
    /** 累計消費金額 */
    totalSpent: number;
    /** 消費した命 (分) - 1本5分として計算 */
    lifeConsumedMinutes: number;
};
