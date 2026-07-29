'use client';

import { Suspense, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Footprints, MapPin, Flame } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LogPageHeader } from "@/components/log";
import { cn } from "@/lib/utils";
import type { MovementType } from "@/types";
import { MOVEMENT_TYPE_LABELS } from "@/types";
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

/** 距離あたりの推定消費カロリー係数 (kcal/km) */
const KCAL_PER_KM: Record<MovementType, number> = {
    walking: 47,
    running: 79,
    mixed: 65,
};

const MOVEMENT_TYPES: MovementType[] = ['walking', 'running', 'mixed'];

/**
 * 移動記録ページのメインコンテンツコンポーネント
 *
 * 距離ベースの移動（徒歩・ランニング等）を手入力で記録する。
 * 筋トレ（/log/exercise）とは別テーブル movement_logs に保存。
 */
function MovementLogContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [distanceKm, setDistanceKm] = useState("");
    const [movementType, setMovementType] = useState<MovementType>('walking');
    const [caloriesInput, setCaloriesInput] = useState("");
    const [caloriesTouched, setCaloriesTouched] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [recordDate, setRecordDate] = useState<string | null>(null);
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);

    // 距離・種別から消費カロリーを自動推定（手動編集されていない場合のみ）
    const estimatedCalories = Math.round((parseFloat(distanceKm) || 0) * KCAL_PER_KM[movementType]);
    const effectiveCalories = caloriesTouched && caloriesInput !== ""
        ? Math.round(parseFloat(caloriesInput) || 0)
        : estimatedCalories;

    // 編集パラメータを処理
    useEffect(() => {
        const editId = searchParams.get('edit');
        if (!editId) return;
        const loadMovementLog = async () => {
            const supabase = createClient();
            const { data: log, error } = await supabase
                .from('movement_logs')
                .select('*')
                .eq('id', editId)
                .single();

            if (error || !log) {
                toast.error('ログの読み込みに失敗しました');
                return;
            }

            setEditingId(log.id);
            setRecordDate(log.recorded_at);
            setDistanceKm(log.distance_km?.toString() || '');
            setMovementType((log.movement_type as MovementType) || 'walking');
            setCaloriesInput(log.calories_burned?.toString() || '');
            setCaloriesTouched(true);
            toast.info('編集モードで読み込みました');
        };
        loadMovementLog();
    }, [searchParams]);

    /**
     * 移動記録を保存する
     */
    const handleRecord = async () => {
        const distance = parseFloat(distanceKm);
        if (!distance || distance <= 0) {
            toast.error("距離を入力してください");
            return;
        }

        setIsSaving(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("ログインが必要です");
                return;
            }

            const record = {
                user_id: user.id,
                distance_km: distance,
                movement_type: movementType,
                calories_burned: effectiveCalories,
                input_type: 'manual',
                recorded_at: recordDate || new Date().toISOString(),
            };

            if (editingId) {
                await supabase.from('movement_logs').delete().eq('id', editingId);
            }
            const { error } = await supabase.from('movement_logs').insert([record]);
            if (error) throw error;

            setShowCompleteDialog(true);
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-safe">
            <LogPageHeader
                title="移動を記録"
                icon={Footprints}
                bgColor="bg-emerald-50"
                borderColor="border-emerald-100"
                textColor="text-emerald-900"
            />

            <main className="p-4 space-y-6">
                <div className="space-y-4 bg-emerald-50 p-5 rounded-xl border border-emerald-100/50 shadow-sm">
                    {/* 種別選択 */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">種別</label>
                        <div className="grid grid-cols-3 gap-2">
                            {MOVEMENT_TYPES.map((type) => (
                                <Button
                                    key={type}
                                    type="button"
                                    variant="outline"
                                    onClick={() => setMovementType(type)}
                                    className={cn(
                                        "h-11 bg-white",
                                        movementType === type
                                            ? "border-emerald-500 bg-emerald-100 text-emerald-800 font-bold"
                                            : "border-slate-200 text-slate-600"
                                    )}
                                >
                                    {MOVEMENT_TYPE_LABELS[type]}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* 距離 */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block flex items-center">
                            <MapPin className="h-3 w-3 mr-1" /> 距離 (km)
                        </label>
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="例: 3.2"
                            value={distanceKm}
                            onChange={(e) => setDistanceKm(e.target.value)}
                            className="bg-white"
                        />
                    </div>

                    {/* 消費カロリー（自動推定・上書き可） */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block flex items-center">
                            <Flame className="h-3 w-3 mr-1" /> 消費カロリー (kcal)
                        </label>
                        <Input
                            type="number"
                            inputMode="numeric"
                            placeholder={estimatedCalories.toString()}
                            value={caloriesTouched ? caloriesInput : (estimatedCalories || "").toString()}
                            onChange={(e) => {
                                setCaloriesTouched(true);
                                setCaloriesInput(e.target.value);
                            }}
                            className="bg-white"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            距離と種別から自動推定します。必要なら上書きできます。
                        </p>
                    </div>
                </div>

                <Button
                    className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-md"
                    onClick={handleRecord}
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                    記録する
                </Button>

                {/* 完了ダイアログ */}
                <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>記録しました！</AlertDialogTitle>
                            <AlertDialogDescription>
                                続けて記録しますか？それともダッシュボードに戻りますか？
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 my-2">
                            <div className="font-bold flex items-center">
                                <span className="mr-2">🚶</span>
                                {MOVEMENT_TYPE_LABELS[movementType]} {distanceKm}km
                            </div>
                            <div className="ml-6 text-xs text-slate-500">
                                {effectiveCalories}kcal (推定)
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {
                                setShowCompleteDialog(false);
                                setDistanceKm("");
                                setCaloriesInput("");
                                setCaloriesTouched(false);
                                setEditingId(null);
                                setRecordDate(null);
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
            </main>
        </div>
    );
}

export default function MovementLogPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <MovementLogContent />
        </Suspense>
    );
}
