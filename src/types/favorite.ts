/**
 * 共通型定義 - お気に入り (My Menu) 関連
 * 
 * よく使う食事・運動メニューを保存・再利用するための型を定義。
 * 
 * @module types/favorite
 */

/**
 * お気に入りの種別
 */
export type FavoriteType = 'meal' | 'exercise';

/**
 * お気に入りアイテムの型定義
 * 
 * Supabaseに保存されるMy Menuレコードの構造。
 * contentフィールドには種別に応じた詳細データが格納される。
 */
export type FavoriteItem = {
    /** レコードID (UUID) */
    id: string;
    /** ユーザーID */
    user_id: string;
    /** 種別 (meal: 食事, exercise: 運動) */
    type: FavoriteType;
    /** 表示名 */
    name: string;
    /** 詳細データ (種別によって構造が異なる) */
    content: Record<string, unknown>;
    /** 作成日時 (ISO 8601形式) */
    created_at: string;
};

/**
 * 食事のお気に入りコンテンツ型
 * 
 * FavoriteItem.content に格納される食事データの構造。
 */
export type MealFavoriteContent = {
    /** 食品・料理名 */
    name: string;
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
};

/**
 * 運動のお気に入りコンテンツ型
 * 
 * FavoriteItem.content に格納される運動データの構造。
 * トレーニング内容に応じて一部フィールドのみ使用される。
 */
export type ExerciseFavoriteContent = {
    /** 種目名 */
    name: string;
    /** 運動時間 (分) - 有酸素運動向け */
    duration?: number;
    /** 重量 (kg) - ウェイトトレーニング向け */
    weight?: number;
    /** レップ数 */
    reps?: number;
    /** セット数 */
    sets?: number;
    /** 消費カロリー (kcal) */
    calories?: number;
};
