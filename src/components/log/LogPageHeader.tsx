'use client';

/**
 * ログページ共通ヘッダーコンポーネント
 * 
 * 食事/運動/体重ログページで同じUIパターンを使用する
 * 戻るボタン付きのヘッダー。
 * 
 * @module components/log/LogPageHeader
 * 
 * @example
 * ```tsx
 * <LogPageHeader
 *     title="食事を記録"
 *     icon={Utensils}
 *     bgColor="bg-rose-50"
 *     textColor="text-rose-900"
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { LucideIcon } from "lucide-react";

// ===== 型定義 =====

/**
 * LogPageHeaderコンポーネントのProps
 */
interface LogPageHeaderProps {
    /** ページタイトル */
    title: string;
    /** タイトル横に表示するアイコン */
    icon: LucideIcon;
    /** 背景色のTailwindクラス */
    bgColor?: string;
    /** ボーダー色のTailwindクラス */
    borderColor?: string;
    /** テキスト色のTailwindクラス */
    textColor?: string;
}

/**
 * ログページ共通ヘッダーコンポーネント
 * 
 * @param props - コンポーネントのプロパティ
 * @returns ヘッダーJSX要素
 * 
 * @remarks
 * - 左側に戻るボタンを配置
 * - 中央にアイコン付きタイトル
 * - 右側は空きスペース（レイアウト調整用）
 * - sticky配置でスクロール時も上部に固定
 */
export function LogPageHeader({
    title,
    icon: Icon,
    bgColor = "bg-rose-50",
    borderColor = "border-rose-100",
    textColor = "text-rose-900"
}: LogPageHeaderProps) {
    const router = useRouter();

    /**
     * 戻るボタンのクリックハンドラ
     * ブラウザの履歴を1つ戻る
     */
    const handleBack = () => {
        router.back();
    };

    return (
        <div className={`px-6 py-4 ${bgColor} border-b ${borderColor} shadow-sm flex items-center justify-between sticky top-0 z-10`}>
            {/* 戻るボタン */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className={`-ml-2 hover:${bgColor} ${textColor}`}
            >
                <ChevronLeft className="h-6 w-6" />
            </Button>

            {/* タイトル */}
            <h1 className={`font-bold text-xl ${textColor} flex items-center gap-2`}>
                <Icon className="h-5 w-5" />
                {title}
            </h1>

            {/* レイアウト調整用スペーサー */}
            <div className="w-10" />
        </div>
    );
}
