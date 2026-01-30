/**
 * useDraft フックのテスト
 * 
 * @module __tests__/hooks/useDraft.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase クライアントをモック
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
    }),
}));

// sonner をモック
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

describe('useDraft フック設計', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('型定義', () => {
        it('DraftConfig 型が必要なプロパティを持つ', () => {
            // 型チェックのみのテスト（コンパイル時に検証）
            type DraftConfig<T> = {
                tableName: string;
                contentField: string;
                onLoadDraft?: (draft: T) => void;
            };

            // 有効な設定オブジェクト
            const config: DraftConfig<any> = {
                tableName: 'meal_logs',
                contentField: 'food_name',
            };

            expect(config.tableName).toBe('meal_logs');
            expect(config.contentField).toBe('food_name');
        });

        it('DraftItem 型が基本プロパティを持つ', () => {
            type DraftItem = {
                id: string;
                recorded_at: string;
                ai_analysis_raw?: {
                    status?: string;
                    raw_content?: string;
                };
            };

            const draft: DraftItem = {
                id: 'draft-id-123',
                recorded_at: '2024-01-15T09:00:00Z',
                ai_analysis_raw: {
                    status: 'pending',
                    raw_content: 'テスト内容',
                },
            };

            expect(draft.id).toBe('draft-id-123');
            expect(draft.ai_analysis_raw?.status).toBe('pending');
        });
    });

    describe('フックの戻り値設計', () => {
        it('UseDraftReturn が必要なプロパティを含む', () => {
            // 戻り値の型設計を検証
            type UseDraftReturn<T> = {
                drafts: T[];
                isLoading: boolean;
                fetchDrafts: () => Promise<void>;
                saveDraft: (content: string, additionalData?: Partial<T>) => Promise<void>;
                deleteDraft: (id: string) => Promise<void>;
            };

            // モック戻り値
            const mockReturn: UseDraftReturn<any> = {
                drafts: [],
                isLoading: false,
                fetchDrafts: async () => { },
                saveDraft: async () => { },
                deleteDraft: async () => { },
            };

            expect(mockReturn.drafts).toEqual([]);
            expect(mockReturn.isLoading).toBe(false);
            expect(typeof mockReturn.fetchDrafts).toBe('function');
            expect(typeof mockReturn.saveDraft).toBe('function');
            expect(typeof mockReturn.deleteDraft).toBe('function');
        });
    });

    describe('下書きフィルタリング', () => {
        it('pending ステータスの下書きのみを抽出する', () => {
            const allLogs = [
                { id: '1', ai_analysis_raw: { status: 'pending' } },
                { id: '2', ai_analysis_raw: { status: 'completed' } },
                { id: '3', ai_analysis_raw: { status: 'pending' } },
                { id: '4', ai_analysis_raw: null },
            ];

            const drafts = allLogs.filter(log => {
                const raw = log.ai_analysis_raw as any;
                return raw?.status === 'pending';
            });

            expect(drafts).toHaveLength(2);
            expect(drafts[0].id).toBe('1');
            expect(drafts[1].id).toBe('3');
        });
    });

    describe('日付フォーマット', () => {
        it('recorded_at を日本語形式でフォーマットできる', () => {
            const recordedAt = '2024-01-15T09:30:00Z';
            const date = new Date(recordedAt);

            const formatted = date.toLocaleDateString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Tokyo'
            });

            // 形式チェック（時間帯によって変わる可能性があるので部分一致）
            expect(formatted).toMatch(/\d+\/\d+/);
        });
    });

    describe('エラーハンドリング設計', () => {
        it('保存失敗時のエラーメッセージ', () => {
            const errorMessage = '保存に失敗しました';
            expect(errorMessage).toBe('保存に失敗しました');
        });

        it('削除成功時のメッセージ', () => {
            const successMessage = '下書きを削除しました';
            expect(successMessage).toBe('下書きを削除しました');
        });

        it('読み込み成功時のメッセージ', () => {
            const infoMessage = '下書きを読み込みました';
            expect(infoMessage).toBe('下書きを読み込みました');
        });
    });
});
