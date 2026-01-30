/**
 * スワイプジェスチャー検知フック
 *
 * タッチイベントを監視し、水平スワイプを検知してコールバックを実行する。
 * 依存ライブラリなしでネイティブTouch APIを使用。
 *
 * @module hooks/useSwipeGesture
 *
 * @example
 * ```tsx
 * const containerRef = useSwipeGesture({
 *   onSwipeLeft: () => setTab('next'),
 *   onSwipeRight: () => setTab('prev'),
 *   threshold: 50
 * });
 * return <div ref={containerRef}>...</div>;
 * ```
 */

'use client';

import { useRef, useCallback, useEffect } from 'react';

// ===== 型定義 =====

/**
 * useSwipeGesture フックのオプション
 */
export interface UseSwipeGestureOptions {
    /** 左スワイプ時のコールバック */
    onSwipeLeft?: () => void;
    /** 右スワイプ時のコールバック */
    onSwipeRight?: () => void;
    /** スワイプ検知の閾値（ピクセル数）デフォルト: 50 */
    threshold?: number;
    /** 垂直移動の許容範囲（これを超えるとスワイプ無効）デフォルト: 100 */
    verticalThreshold?: number;
}

/**
 * タッチ開始位置を記録する型
 */
interface TouchPosition {
    x: number;
    y: number;
    time: number;
}

// ===== メインフック =====

/**
 * スワイプジェスチャーを検知するカスタムフック
 *
 * @param options - スワイプオプション
 * @returns 要素にアタッチするref
 *
 * @remarks
 * - 50px以上の水平移動でスワイプと判定
 * - 垂直移動が大きい場合はスクロールと判断しスワイプ無効
 * - 高速なスワイプほど検知しやすい
 */
export function useSwipeGesture<T extends HTMLElement = HTMLDivElement>(
    options: UseSwipeGestureOptions
) {
    const {
        onSwipeLeft,
        onSwipeRight,
        threshold = 50,
        verticalThreshold = 100
    } = options;

    const elementRef = useRef<T | null>(null);
    const touchStartRef = useRef<TouchPosition | null>(null);

    /**
     * タッチ開始時のハンドラ
     * 開始位置と時刻を記録
     */
    const handleTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
    }, []);

    /**
     * タッチ終了時のハンドラ
     * 移動距離を計算しスワイプ判定
     */
    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!touchStartRef.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        // 垂直移動が大きい場合はスクロールと判断
        if (Math.abs(deltaY) > verticalThreshold) {
            touchStartRef.current = null;
            return;
        }

        // 高速スワイプは閾値を下げる
        const adjustedThreshold = deltaTime < 200 ? threshold * 0.6 : threshold;

        // 左スワイプ（右から左へ）
        if (deltaX < -adjustedThreshold && onSwipeLeft) {
            onSwipeLeft();
        }
        // 右スワイプ（左から右へ）
        else if (deltaX > adjustedThreshold && onSwipeRight) {
            onSwipeRight();
        }

        touchStartRef.current = null;
    }, [onSwipeLeft, onSwipeRight, threshold, verticalThreshold]);

    /**
     * イベントリスナーの登録と解除
     */
    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchEnd]);

    return elementRef;
}
