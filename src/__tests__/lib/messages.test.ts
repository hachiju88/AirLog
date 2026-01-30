import { describe, it, expect } from 'vitest';
import {
    TOAST_MESSAGES,
    VALIDATION_MESSAGES,
    PLACEHOLDERS,
    PAGE_TITLES,
    BUTTON_LABELS,
    DIALOG_MESSAGES,
    NUTRIENT_LABELS,
    EMPTY_STATE,
} from '@/lib/messages';

describe('messages.ts - 定数定義', () => {
    describe('TOAST_MESSAGES', () => {
        it('成功メッセージが定義されている', () => {
            expect(TOAST_MESSAGES.SAVE_SUCCESS).toBe('記録しました');
            expect(TOAST_MESSAGES.DRAFT_SAVED).toBe('下書きとして保存しました');
            expect(TOAST_MESSAGES.FAVORITE_SAVED).toBe('My Menuに登録しました');
        });

        it('エラーメッセージが定義されている', () => {
            expect(TOAST_MESSAGES.LOGIN_REQUIRED).toBe('ログインが必要です');
            expect(TOAST_MESSAGES.SAVE_FAILED).toBe('保存に失敗しました');
            expect(TOAST_MESSAGES.NETWORK_ERROR).toBe('通信エラーが発生しました');
        });

        it('動的メッセージ関数が正しく動作する', () => {
            expect(TOAST_MESSAGES.WEIGHT_MEASURED(65.5)).toBe('測定完了: 65.5kg');
            expect(TOAST_MESSAGES.FAVORITE_ITEMS_LOADED(3)).toBe('My Menuから3件読み込みました');
            expect(TOAST_MESSAGES.MENU_LOADED('サラダ')).toBe('My Menuから「サラダ」を読み込みました');
        });
    });

    describe('VALIDATION_MESSAGES', () => {
        it('バリデーションメッセージが定義されている', () => {
            expect(VALIDATION_MESSAGES.WEIGHT_REQUIRED).toBe('体重を入力してください');
            expect(VALIDATION_MESSAGES.EXERCISE_NAME_REQUIRED).toBe('種目名を入力してください');
        });
    });

    describe('PLACEHOLDERS', () => {
        it('プレースホルダーが定義されている', () => {
            expect(PLACEHOLDERS.MEAL_EXAMPLE).toContain('ライスS');
            expect(PLACEHOLDERS.EXERCISE_EXAMPLE).toContain('ベンチプレス');
        });
    });

    describe('PAGE_TITLES', () => {
        it('ページタイトルが定義されている', () => {
            expect(PAGE_TITLES.MEAL_LOG).toBe('食事を記録');
            expect(PAGE_TITLES.EXERCISE_LOG).toBe('運動を記録');
            expect(PAGE_TITLES.WEIGHT_LOG).toBe('体重を記録');
            expect(PAGE_TITLES.SETTINGS).toBe('設定');
        });
    });

    describe('BUTTON_LABELS', () => {
        it('ボタンラベルが定義されている', () => {
            expect(BUTTON_LABELS.SAVE).toBe('保存');
            expect(BUTTON_LABELS.CANCEL).toBe('キャンセル');
            expect(BUTTON_LABELS.DELETE).toBe('削除する');
        });
    });

    describe('DIALOG_MESSAGES', () => {
        it('ダイアログメッセージが定義されている', () => {
            expect(DIALOG_MESSAGES.DELETE_DRAFT_TITLE).toBe('下書きを削除');
            expect(DIALOG_MESSAGES.RECORD_COMPLETE_TITLE).toBe('記録しました！');
        });
    });

    describe('NUTRIENT_LABELS', () => {
        it('栄養素ラベルが定義されている', () => {
            expect(NUTRIENT_LABELS.PROTEIN).toBe('タンパク質');
            expect(NUTRIENT_LABELS.FAT).toBe('脂質');
            expect(NUTRIENT_LABELS.CARBS).toBe('炭水化物');
            expect(NUTRIENT_LABELS.CALORIES).toBe('カロリー');
        });
    });

    describe('EMPTY_STATE', () => {
        it('空状態メッセージが定義されている', () => {
            expect(EMPTY_STATE.NO_MEALS).toBe('まだ記録がありません');
            expect(EMPTY_STATE.NO_FAVORITES).toBe('My Menuはまだありません');
        });
    });
});
