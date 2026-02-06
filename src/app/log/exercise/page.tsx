'use client';

import { FavoriteSelector } from "../_components/FavoriteSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { Suspense, useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, Check, X, StopCircle, Clock, Dumbbell, Repeat, Layers } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
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
 * 運動記録ページのメインコンテンツコンポーネント
 *
 * 音声入力または手入力の2種類の方法で運動を記録できる。
 * 音声入力の場合はAIがトレーニング内容を解析。
 */
function ExerciseLogContent() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("voice");
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);

    /** タブの順序 */
    const TAB_ORDER = ['voice', 'manual'];

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

    // Manual Input State
    const [manualName, setManualName] = useState("");
    const [manualDuration, setManualDuration] = useState("");
    const [manualWeight, setManualWeight] = useState("");
    const [manualReps, setManualReps] = useState("");
    const [manualSets, setManualSets] = useState("");

    // Favorites State
    const [saveToFavorites, setSaveToFavorites] = useState(false);

    // Draft State
    const [drafts, setDrafts] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftDate, setDraftDate] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Completion Dialog State
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [lastActionType, setLastActionType] = useState<'record' | 'draft'>('record');
    const [lastSavedItems, setLastSavedItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchDrafts = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: pendingLogs } = await supabase
                .from('exercise_logs')
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

    // 編集パラメータを処理
    const searchParams = useSearchParams();
    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId) {
            const loadExerciseLog = async () => {
                const supabase = createClient();
                const { data: log, error } = await supabase
                    .from('exercise_logs')
                    .select('*')
                    .eq('id', editId)
                    .single();

                if (error || !log) {
                    toast.error('ログの読み込みに失敗しました');
                    return;
                }

                setEditingId(log.id);
                setDraftDate(log.recorded_at);

                // 手入力フォームに読み込み
                setManualName(log.exercise_name || '');
                setManualDuration(log.duration_minutes?.toString() || '');
                setManualWeight(log.weight_kg?.toString() || '');
                setManualReps(log.reps_per_set?.toString() || '');
                setManualSets(log.sets?.toString() || '');
                setActiveTab('manual');
                toast.info('編集モードで読み込みました');
            };
            loadExerciseLog();
        }
    }, [searchParams]);

    /**
     * 下書きを読み込んでフォームに設定する
     *
     * @param draft - 読み込む下書きレコード
     */
    const loadDraft = (draft: any) => {
        setEditingId(draft.id);
        setDraftDate(draft.recorded_at);
        const raw = draft.ai_analysis_raw as any;
        const content = raw?.raw_content || draft.exercise_name;

        setActiveTab('voice'); // Assume drafts are mostly voice/text
        setTranscript(content);
        toast.info('下書きを読み込みました');
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'ja-JP';

            recognitionRef.current.onresult = (event: any) => {
                let newTranscript = '';
                let newInterim = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        newTranscript += event.results[i][0].transcript;
                    } else {
                        newInterim += event.results[i][0].transcript;
                    }
                }

                if (newTranscript) {
                    setTranscript(prev => prev + newTranscript);
                }
                setInterimTranscript(newInterim);
            };

            recognitionRef.current.onend = () => {
                // Determine if we should restart based on intended state
                if (isListeningRef.current) {
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        // ignore errors if already started
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
            setTranscript("");
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    /**
     * My Menuから選択されたアイテムを手入力フォームに設定する
     *
     * @param item - 選択されたお気に入りアイテム
     */
    const handleFavoriteSelect = (item: any) => {
        // 手入力フォームにお気に入りの内容をセット
        const content = item.content;
        setManualName(content.name || "");
        setManualDuration(content.duration?.toString() || "");
        setManualWeight(content.weight?.toString() || "");
        setManualReps(content.reps?.toString() || "");
        setManualSets(content.sets?.toString() || "");

        // Switch to manual tab
        setActiveTab('manual');
        toast.info(`My Menuから「${item.name}」を読み込みました`);
    };

    /**
     * 運動記録を保存する
     *
     * @param source - 入力元 (manual: 手入力, voice: 音声)
     * @param content - 音声入力の場合のテキスト内容
     */
    const handleRecord = async (source: 'manual' | 'voice', content?: string) => {
        setIsAnalyzing(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("ログインが必要です");
                return;
            }

            let itemsToSave: any[] = [];

            if (source === 'manual') {
                if (!manualName) {
                    toast.error("種目名を入力してください");
                    setIsAnalyzing(false);
                    return;
                }
                itemsToSave = [{
                    name: manualName,
                    duration_min: parseInt(manualDuration) || 0,
                    weight_kg: parseFloat(manualWeight) || 0,
                    reps: parseInt(manualReps) || 0,
                    sets: parseInt(manualSets) || 1,
                    calories: 0 // Estimate later or 0
                }];
            } else {
                // Voice Analysis
                const text = content || transcript;
                if (!text) return;

                const response = await fetch('/api/estimate/exercise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                });

                if (!response.ok) throw new Error('解析に失敗しました');
                const data = await response.json();
                itemsToSave = data.items || [];
            }

            // Save to DB
            const records = itemsToSave.map(item => ({
                user_id: user.id,
                exercise_name: item.name,
                duration_minutes: item.duration_min,
                sets: item.sets,
                reps_per_set: item.reps, // manual uses 'reps'
                weight_kg: item.weight_kg,
                calories_burned: item.calories || (item.duration_min * 5),
                input_type: source,
                ai_analysis_raw: { ...item, status: 'completed' },
                recorded_at: draftDate || new Date().toISOString()
            }));

            if (editingId) {
                await supabase.from('exercise_logs').delete().eq('id', editingId);
            }
            const { error } = await supabase.from('exercise_logs').insert(records);
            if (error) throw error;

            // Save to Favorites if checked
            if (saveToFavorites && source === 'manual' && itemsToSave.length > 0) {
                const itemToFav = itemsToSave[0]; // Usually one item for manual
                const favoriteData = {
                    user_id: user.id,
                    type: 'exercise',
                    name: itemToFav.name,
                    content: {
                        name: itemToFav.name,
                        duration: itemToFav.duration_min,
                        weight: itemToFav.weight_kg,
                        reps: itemToFav.reps || itemToFav.reps_per_set,
                        sets: itemToFav.sets,
                        calories: itemToFav.calories_burned
                    }
                };
                await supabase.from('favorites').insert([favoriteData]);
                toast.success("My Menuに登録しました");
                setSaveToFavorites(false); // Reset
            }

            setLastSavedItems(itemsToSave);
            setLastActionType('record');
            setShowCompleteDialog(true);

            // Cleanup drafts/inputs if successful
            if (source === 'voice') {
                setTranscript("");
                setInterimTranscript("");
            }

        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * 現在の入力内容を下書きとして保存する
     *
     * @param content - 保存するテキスト内容
     */
    const saveAsDraft = async (content: string) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const record = {
                user_id: user.id,
                exercise_name: content,
                duration_minutes: 0,
                calories_burned: 0,
                ai_analysis_raw: { status: 'pending', raw_content: content }
            };

            const { data, error } = await supabase.from('exercise_logs').insert([record]).select();
            if (error) throw error;
            if (data) {
                setDrafts(prev => [data[0], ...prev]);
            }

            setLastSavedItems([{ name: '下書き', emoji: '📝', duration_min: 0, calories: 0 }]); // Dummy for dialog
            setLastActionType('draft');
            setShowCompleteDialog(true);
            setTranscript("");
            setInterimTranscript("");
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
        await supabase.from('exercise_logs').delete().eq('id', id);
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success('下書きを削除しました');
        setDeletingId(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-safe">
            <LogPageHeader
                title="運動を記録"
                icon={Dumbbell}
                bgColor="bg-cyan-50"
                borderColor="border-cyan-100"
                textColor="text-cyan-900"
            />

            <main ref={swipeRef} className="p-4 space-y-6 touch-pan-y">
                <Tabs defaultValue="voice" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="voice">音声</TabsTrigger>
                        <TabsTrigger value="manual">手入力</TabsTrigger>
                    </TabsList>

                    <TabsContent value="voice" className="space-y-4">
                        {/* Favorite Selector for Voice Tab */}
                        <div className="flex justify-end">
                            <FavoriteSelector type="exercise" onSelect={handleFavoriteSelect} />
                        </div>

                        <div className={`p-4 rounded-xl border-2 ${isListening ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'} transition-colors relative`}>
                            {/* Textarea for Voice Input (editable) */}
                            <Textarea
                                placeholder="例: ベンチプレス60kgを10回3セット"
                                className="text-base p-2 min-h-[120px] bg-transparent border-none focus-visible:ring-0 resize-none"
                                value={transcript + interimTranscript}
                                onChange={(e) => {
                                    setTranscript(e.target.value);
                                    setInterimTranscript("");
                                }}
                                disabled={isListening}
                            />

                            {/* Clear Button */}
                            {(transcript || interimTranscript) && !isListening && (
                                <Button
                                    size="icon" variant="ghost"
                                    className="absolute top-2 right-2 h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => { setTranscript(""); setInterimTranscript(""); }}
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
                                {isListening ? "停止" : "録音"}
                            </Button>
                            <Button
                                className="h-12 w-full bg-cyan-600 hover:bg-cyan-700"
                                disabled={(!transcript && !interimTranscript) || isListening || isAnalyzing || isSaving}
                                onClick={() => handleRecord('voice', transcript + interimTranscript)}
                            >
                                {isAnalyzing || isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                                <span className="ml-2">記録</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 w-full border-cyan-200 text-cyan-700 bg-cyan-50"
                                disabled={(!transcript && !interimTranscript) || isListening}
                                onClick={() => saveAsDraft(transcript + interimTranscript)}
                            >
                                下書き
                            </Button>
                        </div>


                    </TabsContent>

                    <TabsContent value="manual" className="space-y-4">
                        {/* Favorite Selector Above Card */}
                        <div className="flex justify-end">
                            <FavoriteSelector type="exercise" onSelect={handleFavoriteSelect} />
                        </div>

                        <div className="space-y-4 bg-cyan-50 p-5 rounded-xl border border-cyan-100/50 shadow-sm">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">種目名</label>
                                <Input placeholder="例: ベンチプレス" value={manualName} onChange={(e) => setManualName(e.target.value)} className="bg-white" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block flex items-center"><Clock className="h-3 w-3 mr-1" /> 時間 (分)</label>
                                    <Input type="number" placeholder="0" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} className="bg-white" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block flex items-center"><Dumbbell className="h-3 w-3 mr-1" /> 重量 (kg)</label>
                                    <Input type="number" placeholder="0" value={manualWeight} onChange={(e) => setManualWeight(e.target.value)} className="bg-white" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block flex items-center"><Repeat className="h-3 w-3 mr-1" /> 回数</label>
                                    <Input type="number" placeholder="0" value={manualReps} onChange={(e) => setManualReps(e.target.value)} className="bg-white" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block flex items-center"><Layers className="h-3 w-3 mr-1" /> セット数</label>
                                    <Input type="number" placeholder="1" value={manualSets} onChange={(e) => setManualSets(e.target.value)} className="bg-white" />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2 border-t border-cyan-100">
                                <Checkbox id="save-fav" checked={saveToFavorites} onCheckedChange={(c) => setSaveToFavorites(!!c)} />
                                <Label htmlFor="save-fav" className="text-sm text-slate-600 cursor-pointer">
                                    この内容をMy Menuにも登録する
                                </Label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button className="h-12 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-lg shadow-md" onClick={() => handleRecord('manual')} disabled={isAnalyzing}>
                                {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                                記録する
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 border-cyan-200 text-cyan-700 bg-cyan-50"
                                onClick={() => {
                                    const text = `${manualName} ${manualDuration ? manualDuration + '分' : ''} ${manualWeight ? manualWeight + 'kg' : ''} ${manualReps ? manualReps + '回' : ''} ${manualSets ? manualSets + 'セット' : ''}`.trim();
                                    if (!text) {
                                        toast.error("内容が空です");
                                        return;
                                    }
                                    saveAsDraft(text);
                                }}
                                disabled={isAnalyzing}
                            >
                                下書き
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Recent Drafts (Common) */}
                {drafts.length > 0 && (
                    <div className="mt-6 border-t border-slate-100 pt-6">
                        <h3 className="text-xs font-bold text-slate-500 mb-2">再試行可能な下書き</h3>
                        <div className="space-y-2">
                            {drafts.map(draft => (
                                <div key={draft.id}
                                    onClick={() => loadDraft(draft)}
                                    className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 active:bg-slate-50 cursor-pointer flex justify-between items-center"
                                >
                                    <span className="truncate flex-1 font-medium">{draft.ai_analysis_raw?.raw_content || draft.exercise_name}</span>
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

                {/* Dialog */}
                <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{lastActionType === 'record' ? '記録しました！' : '下書き保存しました'}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {lastActionType === 'record' ? '続けて記録しますか？それともダッシュボードに戻りますか？' : '続けて他の項目も下書きしますか？'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        {lastSavedItems.length > 0 && (
                            <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 my-2">
                                {lastSavedItems.map((item, i) => (
                                    <div key={i} className="mb-1 last:mb-0">
                                        <div className="font-bold flex items-center">
                                            <span className="mr-2">{item.emoji || "💪"}</span>
                                            {item.name}
                                        </div>
                                        <div className="ml-6 text-xs text-slate-500">
                                            {lastActionType === 'record' ? (
                                                <>
                                                    {item.duration_min > 0 ? `${item.duration_min}分` : ''}
                                                    {item.calories > 0 ? `/ ${item.calories}kcal (推定)` : ''}
                                                    {item.duration_min === 0 && item.calories === 0 ? '詳細なし' : ''}
                                                </>
                                            ) : (
                                                <span className="text-slate-400">解析待ち</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {
                                setShowCompleteDialog(false);
                                setLastSavedItems([]);
                                // Clear inputs on Continue
                                setManualName("");
                                setManualDuration("");
                                setManualWeight("");
                                setManualReps("");
                                setManualSets("");
                                setTranscript("");
                            }}>
                                {lastActionType === 'record' ? '続けて記録' : '続けて下書き'}
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                router.push('/dashboard?refresh=1');
                                router.refresh();
                            }}>
                                ダッシュボードへ
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
            </main>
        </div>
    );
}

export default function ExerciseLogPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>}>
            <ExerciseLogContent />
        </Suspense>
    );
}
