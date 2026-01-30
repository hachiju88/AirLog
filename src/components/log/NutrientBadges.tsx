'use client';

/**
 * 栄養素バッジコンポーネント
 * 
 * タンパク質(P)、脂質(F)、炭水化物(C)の3大栄養素を
 * コンパクトなバッジ形式で表示する。
 * 
 * @module components/log/NutrientBadges
 * 
 * @example
 * ```tsx
 * <NutrientBadges protein={25.5} fat={15.3} carbs={80.2} />
 * ```
 */

// ===== 型定義 =====

/**
 * NutrientBadgesコンポーネントのProps
 */
interface NutrientBadgesProps {
    /** タンパク質 (g) */
    protein: number;
    /** 脂質 (g) */
    fat: number;
    /** 炭水化物 (g) */
    carbs: number;
    /** 追加のCSSクラス (オプション) */
    className?: string;
}

/**
 * 栄養素バッジコンポーネント
 * 
 * @param props - コンポーネントのプロパティ
 * @returns 栄養素バッジ群のJSX要素
 * 
 * @remarks
 * - P: オレンジ系の背景色
 * - F: イエロー系の背景色
 * - C: ブルー系の背景色
 * - 数値は小数点以下1桁で表示
 */
export function NutrientBadges({ protein, fat, carbs, className = "" }: NutrientBadgesProps) {
    /**
     * 数値を小数点以下1桁にフォーマット
     * 
     * @param value - フォーマットする数値
     * @returns 小数点以下1桁の文字列
     */
    const formatValue = (value: number): string => {
        return value.toFixed(1);
    };

    return (
        <div className={`flex gap-2 text-[10px] text-slate-500 ${className}`}>
            {/* タンパク質バッジ */}
            <span className="bg-orange-50 px-2 py-1 rounded border border-orange-100">
                P {formatValue(protein)}
            </span>

            {/* 脂質バッジ */}
            <span className="bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                F {formatValue(fat)}
            </span>

            {/* 炭水化物バッジ */}
            <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100">
                C {formatValue(carbs)}
            </span>
        </div>
    );
}
