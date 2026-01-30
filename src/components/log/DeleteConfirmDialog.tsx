'use client';

/**
 * 削除確認ダイアログコンポーネント
 * 
 * 下書き削除など、破壊的アクション前にユーザーに確認を求める
 * AlertDialogベースのモーダル。
 * 
 * @module components/log/DeleteConfirmDialog
 * 
 * @example
 * ```tsx
 * <DeleteConfirmDialog
 *     isOpen={isDeleteDialogOpen}
 *     onClose={() => setIsDeleteDialogOpen(false)}
 *     onConfirm={handleConfirmDelete}
 *     title="下書きを削除"
 *     description="この下書きを削除してもよろしいですか？"
 * />
 * ```
 */

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DIALOG_MESSAGES, BUTTON_LABELS } from "@/lib/messages";

// ===== 型定義 =====

/**
 * DeleteConfirmDialogコンポーネントのProps
 */
interface DeleteConfirmDialogProps {
    /** ダイアログの表示状態 */
    isOpen: boolean;
    /** ダイアログを閉じる時のコールバック */
    onClose: () => void;
    /** 削除確定時のコールバック */
    onConfirm: () => void;
    /** ダイアログタイトル (オプション) */
    title?: string;
    /** ダイアログ説明文 (オプション) */
    description?: string;
}

/**
 * 削除確認ダイアログコンポーネント
 * 
 * @param props - コンポーネントのプロパティ
 * @returns AlertDialogのJSX要素
 * 
 * @remarks
 * - デフォルトでは下書き削除用の文言を使用
 * - title/descriptionで任意の確認文言に変更可能
 * - キャンセルボタンと削除ボタンを表示
 * - 削除ボタンは赤色でハイライト
 */
export function DeleteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = DIALOG_MESSAGES.DELETE_DRAFT_TITLE,
    description = DIALOG_MESSAGES.DELETE_DRAFT_DESC
}: DeleteConfirmDialogProps) {
    /**
     * ダイアログの開閉状態変更ハンドラ
     * 
     * @param open - 新しい開閉状態
     */
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                {/* ヘッダー */}
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>

                {/* フッター（ボタン群） */}
                <AlertDialogFooter>
                    <AlertDialogCancel>{BUTTON_LABELS.CANCEL}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        {BUTTON_LABELS.DELETE}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
