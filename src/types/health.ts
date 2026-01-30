/**
 * 共通型定義 - 健康データ関連
 * 
 * 体重・体組成データの記録に使用する型を定義。
 * 
 * @module types/health
 */

/**
 * 健康ログの型定義
 * 
 * Supabaseに保存される体重・体組成記録レコードの構造。
 * 体重以外のフィールドはオプション（手入力時やBluetooth体重計の
 * 機能によっては取得できない場合がある）。
 */
export type HealthLog = {
    /** レコードID (UUID) */
    id: string;
    /** ユーザーID */
    user_id: string;
    /** 体重 (kg) - 必須 */
    weight_kg: number;
    /** 体脂肪率 (%) */
    body_fat_percentage?: number;
    /** 筋肉量 (kg) */
    muscle_mass_kg?: number;
    /** 内臓脂肪レベル (1-59の指数) */
    visceral_fat_rating?: number;
    /** 基礎代謝量 (kcal) */
    basal_metabolic_rate?: number;
    /** 体水分率 (%) */
    body_water_percentage?: number;
    /** 骨量 (kg) */
    bone_mass_kg?: number;
    /** タンパク質率 (%) */
    protein_percentage?: number;
    /** 体内年齢 (歳) */
    metabolic_age?: number;
    /** 除脂肪体重 (kg) */
    lean_body_mass_kg?: number;
    /** 記録日時 (ISO 8601形式) */
    recorded_at: string;
    /** データ取得元 */
    source: 'manual' | 'bluetooth';
};
