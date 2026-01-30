/**
 * 共通型定義 - 食事関連
 * 
 * 食事記録機能で使用する型を定義。
 * 
 * @module types/meal
 */

/**
 * 食事アイテムの型定義
 * 
 * AI解析結果や手入力から生成される個々の食品/料理を表す。
 * portionで分量調整が可能。
 */
export type MealItem = {
    /** 食品・料理名 */
    name: string;
    /** 食品に対応する絵文字 (オプション) */
    emoji?: string;
    /** カロリー (kcal) */
    calories: number;
    /** タンパク質 (g) */
    protein: number;
    /** 脂質 (g) */
    fat: number;
    /** 炭水化物 (g) */
    carbs: number;
    /** 食物繊維 (g) */
    fiber: number;
    /** 塩分 (g) */
    salt: number;
    /** 分量倍率 (1.0 = 標準量) */
    portion: number;
};

/**
 * 食事ログの型定義
 * 
 * Supabaseに保存される食事記録レコードの構造。
 */
export type MealLog = {
    /** レコードID (UUID) */
    id: string;
    /** ユーザーID */
    user_id: string;
    /** 食品・料理名 */
    food_name: string;
    /** カロリー (kcal) */
    calories: number;
    /** タンパク質 (g) */
    protein_g: number;
    /** 脂質 (g) */
    fat_g: number;
    /** 炭水化物 (g) */
    carbohydrates_g: number;
    /** 食物繊維 (g) */
    fiber_g: number;
    /** 塩分 (g) */
    salt_g: number;
    /** 入力方法 */
    input_type: 'photo' | 'voice' | 'text';
    /** AI解析の生データ・下書きステータス等 */
    ai_analysis_raw: Record<string, unknown>;
    /** 記録日時 (ISO 8601形式) */
    recorded_at: string;
};
