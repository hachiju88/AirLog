/**
 * useVoiceRecognition フックのテスト
 * 
 * @module __tests__/hooks/useVoiceRecognition.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

describe('useVoiceRecognition', () => {
    let mockRecognition: any;

    beforeEach(() => {
        // SpeechRecognition のモッククラスを作成
        mockRecognition = {
            start: vi.fn(),
            stop: vi.fn(),
            continuous: false,
            interimResults: false,
            lang: '',
            onresult: null,
            onend: null,
        };

        // コンストラクタとして動作するモックを設定
        class MockSpeechRecognition {
            start = mockRecognition.start;
            stop = mockRecognition.stop;
            continuous = mockRecognition.continuous;
            interimResults = mockRecognition.interimResults;
            lang = mockRecognition.lang;
            onresult = mockRecognition.onresult;
            onend = mockRecognition.onend;

            constructor() {
                // プロパティを共有オブジェクトと同期
                Object.defineProperty(this, 'continuous', {
                    get: () => mockRecognition.continuous,
                    set: (val) => { mockRecognition.continuous = val; }
                });
                Object.defineProperty(this, 'interimResults', {
                    get: () => mockRecognition.interimResults,
                    set: (val) => { mockRecognition.interimResults = val; }
                });
                Object.defineProperty(this, 'lang', {
                    get: () => mockRecognition.lang,
                    set: (val) => { mockRecognition.lang = val; }
                });
            }
        }

        (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });

    afterEach(() => {
        vi.clearAllMocks();
        delete (window as any).webkitSpeechRecognition;
    });

    describe('初期化', () => {
        it('ブラウザが対応している場合、isSupportedがtrueになる', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            expect(result.current.isSupported).toBe(true);
        });

        it('初期状態ではisListeningがfalseである', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            expect(result.current.isListening).toBe(false);
        });

        it('初期状態ではtranscriptが空文字である', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            expect(result.current.transcript).toBe('');
        });

        it('初期状態ではinterimTranscriptが空文字である', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            expect(result.current.interimTranscript).toBe('');
        });
    });

    describe('設定オプション', () => {
        it('デフォルトの言語は日本語(ja-JP)である', () => {
            renderHook(() => useVoiceRecognition());
            expect(mockRecognition.lang).toBe('ja-JP');
        });

        it('言語オプションをカスタマイズできる', () => {
            renderHook(() => useVoiceRecognition({ lang: 'en-US' }));
            expect(mockRecognition.lang).toBe('en-US');
        });

        it('continuous オプションを設定できる', () => {
            renderHook(() => useVoiceRecognition({ continuous: true }));
            expect(mockRecognition.continuous).toBe(true);
        });

        it('interimResults オプションを設定できる', () => {
            renderHook(() => useVoiceRecognition({ interimResults: false }));
            expect(mockRecognition.interimResults).toBe(false);
        });
    });

    describe('startListening メソッド', () => {
        it('startListening を呼ぶと SpeechRecognition.start が呼ばれる', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            act(() => {
                result.current.startListening();
            });
            expect(mockRecognition.start).toHaveBeenCalled();
        });
    });

    describe('stopListening メソッド', () => {
        it('stopListening を呼ぶと SpeechRecognition.stop が呼ばれる', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            act(() => {
                result.current.startListening();
                result.current.stopListening();
            });
            expect(mockRecognition.stop).toHaveBeenCalled();
        });
    });

    describe('clearTranscript メソッド', () => {
        it('clearTranscript を呼ぶとトランスクリプトがクリアされる', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            act(() => {
                result.current.clearTranscript();
            });
            expect(result.current.transcript).toBe('');
            expect(result.current.interimTranscript).toBe('');
        });
    });

    describe('toggleListening メソッド', () => {
        it('toggleListening が関数として返される', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            expect(typeof result.current.toggleListening).toBe('function');
        });
    });

    describe('setTranscript メソッド', () => {
        it('setTranscript が関数として返される', () => {
            const { result } = renderHook(() => useVoiceRecognition());
            expect(typeof result.current.setTranscript).toBe('function');
        });
    });
});

describe('useVoiceRecognition (未対応ブラウザ)', () => {
    beforeEach(() => {
        delete (window as any).webkitSpeechRecognition;
    });

    it('対応していないブラウザでは isSupported が false になる', () => {
        const { result } = renderHook(() => useVoiceRecognition());
        expect(result.current.isSupported).toBe(false);
    });
});
