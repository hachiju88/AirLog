'use client';

/**
 * 下書きリストコンポーネント
 * 
 * 食事/運動ログページで保存済みの下書きを一覧表示し、
 * 読み込み・削除操作を提供する。
 * 
 * @module components/log/DraftList
 * 
 * @example
 * ```tsx
 * <DraftList
 *     drafts={drafts}
 *     nameField="food_name"
 *     onLoadDraft={(draft) => handleLoad(draft)}
 *     onDeleteDraft={(id) => handleDelete(id)}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { SECTION_TITLES } from "@/lib/messages";

// ===== 型定義 =====

/**
 * 下書きレコードの型定義
 */
interface Draft {
    /** レコードID (UUID) */
    id: string;
    /** 記録日時 */
    recorded_at: string;
    /** AI解析の生データ */
    ai_analysis_raw?: {
        raw_content?: string;
    };
    /** その他のフィールド (テーブルによって異なる) */
    [key: string]: unknown;
}

/**
 * DraftListコンポーネントのProps
 */
interface DraftListProps {
    /** 下書きレコードの配列 */
    drafts: Draft[];
    /** 名前フィールド名 (テーブルによって異なる) */
    nameField: 'food_name' | 'exercise_name';
    /** 下書き読み込み時のコールバック */
    onLoadDraft: (draft: Draft) => void;
    /** 下書き削除時のコールバック */
    onDeleteDraft: (id: string) => void;
    /** セクションタイトル (オプション) */
    title?: string;
}

/**
 * 下書きリストコンポーネント
 * 
 * @param props - コンポーネントのプロパティ
 * @returns 下書きリストのJSX要素、または空の場合はnull
 * 
 * @remarks
 * - 下書きがない場合は何も表示しない
 * - 各行クリックで読み込み、×ボタンで削除
 * - 日時はJSTでフォーマット表示
 */
export function DraftList({
    drafts,
    nameField,
    onLoadDraft,
    onDeleteDraft,
    title = SECTION_TITLES.DRAFTS
}: DraftListProps) {
    // 下書きがない場合は表示しない
    if (drafts.length === 0) return null;

    /**
     * 下書きの表示名を取得
     * 
     * @param draft - 下書きレコード
     * @returns 表示用のテキスト
     */
    const getDisplayName = (draft: Draft): string => {
        return draft.ai_analysis_raw?.raw_content || String(draft[nameField] ?? '');
    };

    /**
     * 日時を日本語フォーマットで取得
     * 
     * @param dateString - ISO8601形式の日時文字列
     * @returns フォーマット済みの日時文字列
     */
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('ja-JP', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Tokyo'
        });
    };

    /**
     * 削除ボタンのクリックハンドラ
     * 
     * 行クリックのイベント伝播を止めて削除のみ実行
     * 
     * @param e - マウスイベント
     * @param id - 削除する下書きのID
     */
    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteDraft(id);
    };

    return (
        <div className="mt-6">
            {/* セクションタイトル */}
            <h3 className="text-xs font-bold text-slate-500 mb-2">{title}</h3>

            {/* 下書きリスト */}
            <div className="space-y-2">
                {drafts.map(draft => (
                    <div
                        key={draft.id}
                        onClick={() => onLoadDraft(draft)}
                        className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 active:bg-slate-50 cursor-pointer flex justify-between items-center"
                    >
                        {/* 下書き名 */}
                        <span className="truncate flex-1 font-medium">
                            {getDisplayName(draft)}
                        </span>

                        {/* 日時と削除ボタン */}
                        <div className="flex items-center">
                            <span className="text-xs text-slate-400 mx-2 whitespace-nowrap">
                                {formatDate(draft.recorded_at)}
                            </span>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => handleDeleteClick(e, draft.id)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
