'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, Type, Check, X, Trash2, StopCircle, Activity, Timer, Flame, Dumbbell, Repeat, Layers, ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type ExerciseItem = {
    name: string;
    emoji?: string;
    calories: number;
    duration_min: number;
    weight_kg?: number;
    sets?: number;
    reps?: number;
};

export default function ExerciseLogPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("voice");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [lastActionType, setLastActionType] = useState<'record' | 'draft'>('record');
    const [lastSavedItems, setLastSavedItems] = useState<ExerciseItem[]>([]);

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const recognitionRef = useRef<any>(null);

    // Manual State
    const [manualName, setManualName] = useState("");
    const [manualDuration, setManualDuration] = useState("");
    const [manualWeight, setManualWeight] = useState(""); // 0.5 increments
    const [manualReps, setManualReps] = useState("");   // 5 increments
    const [manualSets, setManualSets] = useState("");   // Integer

    // Draft State
    const [drafts, setDrafts] = useState<any[]>([]);
    const searchParams = useSearchParams();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftDate, setDraftDate] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Calculate totals


    // --- Voice Logic (Same as before) ---
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'ja-JP';

            recognitionRef.current.onresult = (event: any) => {
                let newFinal = '';
                let newInterim = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        newFinal += event.results[i][0].transcript;
                    } else {
                        newInterim += event.results[i][0].transcript;
                    }
                }

                if (newFinal) {
                    setTranscript(prev => prev + newFinal);
                }
                setInterimTranscript(newInterim);
            };
        }
    }, []);

    // --- Draft Logic (Same as before) ---
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

        const draftText = searchParams.get('draft_text');
        const draftId = searchParams.get('draft_id');
        const dDate = searchParams.get('draft_date');

        if (draftId) setEditingId(draftId);
        if (dDate) setDraftDate(dDate);

        if (draftText) {
            setActiveTab('voice');
            setTranscript(draftText);
        }
    }, [searchParams]);

    const loadDraft = (draft: any) => {
        setEditingId(draft.id);
        setDraftDate(draft.recorded_at);
        const raw = draft.ai_analysis_raw as any;
        const content = raw?.raw_content || draft.exercise_name;

        const params = new URLSearchParams();
        params.set('draft_id', draft.id);
        params.set('draft_text', content);
        params.set('draft_date', draft.recorded_at);
        router.replace(`?${params.toString()}`);

        setActiveTab('voice');
        setTranscript(content);
        toast.info('下書きを読み込みました');
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            setInterimTranscript("");
        } else {
            setTranscript("");
            setInterimTranscript("");
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const saveAsDraft = async (content: string, inputType: 'voice' | 'manual' = 'voice') => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const record = {
                user_id: user.id,
                exercise_name: content,
                duration_minutes: 0,
                calories_burned: 0,
                input_type: inputType,
                ai_analysis_raw: { status: 'pending', raw_content: content },
                recorded_at: draftDate || new Date().toISOString()
            };

            if (editingId) {
                await supabase.from('exercise_logs').update(record).eq('id', editingId);
            } else {
                await supabase.from('exercise_logs').insert([record]);
            }

            // toast.success('下書きとして保存しました');
            // Show Dialog instead of redirect
            setLastActionType('draft');
            setLastSavedItems([{
                name: content,
                calories: 0,
                duration_min: 0,
                emoji: "📝"
            }]);
            setShowCompleteDialog(true);

            // Refetch drafts to update list immediately
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
        } catch (e) {
            console.error(e);
            toast.error('保存に失敗しました');
        }
    };

    const handleRecord = async (source: 'manual' | 'voice', text: string, manualData?: any) => {
        setIsAnalyzing(true);
        setIsSaving(true);
        try {
            // 1. Analyze / Construct Data
            let itemsToSave: ExerciseItem[] = [];

            if (source === 'manual') {
                // Try to use API to estimate calories even for manual
                // Construct natural language string for better parsing
                // e.g. "Running 30min", "Bench Press 60kg 10reps 3sets"
                const query = text;

                const response = await fetch('/api/estimate/exercise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: query }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.items && data.items.length > 0 && data.items[0].name !== "解析エラー") {
                        // Use AI result but override with manual exact values if they exist
                        // Actually, manual inputs are reliable for count/weight, AI is for calories.
                        itemsToSave = data.items.map((item: any) => ({
                            ...item,
                            // If manual data provided, ensure it matches (though text query should handle it)
                            // We trust AI for calories based on the text we sent.
                        }));
                    } else {
                        // Fallback if AI fails: use manual data with 0 cal
                        itemsToSave = [{
                            name: manualData.name,
                            duration_min: manualData.duration || 0,
                            weight_kg: manualData.weight || 0,
                            reps: manualData.reps || 0,
                            sets: manualData.sets || 0,
                            calories: 0,
                            emoji: "💪"
                        }];
                    }
                } else {
                    // Fallback if API fails
                    itemsToSave = [{
                        name: manualData.name,
                        duration_min: manualData.duration || 0,
                        weight_kg: manualData.weight || 0,
                        reps: manualData.reps || 0,
                        sets: manualData.sets || 0,
                        calories: 0,
                        emoji: "💪"
                    }];
                }
            } else {
                // Voice
                const response = await fetch('/api/estimate/exercise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `API Error: ${response.status}`);
                }

                const data = await response.json();

                if (data.items && data.items[0]?.name === "解析エラー") {
                    toast.error("解析できませんでした。別の表現を試すか下書き保存してください。");
                    return;
                }
                itemsToSave = data.items || [];
            }

            if (itemsToSave.length === 0) {
                toast.error("記録するデータがありません");
                return;
            }

            // 2. Insert to DB
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const records = itemsToSave.map(item => ({
                user_id: user.id,
                exercise_name: item.name,
                duration_minutes: item.duration_min,
                weight_kg: item.weight_kg || null,
                sets: item.sets || null,
                reps_per_set: item.reps || null,
                calories_burned: item.calories,
                input_type: source,
                ai_analysis_raw: item,
                recorded_at: draftDate || new Date().toISOString()
            }));

            if (editingId) {
                await supabase.from('exercise_logs').delete().eq('id', editingId);
                await supabase.from('exercise_logs').insert(records);
            } else {
                await supabase.from('exercise_logs').insert(records);
            }

            // 3. Show Success
            setLastActionType('record');
            setLastSavedItems(itemsToSave);
            setShowCompleteDialog(true);

            // Clear inputs
            setTranscript("");
            setInterimTranscript("");
            if (source === 'manual') {
                // We don't clear manual inputs yet, user might want to continue or check popup options
                // Popup options: "Continue" (reset inputs), "Return" (go dashboard)
            }

        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "保存に失敗しました");
        } finally {
            setIsAnalyzing(false);
            setIsSaving(false);
        }
    };

    const handleManualRecord = () => {
        if (!manualName) {
            toast.error("運動名は必須です");
            return;
        }

        // Construct natural text
        let query = manualName;
        if (manualWeight && manualWeight !== '0') query += ` ${manualWeight}kg`;
        if (manualReps && manualReps !== '0') query += ` ${manualReps}回`;
        if (manualSets && manualSets !== '0') query += ` ${manualSets}セット`;
        if (manualDuration && manualDuration !== '0') query += ` ${manualDuration}分`;

        const manualData = {
            name: manualName,
            duration: parseInt(manualDuration) || 0,
            weight: parseFloat(manualWeight) || 0,
            reps: parseInt(manualReps) || 0,
            sets: parseInt(manualSets) || 0
        };

        handleRecord('manual', query, manualData);
    };



    const handleManualDraft = () => {
        if (!manualName) {
            toast.error("運動名は必須です");
            return;
        }
        let query = manualName;
        if (manualWeight && manualWeight !== '0') query += ` ${manualWeight}kg`;
        if (manualReps && manualReps !== '0') query += ` ${manualReps}回`;
        if (manualSets && manualSets !== '0') query += ` ${manualSets}セット`;
        if (manualDuration && manualDuration !== '0') query += ` ${manualDuration}分`;

        saveAsDraft(query, 'manual');
    };

    const deleteDraft = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeletingId(id);
    };

    const executeDeleteDraft = async () => {
        if (!deletingId) return;
        const id = deletingId;
        const supabase = createClient();
        await supabase.from('exercise_logs').delete().eq('id', id);
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success('下書きを削除しました');
        setDeletingId(null);
    };

    // Helper options
    const weightOptions = Array.from({ length: 400 }, (_, i) => (i * 0.5).toFixed(1)); // 0.0 - 200.0
    const repsOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 5); // 5, 10 ... 100
    const setsOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const durationOptions = [5, 10, 15, 20, 30, 40, 45, 50, 60, 90, 120];

    const exerciseSuggestions = [
        "ランニング", "ウォーキング", "筋トレ", "ヨガ", "サイクリング", "水泳",
        "ベンチプレス", "スクワット", "デッドリフト", "腹筋", "腕立て伏せ",
        "ストレッチ", "ハイキング", "ダンス", "縄跳び"
    ];

    return (
        <div className="min-h-screen bg-slate-50 relative pb-safe">
            <div className="px-6 py-4 bg-cyan-50 border-b border-cyan-100 shadow-sm flex items-center justify-between sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 hover:bg-cyan-100 text-cyan-900">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="font-bold text-xl text-cyan-900 flex items-center gap-2">
                    <Flame className="h-5 w-5" />
                    運動を記録
                </h1>
                <div className="w-10" />
            </div>

            <main className="p-4 space-y-6">
                <Tabs defaultValue="voice" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="voice"><Mic className="h-4 w-4 mr-2" />音声入力</TabsTrigger>
                        <TabsTrigger value="manual"><Type className="h-4 w-4 mr-2" />手入力</TabsTrigger>
                    </TabsList>

                    {/* MANUAL INPUT */}
                    <TabsContent value="manual" className="space-y-4">
                        <div className="space-y-4 bg-cyan-50 p-5 rounded-xl border border-cyan-100/50 shadow-sm">
                            <div>
                                <label className="text-sm font-bold text-slate-700">運動名 <span className="text-red-500">*</span></label>
                                <Input
                                    placeholder="例: ベンチプレス"
                                    list="exercise-suggestions"
                                    value={manualName} onChange={e => setManualName(e.target.value)}
                                    className="mt-1 h-12 text-lg bg-white"
                                />
                                <datalist id="exercise-suggestions">
                                    {exerciseSuggestions.map(ex => (
                                        <option key={ex} value={ex} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">時間 (分)</label>
                                    <Select value={manualDuration} onValueChange={setManualDuration}>
                                        <SelectTrigger className="mt-1 w-full bg-white">
                                            <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="0">-</SelectItem>
                                            {durationOptions.map(d => (
                                                <SelectItem key={d} value={d.toString()}>{d} 分</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">重量 (kg)</label>
                                    <Select value={manualWeight} onValueChange={setManualWeight}>
                                        <SelectTrigger className="mt-1 w-full bg-white">
                                            <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="0">-</SelectItem>
                                            {weightOptions.map(w => (
                                                <SelectItem key={w} value={w}>{w} kg</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">回数 (reps)</label>
                                    <Select value={manualReps} onValueChange={setManualReps}>
                                        <SelectTrigger className="mt-1 w-full bg-white">
                                            <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="0">-</SelectItem>
                                            {repsOptions.map(r => (
                                                <SelectItem key={r} value={r.toString()}>{r} 回</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">セット数</label>
                                    <Select value={manualSets} onValueChange={setManualSets}>
                                        <SelectTrigger className="mt-1 w-full bg-white">
                                            <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">-</SelectItem>
                                            {setsOptions.map(s => (
                                                <SelectItem key={s} value={s.toString()}>{s} セット</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                        </div>

                        <div className="flex gap-2">
                            <Button className="flex-1 h-12 bg-cyan-600 hover:bg-cyan-700 text-white text-base" onClick={handleManualRecord} disabled={isAnalyzing || isSaving}>
                                {isAnalyzing || isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                記録
                            </Button>
                            <Button className="flex-1 h-12 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200" variant="outline" onClick={handleManualDraft} disabled={isAnalyzing || isSaving}>
                                下書き
                            </Button>
                        </div>
                        {/* Drafts List */}
                        {drafts.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xs font-bold text-slate-500 mb-2">再試行可能な下書き</h3>
                                <div className="space-y-2">
                                    {drafts.map(draft => (
                                        <div key={draft.id}
                                            onClick={() => loadDraft(draft)}
                                            className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 active:bg-slate-50 cursor-pointer flex justify-between items-center"
                                        >
                                            <span className="truncate flex-1 font-medium">
                                                {draft.ai_analysis_raw?.raw_content || draft.exercise_name}
                                            </span>
                                            <div className="flex items-center">
                                                <span className="text-xs text-slate-400 mx-2 whitespace-nowrap">
                                                    {new Date(draft.recorded_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

                    {/* VOICE INPUT */}
                    <TabsContent value="voice" className="space-y-4">
                        <div className={`p-6 rounded-xl border-2 ${isListening ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'} transition-colors text-center relative`}>
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

                            <div className="h-20 flex items-center justify-center">
                                {isListening ? (
                                    <div className="animate-pulse text-red-500 font-bold">聞き取り中...</div>
                                ) : (
                                    <div className="text-slate-400">マイクボタンを押して話す</div>
                                )}
                            </div>
                            <div className="text-sm text-slate-700 min-h-[3rem] text-left p-2 bg-white/50 rounded">
                                {(transcript || interimTranscript) ? (
                                    <span>
                                        {transcript}
                                        <span className="text-slate-400">{interimTranscript}</span>
                                    </span>
                                ) : (
                                    <span className="text-slate-400">「ベンチプレス60kgを10回3セット」のように話してください</span>
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

                        {/* Recent Drafts */}
                        {drafts.length > 0 && (
                            <div className="mt-6">
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
                                                    {new Date(draft.recorded_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                                router.push('/dashboard');
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
        </div >
    );
}
