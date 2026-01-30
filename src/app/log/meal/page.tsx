'use client';

import { Suspense } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, Mic, Check, X, Trash2, StopCircle, Utensils, Star } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from "@/lib/supabase/client";
import { cn, compressImage } from "@/lib/utils";
import { FavoriteSelector } from "../_components/FavoriteSelector";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { LogPageHeader } from "@/components/log";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
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


/**
 * 食事アイテムの型定義
 * AI解析結果や手入力から生成される個々の食品/料理を表す
 */
type MealItem = {
    /** 食品・料理名 */
    name: string;
    /** 食品に対応する絵文字 */
    emoji?: string;
    /** カロリー (kcal) */
    calories: number;
    /** タンパク質 (g) */
    protein: number;
    /** 脂質 (g) */
    fat: number;
    /** 炭水化物 (g) */
    carbs: number;
    /** 食物繊維 (g) */
    fiber: number;
    /** 塩分 (g) */
    salt: number;
    /** 分量倍率 (1.0 = 標準量) */
    portion: number;
};

/**
 * 食事記録ページのメインコンテンツコンポーネント
 *
 * 写真撮影・音声入力・テキスト入力の3種類の方法で
 * 食事を記録できる。AI解析で栄養価を自動計算。
 */
function MealLogContent() {
    // ...
    // Favorites State
    // Bulk save removed, now single item save only.

    /**
     * My Menuから選択されたアイテムを読み込む
     *
     * @param item - 選択されたお気に入りアイテム
     */
    const handleFavoriteSelect = (item: any) => {
        // item.content can be a single object or an array of items
        // If it's a single object (old schema maybe?), wrap it. 
        // But for "Meal", content should ideally be { items: [...] } or just an array.
        // Let's assume content is the stored JSON.

        let loadedItems: MealItem[] = [];

        if (item.content.items && Array.isArray(item.content.items)) {
            loadedItems = item.content.items;
        } else if (item.content.name) {
            // Single item structure
            loadedItems = [{
                name: item.content.name,
                calories: item.content.calories || 0,
                protein: item.content.protein || 0,
                fat: item.content.fat || 0,
                carbs: item.content.carbs || 0,
                fiber: item.content.fiber || 0,
                salt: item.content.salt || 0,
                portion: 1.0
            }];
        }

        if (loadedItems.length > 0) {
            setMealItems(prev => [...prev, ...loadedItems]);
            toast.info(`My Menuから${loadedItems.length}件読み込みました`);
            setActiveTab('voice'); // Switch to results/voice tab context
        } else {
            toast.error("メニューの内容を読み込めませんでした");
        }
    };

    const router = useRouter();
    const [activeTab, setActiveTab] = useState("photo");
    const [mealItems, setMealItems] = useState<MealItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    /** タブの順序 */
    const TAB_ORDER = ['photo', 'voice'];

    /** スワイプジェスチャーref */
    const swipeRef = useSwipeGesture<HTMLDivElement>({
        onSwipeLeft: () => {
            const idx = TAB_ORDER.indexOf(activeTab);
            if (idx < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[idx + 1]);
        },
        onSwipeRight: () => {
            const idx = TAB_ORDER.indexOf(activeTab);
            if (idx > 0) setActiveTab(TAB_ORDER[idx - 1]);
        },
        threshold: 50
    });



    // Photo State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Draft State
    const [drafts, setDrafts] = useState<any[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchDrafts = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: pendingLogs } = await supabase
                .from('meal_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('recorded_at', { ascending: false });

            if (pendingLogs) {
                const validDrafts = pendingLogs.filter(log => {
                    const raw = log.ai_analysis_raw as any;
                    return raw?.status === 'pending';
                });
                setDrafts(validDrafts);
            }
        };
        fetchDrafts();
    }, []);

    /**
     * 下書きを読み込んでフォームに設定する
     *
     * @param draft - 読み込む下書きレコード
     */
    const loadDraft = (draft: any) => {
        setEditingId(draft.id);
        setDraftDate(draft.recorded_at); // Keep date
        const raw = draft.ai_analysis_raw as any;
        const content = raw?.raw_content || draft.food_name;

        // Push to URL for persistence if page refreshes
        const params = new URLSearchParams();
        params.set('draft_id', draft.id);
        params.set('draft_text', content);
        params.set('draft_date', draft.recorded_at);
        params.set('mode', 'voice'); // Always voice/text
        router.replace(`?${params.toString()}`);

        setActiveTab('voice');
        setTextInput(content);
        toast.info('下書きを読み込みました');
    };

    // Voice State
    const [isListening, setIsListening] = useState(false);
    // Removed separate transcript state, using textInput directly
    // const [transcript, setTranscript] = useState(""); 
    // const [interimTranscript, setInterimTranscript] = useState("");
    const recognitionRef = useRef<any>(null);

    // Text State
    const [textInput, setTextInput] = useState("");

    // Calculate totals
    const totalCalories = mealItems.reduce((acc, item) => acc + Math.round(item.calories * item.portion), 0);

    /**
     * ファイル選択時に画像を圧縮してプレビュー表示する
     *
     * @param e - ファイル入力のChangeイベント
     */
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedDataUrl = await compressImage(file);
                setImagePreview(compressedDataUrl);
            } catch (error) {
                console.error("Image compression failed", error);
                toast.error("画像の読み込みに失敗しました");
            }
        }
    };

    /**
     * 写真をAIで解析して食事内容を推定する
     * 結果はmealItemsに追加される
     */
    const analyzePhoto = async () => {
        if (!imagePreview) return;
        setIsAnalyzing(true);
        try {
            const base64Data = imagePreview.split(',')[1];
            const response = await fetch('/api/estimate/meal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Data }),
            });
            const data = await response.json();

            if (response.status === 429) {
                toast.error('AIの利用制限に達しました', {
                    description: 'しばらく時間を空けてから再試行してください。'
                });
                return;
            }

            if (response.ok && data.items) {
                const itemsWithPortion = data.items.map((item: any) => ({ ...item, portion: 1.0 }));
                setMealItems(prev => [...prev, ...itemsWithPortion]);
                setImagePreview(null); // Clear after success
                toast.success('写真を解析しました');
            }
        } catch (error) {
            console.error(error);
            toast.error('解析エラーが発生しました');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- Voice Logic ---
    const isListeningRef = useRef(false);
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'ja-JP';

            recognitionRef.current.onresult = (event: any) => {
                let newFinal = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        newFinal += event.results[i][0].transcript;
                    }
                }

                if (newFinal) {
                    setTextInput(prev => prev + newFinal);
                }
            };

            recognitionRef.current.onend = () => {
                if (isListeningRef.current) {
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        // ignore
                    }
                }
            };
        }
    }, []);

    // Sync ref
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    /**
     * 音声認識の開始・停止を切り替える
     */
    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            // Do not clear textInput on start, allow appending
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    /**
     * 現在の入力内容を下書きとして保存する
     *
     * @param type - 入力タイプ (photo/voice/text)
     * @param content - 保存するテキスト内容
     */
    const saveAsDraft = async (type: 'photo' | 'voice' | 'text', content: string) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const record = {
                user_id: user.id,
                food_name: type === 'photo' ? "解析待ち (写真)" : content,
                calories: 0,
                protein_g: 0,
                fat_g: 0,
                carbohydrates_g: 0,
                fiber_g: 0,
                salt_g: 0,
                input_type: type,
                ai_analysis_raw: { status: 'pending', raw_content: content }
            };

            await supabase.from('meal_logs').insert([record]);

            setTextInput(""); // Reset text input
            toast.success('下書きとして保存しました', { description: '後で編集できます' });
            router.push('/dashboard?refresh=1');
            router.refresh();
        } catch (e) {
            console.error(e);
            toast.error('保存に失敗しました');
        }
    };

    /**
     * 削除確認ダイアログを表示する
     *
     * @param e - クリックイベント
     * @param id - 削除対象の下書きID
     */
    const deleteDraft = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeletingId(id);
    };

    /**
     * 下書きの削除を実行する
     */
    const executeDeleteDraft = async () => {
        if (!deletingId) return;
        const id = deletingId;
        const supabase = createClient();
        await supabase.from('meal_logs').delete().eq('id', id);
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success('下書きを削除しました');
        setDeletingId(null);
    };

    /**
     * テキスト入力をAIで解析して食事内容を推定する
     *
     * @param text - 解析するテキスト
     */
    const analyzeText = async (text: string) => {
        if (!text.trim()) return;
        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/estimate/meal/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            const data = await response.json();

            if (response.status === 429) {
                toast.error('AIの利用制限に達しました', {
                    description: 'しばらく時間を空けてから再試行してください。'
                });
                return;
            }

            if (!response.ok) {
                toast.error(data.error || '解析に失敗しました');
                return;
            }

            if (data.items) {
                const itemsWithPortion = data.items.map((item: any) => ({ ...item, portion: 1.0 }));
                setMealItems(prev => [...prev, ...itemsWithPortion]);
                setTextInput("");
                toast.success('テキストを解析しました');
            }
        } catch (error) {
            console.error(error);
            toast.error('通信エラーが発生しました');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const searchParams = useSearchParams();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftDate, setDraftDate] = useState<string | null>(null);

    useEffect(() => {
        const draftText = searchParams.get('draft_text');
        const draftId = searchParams.get('draft_id');
        const dDate = searchParams.get('draft_date');
        // const mode = searchParams.get('mode'); // Ignored, always voice/text

        if (draftId) {
            setEditingId(draftId);
        }
        if (dDate) {
            setDraftDate(dDate);
        }

        if (draftText) {
            setActiveTab('voice');
            setTextInput(draftText);
        }
    }, [searchParams]);

    /**
     * アイテムの分量を更新する
     *
     * @param index - 対象アイテムのインデックス
     * @param newPortion - 新しい分量倍率
     */
    const updatePortion = (index: number, newPortion: number) => {
        const newItems = [...mealItems];
        newItems[index].portion = newPortion;
        setMealItems(newItems);
    };

    /**
     * アイテムをリストから削除する
     *
     * @param index - 削除対象のインデックス
     */
    const removeItem = (index: number) => {
        const newItems = mealItems.filter((_, i) => i !== index);
        setMealItems(newItems);
    };

    /**
     * 個別のアイテムをMy Menuに保存する
     *
     * @param index - 保存対象のインデックス
     */
    const handleSaveSingleFavorite = async (index: number) => {
        const item = mealItems[index];
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("ログインが必要です");
                return;
            }

            const favoriteData = {
                user_id: user.id,
                type: 'meal',
                name: item.name,
                content: {
                    // Save as single item list for consistency or single object?
                    // Selector supports single object in 'content' if no 'items' array.
                    // Let's use single object structure for simplicity of "Single Item"
                    name: item.name,
                    calories: item.calories,
                    protein: item.protein,
                    fat: item.fat,
                    carbs: item.carbs,
                    fiber: item.fiber,
                    salt: item.salt
                }
            };

            const { error } = await supabase.from('favorites').insert([favoriteData]);
            if (error) throw error;
            toast.success(`「${item.name}」をMy Menuに登録しました`);
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        }
    };

    /**
     * 食事ログをデータベースに保存する
     * 編集中の下書きがあれば更新、なければ新規作成
     */
    const handleSave = async () => {
        if (mealItems.length === 0) return;
        setIsSaving(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const records = mealItems.map(item => ({
                user_id: user.id,
                food_name: item.name,
                calories: Math.round(item.calories * item.portion),
                protein_g: Number((item.protein * item.portion).toFixed(1)),
                fat_g: Number((item.fat * item.portion).toFixed(1)),
                carbohydrates_g: Number((item.carbs * item.portion).toFixed(1)),
                fiber_g: Number((item.fiber * item.portion).toFixed(1)),
                salt_g: Number((item.salt * item.portion).toFixed(1)),
                input_type: activeTab, // photo, voice, text
                ai_analysis_raw: item,
                recorded_at: draftDate || new Date().toISOString() // Use draft date if valid
            }));

            // Save to Favorites logic removed as per request (now single item only)

            if (editingId) {
                // Update existing draft
                await supabase.from('meal_logs').delete().eq('id', editingId);
                await supabase.from('meal_logs').insert(records);
            } else {
                await supabase.from('meal_logs').insert(records);
            }

            toast.success('食事ログを保存しました');
            router.push('/dashboard?refresh=1');
            router.refresh();
        } catch (e) {
            console.error(e);
            toast.error('保存中にエラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative pb-safe">
            <LogPageHeader
                title="食事を記録"
                icon={Utensils}
                bgColor="bg-rose-50"
                borderColor="border-rose-100"
                textColor="text-rose-900"
            />

            <main ref={swipeRef} className="p-4 space-y-6 touch-pan-y">
                <Tabs defaultValue="photo" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="photo"><Camera className="h-4 w-4 mr-2" />写真</TabsTrigger>
                        <TabsTrigger value="voice"><Mic className="h-4 w-4 mr-2" />音声・手入力</TabsTrigger>
                    </TabsList>

                    {/* PHOTO INPUT */}
                    <TabsContent value="photo" className="space-y-4">
                        <div className="flex justify-end">
                            <FavoriteSelector type="meal" onSelect={handleFavoriteSelect} />
                        </div>
                        <div className="relative aspect-video w-full bg-slate-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-slate-300">
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                            ) : (
                                <div className="text-center p-6 text-slate-400">
                                    <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">写真を撮影またはアップロード</p>
                                </div>
                            )}
                            <input
                                type="file" accept="image/*" capture="environment"
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                onChange={handleFileSelect} ref={fileInputRef}
                            />
                        </div>
                        {imagePreview && (
                            <Button className="w-full h-12 bg-indigo-600" onClick={analyzePhoto} disabled={isAnalyzing}>
                                {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                                解析
                            </Button>
                        )}
                        {!imagePreview && (
                            <Button className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="mr-2 h-5 w-5" />
                                カメラ起動
                            </Button>
                        )}
                        {/* Drafts Link for Photo Mode (Optional, maybe user wants to see drafts here too?) */}
                        {drafts.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <Button variant="link" size="sm" className="w-full text-slate-500" onClick={() => setActiveTab('voice')}>
                                    下書きを確認する ({drafts.length})
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    {/* VOICE/TEXT INPUT */}
                    <TabsContent value="voice" className="space-y-4">
                        <div className="flex justify-end">
                            <FavoriteSelector type="meal" onSelect={handleFavoriteSelect} />
                        </div>
                        <div className={`p-4 rounded-xl border-2 ${isListening ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'} transition-colors relative`}>
                            {/* Textarea for both Voice and Manual Input */}
                            <Textarea
                                placeholder="例: ライスSとハンバーグ定食、コーラ1杯"
                                className="text-base p-2 min-h-[120px] bg-transparent border-none focus-visible:ring-0 resize-none"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                            />

                            {/* Clear Button */}
                            {textInput && !isListening && (
                                <Button
                                    size="icon" variant="ghost"
                                    className="absolute top-2 right-2 h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => setTextInput("")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}

                            {/* Voice Status Indicator */}
                            <div className="h-8 flex items-center justify-end px-2">
                                {isListening && (
                                    <span className="animate-pulse text-red-500 text-xs font-bold flex items-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                                        聞き取り中...
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant={isListening ? "destructive" : "default"}
                                className="h-12 w-full"
                                onClick={toggleListening}
                            >
                                {isListening ? <StopCircle className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                                {isListening ? "停止" : "音声"}
                            </Button>
                            <Button
                                className="h-12 w-full bg-rose-600 hover:bg-rose-700"
                                disabled={!textInput || isListening || isAnalyzing}
                                onClick={() => analyzeText(textInput)}
                            >
                                {isAnalyzing ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                                <span className="ml-2">解析</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 w-full border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                                disabled={!textInput || isListening}
                                onClick={() => saveAsDraft('voice', textInput)}
                            >
                                下書き
                            </Button>
                        </div>

                        {/* Recent Drafts */}
                        {drafts.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xs font-bold text-slate-500 mb-2">下書き (再開)</h3>
                                <div className="space-y-2">
                                    {drafts.map(draft => (
                                        <div key={draft.id}
                                            onClick={() => loadDraft(draft)}
                                            className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 active:bg-slate-50 cursor-pointer flex justify-between items-center"
                                        >
                                            <span className="truncate flex-1 font-medium">
                                                {draft.ai_analysis_raw?.raw_content || draft.food_name}
                                            </span>
                                            <div className="flex items-center">
                                                <span className="text-xs text-slate-400 mx-2 whitespace-nowrap">
                                                    {new Date(draft.recorded_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}
                                                </span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={(e) => deleteDraft(e, draft.id)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* RESULTS LIST */}
                {
                    mealItems.length > 0 && (
                        <div className="space-y-6 pt-4 border-t border-slate-100 animate-in slide-in-from-bottom-4 mb-20">
                            {/* Totals Header */}
                            <div className="flex justify-between items-end px-2">
                                <h2 className="font-bold text-slate-800">記録するメニュー</h2>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-indigo-600">{totalCalories}</span>
                                    <span className="text-xs text-slate-400 ml-1">kcal</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {mealItems.map((item, index) => (
                                    <Card key={index} className="overflow-hidden bg-rose-50 border-rose-100/50 shadow-sm relative">
                                        <div className="absolute top-2 right-2 flex gap-2 z-10">
                                            <Button
                                                variant="ghost"
                                                className="bg-white text-yellow-500 shadow-sm hover:text-yellow-600 hover:bg-yellow-50 h-8 px-3 text-xs font-bold gap-1"
                                                onClick={() => handleSaveSingleFavorite(index)}
                                            >
                                                <Star className="h-3 w-3 fill-yellow-500" />
                                                My Menuに登録
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="bg-white text-slate-400 shadow-sm hover:text-red-500 hover:bg-red-50 h-8 w-8"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <CardHeader className="pb-2 pt-4 px-4 bg-rose-100/30">
                                            <CardTitle className="text-base font-bold text-slate-800 pr-32 flex items-center gap-2">
                                                <span className="text-2xl">{item.emoji || "🍽️"}</span>
                                                <span className="truncate">{item.name}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-4 space-y-4 pt-3">
                                            <div className="flex justify-between items-end">
                                                <div className="text-xl font-bold text-slate-700">
                                                    {Math.round(item.calories * item.portion)} <span className="text-xs text-slate-400 font-normal">kcal</span>
                                                </div>
                                                <div className="flex gap-2 text-[10px] text-slate-500">
                                                    <span className="bg-orange-50 px-2 py-1 rounded border border-orange-100">P {(item.protein * item.portion).toFixed(1)}</span>
                                                    <span className="bg-yellow-50 px-2 py-1 rounded border border-yellow-100">F {(item.fat * item.portion).toFixed(1)}</span>
                                                    <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100">C {(item.carbs * item.portion).toFixed(1)}</span>
                                                </div>
                                            </div>

                                            {/* Slider */}
                                            <div className="bg-white p-3 rounded-lg space-y-2 border border-rose-100/50">
                                                <div className="flex justify-between text-xs font-medium text-slate-700">
                                                    <span>量: {Math.round(item.portion * 100)}%</span>
                                                    <span>{(item.portion < 1 ? "少なめ" : item.portion > 1 ? "多め" : "標準")}</span>
                                                </div>
                                                <Slider
                                                    defaultValue={[1.0]} max={2.0} min={0.1} step={0.1}
                                                    value={[item.portion]}
                                                    onValueChange={(vals) => updatePortion(index, vals[0])}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Save Button */}
                            <div className="sticky bottom-4 z-20 space-y-3">
                                {/* Removed bulk favorite checkbox */}

                                <Button
                                    className="w-full h-14 text-lg shadow-xl bg-rose-600 hover:bg-rose-700 rounded-xl text-white"
                                    onClick={handleSave} disabled={isSaving}
                                >
                                    {isSaving ? <><Loader2 className="mr-2 animate-spin" /> 保存中...</> : '記録する'}
                                </Button>
                            </div>
                        </div>
                    )
                }
                {/* Deletion Dialog */}
                <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>下書きを削除</AlertDialogTitle>
                            <AlertDialogDescription>
                                この下書きを削除してもよろしいですか？
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={executeDeleteDraft} className="bg-red-500 hover:bg-red-600">
                                削除する
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main >
        </div >
    );
}

export default function MealLogPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-rose-600" /></div>}>
            <MealLogContent />
        </Suspense>
    );
}
