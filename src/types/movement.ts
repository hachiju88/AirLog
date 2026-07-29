/**
 * 共通型定義 - 移動（距離ベース）関連
 *
 * 徒歩・ランニング等の距離ベースの移動記録で使用する型を定義。
 * 筋トレ（exercise_logs）とは分離して movement_logs テーブルに保存する。
 *
 * @module types/movement
 */

/**
 * 移動種別
 */
export type MovementType = 'walking' | 'running' | 'mixed';

/**
 * 移動ログの型定義
 *
 * Supabaseに保存される移動記録レコードの構造。
 */
export type MovementLog = {
    /** レコードID (UUID) */
    id: string;
    /** ユーザーID */
    user_id: string;
    /** 移動距離 (km) */
    distance_km: number;
    /** 移動種別 */
    movement_type: MovementType;
    /** 推定消費カロリー (kcal) */
    calories_burned: number;
    /** 入力方法 */
    input_type: 'manual' | 'voice';
    /** AI解析の生データ・下書きステータス等 */
    ai_analysis_raw?: Record<string, unknown>;
    /** 記録日時 (ISO 8601形式) */
    recorded_at: string;
};

/**
 * 移動種別ごとの表示ラベル
 */
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
    walking: '徒歩',
    running: 'ランニング',
    mixed: 'ミックス',
};
