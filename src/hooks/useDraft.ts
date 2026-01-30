'use client';

/**
 * 下書き管理カスタムフック
 * 
 * 食事・運動ログの下書き保存・読み込み・削除機能を提供。
 * meal/page.tsx と exercise/page.tsx で重複していた下書き処理を統合。
 * 
 * @module hooks/useDraft
 * 
 * @example
 * ```tsx
 * const { drafts, saveDraft, loadDraft, deleteDraft } = useDraft({
 *     tableName: 'meal_logs',
 *     nameField: 'food_name'
 * });
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { TOAST_MESSAGES } from '@/lib/messages';

// ===== 型定義 =====

/** 下書きのステータス */
type DraftStatus = 'pending';

/**
 * 下書きレコードの型定義
 */
interface Draft {
    /** レコードID (UUID) */
    id: string;
    /** 記録日時 */
    recorded_at: string;
    /** AI解析の生データ (下書きステータスを含む) */
    ai_analysis_raw: {
        status: DraftStatus;
        raw_content: string;
    };
    /** その他のフィールド (テーブルによって異なる) */
    [key: string]: unknown;
}

/**
 * useDraftフックのオプション
 */
interface UseDraftOptions {
    /** 対象テーブル名 */
    tableName: 'meal_logs' | 'exercise_logs';
    /** 名前フィールド (テーブルによって異なる) */
    nameField: 'food_name' | 'exercise_name';
}

/**
 * useDraftフックの戻り値
 */
interface UseDraftReturn {
    /** 下書きリスト */
    drafts: Draft[];
    /** 読み込み中かどうか */
    isLoading: boolean;
    /** 編集中の下書きID */
    editingId: string | null;
    /** 下書きの日付 */
    draftDate: string | null;
    /** 下書きを読み込む */
    loadDraft: (draft: Draft) => { content: string; date: string };
    /** 下書きを保存する */
    saveDraft: (content: string, inputType?: string) => Promise<void>;
    /** 下書きを削除する */
    deleteDraft: (id: string) => Promise<void>;
    /** 編集中IDを設定する */
    setEditingId: (id: string | null) => void;
    /** 下書き日付を設定する */
    setDraftDate: (date: string | null) => void;
    /** 下書きリストを再取得する */
    refreshDrafts: () => Promise<void>;
}

/**
 * 下書き管理を共通化するカスタムフック
 * 
 * @param options - テーブル名と名前フィールドの指定
 * @returns 下書きの状態と操作関数
 * 
 * @remarks
 * - 下書きは ai_analysis_raw.status === 'pending' で識別
 * - 保存時はカロリー等を0で初期化（後でAI解析で更新）
 * - トースト通知で操作結果をユーザーに通知
 */
export function useDraft({ tableName, nameField }: UseDraftOptions): UseDraftReturn {
    // ===== 状態管理 =====
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftDate, setDraftDate] = useState<string | null>(null);

    /**
     * 下書きリストを取得する
     * 
     * ユーザーのpending状態のログをすべて取得し、
     * 記録日時の降順でソート。
     */
    const fetchDrafts = useCallback(async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: pendingLogs } = await supabase
                .from(tableName)
                .select('*')
                .eq('user_id', user.id)
                .order('recorded_at', { ascending: false });

            if (pendingLogs) {
                // pendingステータスの下書きのみフィルタ
                const validDrafts = pendingLogs.filter(log => {
                    const raw = log.ai_analysis_raw as { status?: string };
                    return raw?.status === 'pending';
                });
                setDrafts(validDrafts as Draft[]);
            }
        } catch (e) {
            console.error('下書きの取得に失敗しました:', e);
        } finally {
            setIsLoading(false);
        }
    }, [tableName]);

    /**
     * 初回マウント時に下書きを取得
     */
    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    /**
     * 下書きを読み込む
     * 
     * 選択された下書きのIDと日付を設定し、
     * 内容を返却する。
     * 
     * @param draft - 読み込む下書きレコード
     * @returns コンテンツと日付
     */
    const loadDraft = useCallback((draft: Draft) => {
        setEditingId(draft.id);
        setDraftDate(draft.recorded_at);
        const raw = draft.ai_analysis_raw;
        const content = raw?.raw_content || String(draft[nameField] ?? '');

        toast.info(TOAST_MESSAGES.DRAFT_LOADED);

        return {
            content,
            date: draft.recorded_at
        };
    }, [nameField]);

    /**
     * 下書きを保存する
     * 
     * 新規の下書きレコードを作成。
     * 栄養データ等は0で初期化し、後でAI解析時に更新する。
     * 
     * @param content - 保存するテキスト内容
     * @param inputType - 入力タイプ (voice/text/photo)
     */
    const saveDraft = useCallback(async (content: string, inputType: string = 'voice') => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 基本レコード構造
            const baseRecord = {
                user_id: user.id,
                [nameField]: content,
                ai_analysis_raw: { status: 'pending', raw_content: content }
            };

            // テーブル固有のフィールドを追加
            const record = tableName === 'meal_logs'
                ? {
                    ...baseRecord,
                    calories: 0,
                    protein_g: 0,
                    fat_g: 0,
                    carbohydrates_g: 0,
                    fiber_g: 0,
                    salt_g: 0,
                    input_type: inputType
                }
                : {
                    ...baseRecord,
                    duration_minutes: 0,
                    calories_burned: 0
                };

            const { data, error } = await supabase.from(tableName).insert([record]).select();
            if (error) throw error;

            // 下書きリストに追加
            if (data) {
                setDrafts(prev => [data[0] as Draft, ...prev]);
            }

            toast.success(TOAST_MESSAGES.DRAFT_SAVED, {
                description: '後で編集できます'
            });
        } catch (e) {
            console.error('下書きの保存に失敗しました:', e);
            toast.error(TOAST_MESSAGES.SAVE_FAILED);
        }
    }, [tableName, nameField]);

    /**
     * 下書きを削除する
     * 
     * @param id - 削除する下書きのID
     */
    const deleteDraft = useCallback(async (id: string) => {
        try {
            const supabase = createClient();
            await supabase.from(tableName).delete().eq('id', id);

            // ローカル状態から削除
            setDrafts(prev => prev.filter(d => d.id !== id));
            toast.success(TOAST_MESSAGES.DRAFT_DELETED);
        } catch (e) {
            console.error('下書きの削除に失敗しました:', e);
            toast.error(TOAST_MESSAGES.DELETE_FAILED);
        }
    }, [tableName]);

    return {
        drafts,
        isLoading,
        editingId,
        draftDate,
        loadDraft,
        saveDraft,
        deleteDraft,
        setEditingId,
        setDraftDate,
        refreshDrafts: fetchDrafts
    };
}
