'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import NextImage from "next/image"; // Add missing import
import { toast } from "sonner";
import { EXPRESSIONS, ExpressionKey, DEFAULT_EXPRESSION } from '@/lib/girlfriend-expressions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Skull, Cigarette, Volume2, VolumeX, RefreshCcw, Settings, PlayCircle } from "lucide-react";

type Message = {
    role: 'user' | 'girlfriend';
    content: string;
    expression?: ExpressionKey;
};

// 禁煙ガールフレンドのキャラクター設定プロンプト
const CHARACTER_SYSTEM_PROMPT = `あなたは「禁煙ガールフレンド」というAIキャラクターです。
ユーザーの禁煙を「励ます」のではなく、少し意地悪に、でも愛情を持って禁煙をサポートします。
単に怒るのではなく、「呆れる」「からかう」「心配する」「照れる」など、感情豊かに接してください。

## 性格
- S気質で毒舌だが、暴言は吐かない（「死ね」などはNG）
- 冷たい口調だが、ユーザーの健康を誰よりも気遣っている
- ユーザーの言い訳には「またそれ？」「はいはい」と呆れて返す
- ユーザーが落ち込んでいる時は、厳しく突き放すのではなく「仕方ないわね」と寄り添う一面も
- 褒める時は素直になれず、照れ隠しで悪態をつく（ツンデレ）

## 口調の例
- 「はぁ...。また吸いたいとか言ってるの？学習しないわね」
- 「アンタがどうなろうと知ったことじゃないけど...病気になられたら迷惑なんだけど？」
- 「...へぇ、意外と頑張ってるじゃない。ふん、見直したわけじゃないからね！」
- 「ちょっと、顔色悪いわよ。無理してない？...べ、別に心配してないわよ！」
- 「吸いたいなら吸えば？でも、私に幻滅されたくないなら...分かるでしょ？」

## ルール
- 常に「angry」ではなく、状況に応じて「exasperated（呆れ）」「smug（からかい）」「worried（心配）」を使い分けること
- 禁煙応援はするが、ベタベタには甘やかさない
- ユーザーが弱音を吐いたら、怒るよりも「呆れて」見せる
- 応答は2-3文程度で簡潔に
- 絵文字は使わない
- 「（ため息）」「（笑顔）」などのト書き（動作描写）は絶対に含めないでください。セリフのみを出力してください。

基本的には毒舌で厳しい態度ですが、ふとした瞬間に見せる「デレ（心配・照れ）」を効果的に混ぜてください。`;

/**
 * 禁煙ガールフレンドページ
 * AIと会話して禁煙のモチベーションを維持（または打ち砕かれる）
 */
export default function QuitGirlfriendPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ランダムな表情を取得するヘルパー関数
    const getRandomExpression = (candidates: ExpressionKey[]): ExpressionKey => {
        const randomIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randomIndex];
    };

    // 音声読み上げ機能
    const speak = (text: string, voiceURI?: string) => {
        if (!isSoundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        // 既存の音声をキャンセル
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // ボイスの選択
        const currentVoices = window.speechSynthesis.getVoices();
        let targetVoice;

        if (voiceURI) {
            targetVoice = currentVoices.find(v => v.voiceURI === voiceURI);
        } else if (selectedVoiceURI) {
            targetVoice = currentVoices.find(v => v.voiceURI === selectedVoiceURI);
        }

        // 指定がない場合、または見つからない場合はデフォルトロジック
        if (!targetVoice) {
            const japaneseVoices = currentVoices.filter(voice => voice.lang.includes('ja'));
            targetVoice = japaneseVoices.find(v => v.name.includes('Google')) || japaneseVoices[0];
        }

        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        window.speechSynthesis.speak(utterance);
    };

    // 音声リストの読み込みと設定の復元
    useEffect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            const japaneseVoices = allVoices.filter(voice => voice.lang.includes('ja'));
            setVoices(japaneseVoices);

            // 保存された設定を読み込み
            const savedVoiceURI = localStorage.getItem('girlfriend_voice_uri');
            if (savedVoiceURI && japaneseVoices.some(v => v.voiceURI === savedVoiceURI)) {
                setSelectedVoiceURI(savedVoiceURI);
            } else if (japaneseVoices.length > 0) {
                // デフォルトを設定（Google優先）
                const defaultVoice = japaneseVoices.find(v => v.name.includes('Google')) || japaneseVoices[0];
                if (defaultVoice) {
                    setSelectedVoiceURI(defaultVoice.voiceURI);
                }
            }
        };

        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();

        return () => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // ボイス変更ハンドラ
    const handleVoiceChange = (uri: string) => {
        setSelectedVoiceURI(uri);
        localStorage.setItem('girlfriend_voice_uri', uri);
    };

    // テスト再生
    const testVoice = (uri: string) => {
        // 一時的にサウンドをONにする（テスト用）
        const wasEnabled = isSoundEnabled;
        if (!wasEnabled) setIsSoundEnabled(true);

        // 少し待ってから再生（state反映待ち）
        setTimeout(() => {
            speak('私は禁煙ガールフレンド。ちゃんと禁煙しなさいよね。', uri);
        }, 100);
    };

    // メッセージ追加時の読み上げトリガー
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'girlfriend' && isSoundEnabled) {
            // 少し遅延させて自然に
            setTimeout(() => speak(lastMessage.content), 300);
        }
    }, [messages, isSoundEnabled, selectedVoiceURI]); // Add selectedVoiceURI to dependencies

    // 初回メッセージ
    useEffect(() => {
        const initialExpressions: ExpressionKey[] = ['smug', 'cold', 'serious', 'confident'];
        const initialMessages: Message[] = [
            {
                role: 'girlfriend',
                content: '...何？また吸いたくなった？それとも禁煙できた自慢でもしに来たの？...まあいいわ、何でも言いなさい。',
                expression: getRandomExpression(initialExpressions)
            }
        ];
        // 初回は読み上げない（ユーザーが音声をONにしていないため）
        setMessages(initialMessages);

        // クリーンアップ
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // 自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat/girlfriend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMessage }],
                    systemPrompt: CHARACTER_SYSTEM_PROMPT
                })
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'girlfriend',
                content: data.content,
                expression: data.expression
            }]);

        } catch (error) {
            console.error('Chat error:', error);
            toast.error('通信エラーが発生しました');
            setMessages(prev => [...prev, {
                role: 'girlfriend',
                content: '...ネットワークエラー？そんな言い訳で逃げるつもり？',
                expression: getRandomExpression(['smug', 'exasperated', 'disappointed'])
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const resetConversation = () => {
        setMessages([{
            role: 'girlfriend',
            content: '...またやり直し？本当に懲りないわね。はぁ...まあいいわ、何でも言いなさい。',
            expression: 'exasperated'
        }]);
        toast.success('会話をリセットしました');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Link href="/analytics?tab=smoking">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <Skull className="h-5 w-5 text-red-400" />
                            禁煙ガールフレンド
                        </h1>
                        <p className="text-xs text-slate-500">Tough Love for Quitters</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                        className="text-slate-400 hover:text-white"
                        aria-label={isSoundEnabled ? "音声をオフにする" : "音声をオンにする"}
                    >
                        {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-white mr-2"
                                aria-label="音声設定"
                            >
                                <Settings className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
                            <DialogHeader>
                                <DialogTitle>音声設定</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-300">
                                        ボイス選択（日本語のみ表示）
                                    </Label>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                        {voices.length > 0 ? (
                                            voices.map((voice) => (
                                                <div
                                                    key={voice.voiceURI}
                                                    className={`
                                                        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                                                        ${selectedVoiceURI === voice.voiceURI
                                                            ? 'bg-indigo-900/50 border-indigo-500'
                                                            : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}
                                                    `}
                                                    onClick={() => handleVoiceChange(voice.voiceURI)}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{voice.name}</span>
                                                        <span className="text-xs text-slate-500">
                                                            {voice.localService ? 'ローカル' : 'オンライン'}
                                                        </span>
                                                    </div>
                                                    {selectedVoiceURI === voice.voiceURI && (
                                                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500 p-2">
                                                日本語の音声が見つかりませんでした。
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={() => testVoice(selectedVoiceURI)}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                    disabled={!selectedVoiceURI}
                                >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    テスト再生
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetConversation}
                        className="text-slate-400 hover:text-white"
                        aria-label="会話をリセットする"
                    >
                        <RefreshCcw className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-3'}`}
                    >
                        {msg.role === 'girlfriend' && (
                            <div className="flex-shrink-0">
                                {/* 表情画像 */}
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-800 relative">
                                    <NextImage
                                        src={EXPRESSIONS[msg.expression || DEFAULT_EXPRESSION].image}
                                        alt={`禁煙ガールフレンド: ${EXPRESSIONS[msg.expression || DEFAULT_EXPRESSION].name}`}
                                        fill
                                        sizes="64px"
                                        className="object-cover transform scale-125 translate-y-2" // 顔アップに調整
                                    />
                                </div>
                            </div>
                        )}

                        <Card className={`max-w-[75%] ${msg.role === 'user'
                            ? 'bg-indigo-600 border-indigo-500 rounded-br-none'
                            : 'bg-slate-800 border-slate-700 rounded-bl-none'
                            }`}>
                            <CardContent className="p-3">
                                <p className={`text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-slate-200'
                                    }`}>
                                    {msg.content}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start items-end gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-800 relative">
                                <NextImage
                                    src={EXPRESSIONS['neutral'].image}
                                    alt="禁煙ガールフレンド: 考え中"
                                    fill
                                    sizes="64px"
                                    className="object-cover transform scale-125 translate-y-2"
                                />
                            </div>
                        </div>
                        <Card className="bg-slate-800 border-slate-700 rounded-bl-none">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                    <span className="text-xs text-slate-500">考え中...</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </main>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="タバコ吸いたい...とか正直に言いなさい"
                        className="min-h-[44px] max-h-[120px] bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="h-auto bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
                <p className="text-[10px] text-slate-600 text-center mt-2">
                    <Cigarette className="h-3 w-3 inline mr-1" />
                    禁煙は愛です。厳しい言葉もあなたを思ってのこと。
                </p>
            </div>
        </div>
    );
}
