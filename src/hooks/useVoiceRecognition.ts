'use client';

/**
 * 音声認識カスタムフック
 * 
 * Web Speech APIを使用した音声認識機能を提供。
 * meal/page.tsx と exercise/page.tsx で重複していたロジックを統合。
 * 
 * @module hooks/useVoiceRecognition
 * 
 * @example
 * ```tsx
 * const { isListening, transcript, toggleListening } = useVoiceRecognition({
 *     onFinalResult: (text) => console.log('認識結果:', text)
 * });
 * ```
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ===== 型定義 =====

/**
 * useVoiceRecognitionフックのオプション
 */
interface UseVoiceRecognitionOptions {
    /** 認識言語 (デフォルト: 'ja-JP') */
    lang?: string;
    /** 継続的に認識を行うか (デフォルト: true) */
    continuous?: boolean;
    /** 中間結果を取得するか (デフォルト: true) */
    interimResults?: boolean;
    /** 最終結果確定時のコールバック */
    onFinalResult?: (text: string) => void;
}

/**
 * useVoiceRecognitionフックの戻り値
 */
interface UseVoiceRecognitionReturn {
    /** 現在認識中かどうか */
    isListening: boolean;
    /** 確定済みの認識テキスト */
    transcript: string;
    /** 認識中の暫定テキスト */
    interimTranscript: string;
    /** 認識を開始する */
    startListening: () => void;
    /** 認識を停止する */
    stopListening: () => void;
    /** 認識の開始/停止を切り替える */
    toggleListening: () => void;
    /** 認識テキストをクリアする */
    clearTranscript: () => void;
    /** 認識テキストを直接設定する */
    setTranscript: (text: string) => void;
    /** 音声認識APIがサポートされているか */
    isSupported: boolean;
}

// ===== Web Speech API 型定義 =====

/** 音声認識イベント */
interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

/** 音声認識インスタンス */
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
}

/**
 * ブラウザでの音声認識APIサポートをチェック
 * 
 * @returns サポートされている場合true
 */
const checkSupport = (): boolean => {
    if (typeof window === 'undefined') return false;
    return 'webkitSpeechRecognition' in window;
};

/**
 * 音声認識を共通化するカスタムフック
 * 
 * @param options - フックのオプション設定
 * @returns 音声認識の状態と操作関数
 * 
 * @remarks
 * - Safari/Chromeでのみ動作 (webkitSpeechRecognition)
 * - 認識中は自動的に再接続を試みる
 * - SSR対応済み
 */
export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
    const {
        lang = 'ja-JP',
        continuous = true,
        interimResults = true,
        onFinalResult
    } = options;

    // ===== 状態管理 =====
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    // ===== 参照 =====
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const isListeningRef = useRef(false);

    // ===== 初期化時のみサポート状況をチェック =====
    const isSupported = useMemo(() => checkSupport(), []);

    /**
     * 音声認識インスタンスの初期化
     * 
     * コンポーネントマウント時に一度だけ実行。
     * 認識結果と終了イベントのハンドラを設定。
     */
    useEffect(() => {
        if (!isSupported) return;

        // @ts-expect-error - webkitSpeechRecognition is not in types
        const SpeechRecognitionAPI = window.webkitSpeechRecognition as new () => SpeechRecognition;
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = continuous;
        recognitionRef.current.interimResults = interimResults;
        recognitionRef.current.lang = lang;

        // 認識結果のハンドラ
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            let newFinal = '';
            let newInterim = '';

            // 結果を確定/暫定に分類
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    newFinal += event.results[i][0].transcript;
                } else {
                    newInterim += event.results[i][0].transcript;
                }
            }

            // 確定テキストがあれば追記
            if (newFinal) {
                setTranscript(prev => prev + newFinal);
                onFinalResult?.(newFinal);
            }
            setInterimTranscript(newInterim);
        };

        // 終了時の自動再接続ハンドラ
        recognitionRef.current.onend = () => {
            if (isListeningRef.current && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch {
                    // 既に開始されている場合は無視
                }
            }
        };
    }, [isSupported, lang, continuous, interimResults, onFinalResult]);

    /**
     * isListeningの状態をrefに同期
     * 
     * onendコールバック内で最新の状態を参照するため。
     */
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    /**
     * 音声認識を開始する
     */
    const startListening = useCallback(() => {
        if (!isSupported || !recognitionRef.current) return;

        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch {
            // 既に開始されている場合は無視
        }
    }, [isSupported]);

    /**
     * 音声認識を停止する
     */
    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;

        recognitionRef.current.stop();
        setIsListening(false);
        setInterimTranscript('');
    }, []);

    /**
     * 音声認識の開始/停止を切り替える
     */
    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    /**
     * 認識テキストをクリアする
     */
    const clearTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        toggleListening,
        clearTranscript,
        setTranscript,
        isSupported
    };
}
