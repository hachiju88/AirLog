'use client';

import { Suspense, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Cigarette } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LogPageHeader } from "@/components/log";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
 * 喫煙記録ページのメインコンテンツコンポーネント
 *
 * 吸った本数と別銘柄（オプション）を入力して記録できる。
 */
function SmokingLogContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Form state
    const [cigaretteCount, setCigaretteCount] = useState('1');
    const [isDifferentBrand, setIsDifferentBrand] = useState(false);
    const [differentBrandName, setDifferentBrandName] = useState('');

    // Profile state
    const [profile, setProfile] = useState<any>(null);

    // UI state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftDate, setDraftDate] = useState<string | null>(null);

    // Draft state
    const [drafts, setDrafts] = useState<any[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Completion Dialog
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [lastActionType, setLastActionType] = useState<'record' | 'draft'>('record');
    const [lastSavedInfo, setLastSavedInfo] = useState<{ count: number; spent: number } | null>(null);

    // プロフィールと下書きの取得
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // プロフィールを取得
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfile(profileData);

            // 喫煙者でない場合はリダイレクト
            if (!profileData?.is_smoker) {
                toast.error('喫煙設定が有効になっていません');
                router.push('/settings');
                return;
            }

            // 下書きを取得
            const { data: pendingLogs } = await supabase
                .from('smoking_logs')
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
        fetchData();
    }, [router]);

    // 編集パラメータを処理
    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId) {
            const loadLog = async () => {
                const supabase = createClient();
                const { data: log, error } = await supabase
                    .from('smoking_logs')
                    .select('*')
                    .eq('id', editId)
                    .single();

                if (error || !log) {
                    toast.error('ログの読み込みに失敗しました');
                    return;
                }

                setEditingId(log.id);
                setDraftDate(log.recorded_at);
                setCigaretteCount(log.cigarette_count?.toString() || '1');
                setIsDifferentBrand(log.is_different_brand || false);
                setDifferentBrandName(log.brand_name || '');
                toast.info('編集モードで読み込みました');
            };
            loadLog();
        }
    }, [searchParams]);

    /**
     * 喫煙記録を保存する
     */
    const handleRecord = async () => {
        const count = parseInt(cigaretteCount) || 1;
        if (count <= 0) {
            toast.error('本数を入力してください');
            return;
        }

        setIsAnalyzing(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('ログインが必要です');
                return;
            }

            let pricePerCigarette = 0;
            let brandName = profile?.cigarette_brand || '';

            // 別銘柄の場合はAIで価格を取得
            if (isDifferentBrand && differentBrandName.trim()) {
                const response = await fetch('/api/estimate/cigarette', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ brand: differentBrandName }),
                });

                if (response.ok) {
                    const data = await response.json();
                    pricePerCigarette = data.price_per_cigarette || 0;
                    brandName = data.brand_name || differentBrandName;
                } else {
                    // フォールバック: デフォルト価格を使用
                    pricePerCigarette = 29;
                }
            } else {
                // 設定銘柄の価格を使用
                if (profile?.price_per_pack && profile?.cigarettes_per_pack) {
                    pricePerCigarette = profile.price_per_pack / profile.cigarettes_per_pack;
                }
            }

            const record = {
                user_id: user.id,
                cigarette_count: count,
                brand_name: isDifferentBrand ? brandName : null,
                price_per_cigarette: pricePerCigarette,
                is_different_brand: isDifferentBrand,
                ai_analysis_raw: { status: 'completed' },
                recorded_at: draftDate || new Date().toISOString()
            };

            if (editingId) {
                await supabase.from('smoking_logs').delete().eq('id', editingId);
            }

            const { error } = await supabase.from('smoking_logs').insert([record]);
            if (error) throw error;

            const spent = count * pricePerCigarette;
            setLastSavedInfo({ count, spent });
            setLastActionType('record');
            setShowCompleteDialog(true);

        } catch (e) {
            console.error(e);
            toast.error('保存に失敗しました');
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * 下書き保存
     */
    const saveAsDraft = async () => {
        const count = parseInt(cigaretteCount) || 1;

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const record = {
                user_id: user.id,
                cigarette_count: count,
                brand_name: isDifferentBrand ? differentBrandName : null,
                is_different_brand: isDifferentBrand,
                ai_analysis_raw: {
                    status: 'pending',
                    raw_content: `${count}本${isDifferentBrand ? ` (${differentBrandName})` : ''}`
                }
            };

            const { data, error } = await supabase.from('smoking_logs').insert([record]).select();
            if (error) throw error;

            if (data) {
                setDrafts(prev => [data[0], ...prev]);
            }

            setLastSavedInfo({ count, spent: 0 });
            setLastActionType('draft');
            setShowCompleteDialog(true);

            // フォームをリセット
            setCigaretteCount('1');
            setIsDifferentBrand(false);
            setDifferentBrandName('');

        } catch (e) {
            console.error(e);
            toast.error('保存に失敗しました');
        }
    };

    /**
     * 下書きを読み込む
     */
    const loadDraft = (draft: any) => {
        setEditingId(draft.id);
        setDraftDate(draft.recorded_at);
        setCigaretteCount(draft.cigarette_count?.toString() || '1');
        setIsDifferentBrand(draft.is_different_brand || false);
        setDifferentBrandName(draft.brand_name || '');
        toast.info('下書きを読み込みました');
    };

    /**
     * 下書き削除
     */
    const executeDeleteDraft = async () => {
        if (!deletingId) return;
        const id = deletingId;
        const supabase = createClient();
        await supabase.from('smoking_logs').delete().eq('id', id);
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success('下書きを削除しました');
        setDeletingId(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-safe">
            <LogPageHeader
                title="喫煙を記録"
                icon={Cigarette}
                bgColor="bg-slate-100"
                borderColor="border-slate-200"
                textColor="text-slate-700"
            />

            <main className="p-4 space-y-6">
                {/* 入力フォーム */}
                <div className="space-y-4 bg-slate-100 p-5 rounded-xl border border-slate-200/50 shadow-sm">
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">吸った本数</label>
                        <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={cigaretteCount}
                            onChange={(e) => setCigaretteCount(e.target.value)}
                            className="bg-white text-lg font-bold text-center"
                        />
                    </div>

                    <div className="flex items-center space-x-3 pt-2 border-t border-slate-200">
                        <Checkbox
                            id="different-brand"
                            checked={isDifferentBrand}
                            onCheckedChange={(c) => setIsDifferentBrand(!!c)}
                        />
                        <Label htmlFor="different-brand" className="text-sm text-slate-600 cursor-pointer">
                            別の銘柄を吸った
                        </Label>
                    </div>

                    {isDifferentBrand && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-sm font-bold text-slate-700 mb-1 block">銘柄名</label>
                            <Input
                                type="text"
                                placeholder="例: セブンスター"
                                value={differentBrandName}
                                onChange={(e) => setDifferentBrandName(e.target.value)}
                                className="bg-white"
                            />
                            <p className="text-xs text-slate-500 mt-1">AIが価格を自動取得して消費金額を算出します。</p>
                        </div>
                    )}

                    {/* 設定銘柄情報 */}
                    {profile?.cigarette_brand && !isDifferentBrand && (
                        <div className="bg-slate-200/50 rounded-lg p-3 text-sm text-slate-600">
                            <span className="text-slate-400">設定銘柄: </span>
                            <span className="font-medium">{profile.cigarette_brand}</span>
                            {profile.price_per_pack && profile.cigarettes_per_pack && (
                                <span className="ml-2 text-slate-500">
                                    (¥{Math.round(profile.price_per_pack / profile.cigarettes_per_pack)}/本)
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ボタン */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        className="h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg shadow-md"
                        onClick={handleRecord}
                        disabled={isAnalyzing || isSaving}
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                        記録する
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 border-slate-300 text-slate-600 bg-slate-50"
                        onClick={saveAsDraft}
                        disabled={isAnalyzing || isSaving}
                    >
                        下書き
                    </Button>
                </div>

                {/* 下書き一覧 */}
                {drafts.length > 0 && (
                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <h3 className="text-xs font-bold text-slate-500 mb-2">再試行可能な下書き</h3>
                        <div className="space-y-2">
                            {drafts.map(draft => (
                                <div
                                    key={draft.id}
                                    onClick={() => loadDraft(draft)}
                                    className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 active:bg-slate-50 cursor-pointer flex justify-between items-center"
                                >
                                    <span className="truncate flex-1 font-medium">
                                        {draft.cigarette_count}本
                                        {draft.is_different_brand && draft.brand_name && ` (${draft.brand_name})`}
                                    </span>
                                    <div className="flex items-center">
                                        <span className="text-xs text-slate-400 mx-2 whitespace-nowrap">
                                            {new Date(draft.recorded_at).toLocaleDateString('ja-JP', {
                                                month: 'numeric',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Asia/Tokyo'
                                            })}
                                        </span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                            onClick={(e) => { e.stopPropagation(); setDeletingId(draft.id); }}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 完了ダイアログ */}
                <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {lastActionType === 'record' ? '記録しました！' : '下書き保存しました'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {lastActionType === 'record'
                                    ? '続けて記録しますか？'
                                    : '続けて下書きしますか？'
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        {lastSavedInfo && lastActionType === 'record' && (
                            <div className="bg-slate-100 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-slate-800">
                                    🚬 {lastSavedInfo.count}本
                                </div>
                                {lastSavedInfo.spent > 0 && (
                                    <div className="text-sm text-slate-500 mt-1">
                                        消費金額: ¥{Math.round(lastSavedInfo.spent).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )}
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {
                                setShowCompleteDialog(false);
                                setCigaretteCount('1');
                                setIsDifferentBrand(false);
                                setDifferentBrandName('');
                                setEditingId(null);
                                setDraftDate(null);
                            }}>
                                続けて記録
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

                {/* 削除確認ダイアログ */}
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

export default function SmokingLogPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            </div>
        }>
            <SmokingLogContent />
        </Suspense>
    );
}
