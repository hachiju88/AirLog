/**
 * 共通型定義 - プロファイル関連
 * 
 * ユーザープロフィールと目標設定に使用する型を定義。
 * 
 * @module types/profile
 */

/**
 * ユーザープロファイルの型定義
 * 
 * Supabaseのprofilesテーブルに保存されるユーザー情報。
 * id以外は全てオプションで、段階的に設定可能。
 */
export type Profile = {
    /** ユーザーID (UUID) - 必須 */
    id: string;
    /** 表示名 */
    full_name?: string;
    /** アバター画像URL */
    avatar_url?: string;
    /** 身長 (cm) */
    height_cm?: number;
    /** 生年月日 (YYYY-MM-DD形式) */
    birth_date?: string;
    /** 性別 */
    gender?: 'male' | 'female';
    /** 目標体重 (kg) */
    target_weight_kg?: number;
    /** 目標摂取カロリー (kcal/日) */
    target_calories_intake?: number;
    /** 目標消費カロリー (kcal/日) */
    target_calories_burned?: number;
    /** 作成日時 (ISO 8601形式) */
    created_at?: string;
    /** 更新日時 (ISO 8601形式) */
    updated_at?: string;
};
