/**
 * ダッシュボードクライアントコンポーネント
 *
 * 3日分のデータを受け取り、useStateで日付を切り替える。
 * スワイプジェスチャーで即座に日付切り替え（サーバーリクエストなし）。
 *
 * @module app/dashboard/_components/DashboardClient
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Flame, Utensils, Calendar, Trash2, Pencil, Star, ChevronDown, Cigarette, TrendingDown, TrendingUp, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { DashboardHeader } from "./DashboardHeader";
import { DeleteConfirmDialog } from "@/components/log/DeleteConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { differenceInCalendarDays } from 'date-fns';

// ===== 型定義 =====

interface DayData {
    /** 日付文字列 YYYY-MM-DD */
    dateStr: string;
    /** 食事ログ */
    meals: any[];
    /** 運動ログ */
    exercises: any[];
    /** 喫煙ログ */
    smokingLogs?: any[];
}

interface DashboardClientProps {
    /** 3日分のデータ [今日, 昨日, 一昨日] */
    daysData: DayData[];
    /** 最新の体重ログ */
    latestWeightLog: any;
    /** プロフィール */
    profile: any;
    /** 今日の日付文字列 */
    todayStr: string;
    /** 最後の喫煙日時（ISO文字列）の配列（直近5件など） */
    lastSmokeDates: string[];
}

// ===== ヘルパー関数 =====

const slotLabels: { [key: string]: string } = { morning: '朝', afternoon: '昼', night: '夜' };
const slotStyles: { [key: string]: string } = {
    morning: 'bg-orange-50 border-orange-100',
    afternoon: 'bg-sky-50 border-sky-100',
    night: 'bg-indigo-50 border-indigo-100'
};

/**
 * ログを時間帯別にグループ化する
 */
const groupLogsBySlot = (logs: any[]) => {
    const groups = { morning: [] as any[], afternoon: [] as any[], night: [] as any[] };
    if (!logs) return groups;
    logs.forEach(log => {
        const d = new Date(log.recorded_at);
        const hour = parseInt(d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Tokyo' }));
        if (hour < 12) groups.morning.push(log);
        else if (hour < 17) groups.afternoon.push(log);
        else groups.night.push(log);
    });
    return groups;
};

/**
 * 日付文字列からJSTのDateオブジェクトを生成
 */
const createJSTDate = (dateStr: string): Date => {
    return new Date(`${dateStr}T00:00:00+09:00`);
};

// ===== メインコンポーネント =====

export function DashboardClient({ daysData: initialDaysData, latestWeightLog, profile, todayStr, lastSmokeDates = [] }: DashboardClientProps) {
    // ローカルデータステート（削除操作を反映するため）
    const [daysData, setDaysData] = useState(initialDaysData);

    // 選択中の日付インデックス (0=今日, 1=昨日, 2=一昨日)
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);

    // 削除ダイアログの状態
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'meal' | 'exercise'; id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 展開中のカードID
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // ルーターとサーチパラメーター
    const router = useRouter();
    const searchParams = useSearchParams();

    // URLパラメータの監視（クイック喫煙からのリダイレクト等の処理）
    useEffect(() => {
        const refresh = searchParams.get('refresh');
        const error = searchParams.get('error');

        if (refresh === '1') {
            toast.success('喫煙を記録しました');
            // パラメータをクリア
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('refresh');
            router.replace(`/dashboard?${newParams.toString()}`);
        } else if (error === 'quick-smoke') {
            toast.error('クイック喫煙記録に失敗しました');
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('error');
            router.replace(`/dashboard?${newParams.toString()}`);
        }
    }, [searchParams, router]);

    // 現在選択中の日のデータ
    const currentDay = daysData[selectedDayIndex];

    // スワイプハンドラー
    const goToPast = useCallback(() => {
        if (selectedDayIndex < daysData.length - 1) {
            setSelectedDayIndex(prev => prev + 1);
        }
    }, [selectedDayIndex, daysData.length]);

    const goToRecent = useCallback(() => {
        if (selectedDayIndex > 0) {
            setSelectedDayIndex(prev => prev - 1);
        }
    }, [selectedDayIndex]);

    // スワイプジェスチャーのref
    const swipeRef = useSwipeGesture<HTMLDivElement>({
        onSwipeLeft: goToRecent,  // 左スワイプで最近へ
        onSwipeRight: goToPast,   // 右スワイプで過去へ
        threshold: 50
    });

    // プロフィールから目標値を取得
    const targetWeight = profile?.target_weight_kg || '-';
    const targetIntake = profile?.target_calories_intake || 2200;
    const targetBurned = profile?.target_calories_burned || 300;

    // Dynamic Goals (PFC Balance: P 15%, F 25%, C 60%)
    const targetProtein = Math.round((targetIntake * 0.15) / 4);
    const targetFat = Math.round((targetIntake * 0.25) / 9);
    const targetCarbs = Math.round((targetIntake * 0.60) / 4);
    const targetFiber = 20;
    const targetSalt = 7.5;

    // 喫煙関連の目標
    const targetCigarettes = profile?.target_cigarettes_per_day || 10;
    const pricePerCigarette = profile?.price_per_pack && profile?.cigarettes_per_pack
        ? profile.price_per_pack / profile.cigarettes_per_pack
        : 29;

    // 集計値を計算
    const totals = useMemo(() => {
        const meals = currentDay?.meals || [];
        const exercises = currentDay?.exercises || [];
        return {
            calories: meals.reduce((sum, log) => sum + (log.calories || 0), 0),
            burned: exercises.reduce((sum, log) => sum + (log.calories_burned || 0), 0),
            protein: meals.reduce((sum, log) => sum + (log.protein_g || 0), 0),
            fat: meals.reduce((sum, log) => sum + (log.fat_g || 0), 0),
            carbs: meals.reduce((sum, log) => sum + (log.carbohydrates_g || 0), 0),
            fiber: meals.reduce((sum, log) => sum + (log.fiber_g || 0), 0),
            salt: meals.reduce((sum, log) => sum + (log.salt_g || 0), 0),
            // 喫煙
            cigarettes: (currentDay?.smokingLogs || []).reduce((sum, log) => sum + (log.cigarette_count || 0), 0),
            smokingSpent: (currentDay?.smokingLogs || []).reduce((sum, log) => {
                const price = log.price_per_cigarette || pricePerCigarette;
                return sum + (log.cigarette_count || 0) * price;
            }, 0),
        };
    }, [currentDay, pricePerCigarette]);

    // プログレス計算
    const intakeProgressPercent = (totals.calories / targetIntake) * 100;
    const intakeColor = intakeProgressPercent > 100 ? "bg-red-500" : "bg-rose-400";
    const burnedProgressPercent = (totals.burned / targetBurned) * 100;
    const burnedColor = burnedProgressPercent >= 100 ? "bg-green-500" : "bg-cyan-500";
    const smokingProgressPercent = profile?.is_smoker ? (totals.cigarettes / targetCigarettes) * 100 : 0;
    const smokingColor = smokingProgressPercent > 100 ? "bg-red-500" : "bg-slate-400";

    // ログのグループ化
    const mealGroups = useMemo(() => groupLogsBySlot(currentDay?.meals || []), [currentDay]);
    const exerciseGroups = useMemo(() => groupLogsBySlot(currentDay?.exercises || []), [currentDay]);

    // 日付ラベル
    const getDateLabel = (index: number) => {
        if (index === 0) return "今日";
        if (index === 1) return "昨日";
        if (index === 2) return "一昨日";
        return "";
    };

    // 削除ハンドラー
    const handleDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            const supabase = createClient();
            const table = deleteTarget.type === 'meal' ? 'meal_logs' : 'exercise_logs';

            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', deleteTarget.id);

            if (error) throw error;

            // ローカルステートを更新
            setDaysData(prev => prev.map((day, idx) => {
                if (idx !== selectedDayIndex) return day;
                return {
                    ...day,
                    meals: deleteTarget.type === 'meal'
                        ? day.meals.filter(m => m.id !== deleteTarget.id)
                        : day.meals,
                    exercises: deleteTarget.type === 'exercise'
                        ? day.exercises.filter(e => e.id !== deleteTarget.id)
                        : day.exercises,
                };
            }));

            toast.success(`${deleteTarget.name}を削除しました`);
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('削除に失敗しました');
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    // カードタップハンドラー
    const handleCardTap = (logId: string) => {
        setExpandedCardId(prev => prev === logId ? null : logId);
    };

    // 編集ハンドラー
    const handleEdit = (type: 'meal' | 'exercise', logId: string) => {
        // ログページに遷移して編集
        const path = type === 'meal' ? '/log/meal' : '/log/exercise';
        router.push(`${path}?edit=${logId}`);
    };

    // my menu登録ハンドラー
    const handleAddToMyMenu = async (type: 'meal' | 'exercise', log: any) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('ログインが必要です');
                return;
            }

            let favoriteData;
            if (type === 'meal') {
                favoriteData = {
                    user_id: user.id,
                    type: 'meal',
                    name: log.food_name,
                    content: {
                        name: log.food_name,
                        calories: log.calories,
                        protein: log.protein_g,
                        fat: log.fat_g,
                        carbs: log.carbohydrates_g,
                        fiber: log.fiber_g,
                        salt: log.salt_g
                    }
                };
            } else {
                favoriteData = {
                    user_id: user.id,
                    type: 'exercise',
                    name: log.exercise_name,
                    content: {
                        name: log.exercise_name,
                        duration: log.duration_minutes,
                        weight: log.weight_kg,
                        reps: log.reps_per_set,
                        sets: log.sets,
                        calories: log.calories_burned
                    }
                };
            }

            const { error } = await supabase.from('favorites').insert([favoriteData]);
            if (error) throw error;

            toast.success(`「${type === 'meal' ? log.food_name : log.exercise_name}」をMy Menuに登録しました`);
            setExpandedCardId(null);
        } catch (error) {
            console.error('My menu registration error:', error);
            toast.error('My Menu登録に失敗しました');
        }
    };

    // プログレスレンダー関数
    const renderProgress = (label: string, value: number, target: number, isLimitType: boolean, cardBgColor: string, progressColor: string) => {
        const percent = (value / target) * 100;
        let colorClass = progressColor;
        if (isLimitType && percent > 100) colorClass = "bg-red-500";

        return (
            <div className={`p-4 rounded-xl shadow-sm border border-slate-100/50 ${cardBgColor}`}>
                <div className="flex justify-between mb-2 text-sm">
                    <div className="font-bold text-slate-700 flex items-center gap-2">
                        {label}
                        {isLimitType && percent > 100 && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Over</span>
                        )}
                    </div>
                    <span className={isLimitType && percent > 100 ? "font-bold text-red-600" : "text-slate-600/90"}>
                        {value.toFixed(1)} <span className="text-xs text-slate-500/80">/ 目標 {target}g {isLimitType ? "未満" : ""}</span>
                    </span>
                </div>
                <Progress
                    value={Math.min(percent, 100)}
                    className="h-2 bg-white/50"
                    indicatorClassName={colorClass}
                />
            </div>
        );
    };

    return (
        <>
            {/* Header with AI (Only for Today) */}
            <DashboardHeader
                initialData={{
                    weight: latestWeightLog,
                    meals: currentDay?.meals,
                    exercises: currentDay?.exercises,
                }}
                userProfile={profile}
                selectedDateStr={currentDay?.dateStr || todayStr}
                todayStr={todayStr}
            />

            {/* Date Navigation */}
            <div className="sticky top-[88px] z-10 py-1 bg-slate-50/95 backdrop-blur-sm flex items-center justify-center gap-4 overflow-x-auto no-scrollbar px-4">
                <div className="inline-flex p-1 gap-1">
                    {[2, 1, 0].map((daysAgo) => (
                        <button
                            key={daysAgo}
                            onClick={() => setSelectedDayIndex(daysAgo)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedDayIndex === daysAgo
                                ? "bg-indigo-600 text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            {getDateLabel(daysAgo)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/50 rounded-full border border-slate-200 text-sm font-bold text-slate-600 shadow-sm whitespace-nowrap">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {createJSTDate(currentDay?.dateStr || todayStr).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', timeZone: 'Asia/Tokyo' })}
                </div>
            </div>

            {/* Swipeable Main Content */}
            <div ref={swipeRef} className="touch-pan-y min-h-screen">
                <main className="px-4 pt-0 pb-24 space-y-6">
                    {/* Daily Summary (Progress) */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Weight Card - Span 2 cols */}
                        <Card className="col-span-2 bg-indigo-50 border-indigo-100/50 shadow-sm relative overflow-hidden group">
                            <CardHeader className="pb-0 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold text-indigo-900/80 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-indigo-600" /> 体組成データ
                                </CardTitle>
                                <Badge variant="secondary" className="bg-white/50 text-indigo-700 hover:bg-white/80">
                                    目標 {targetWeight} kg
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end mb-4">
                                    <div className="flex items-baseline gap-3">
                                        <div className="text-3xl font-bold text-indigo-950">
                                            {latestWeightLog?.weight_kg || '-'} <span className="text-base font-normal text-indigo-900/60">kg</span>
                                        </div>
                                        {latestWeightLog && profile?.target_weight_kg && (
                                            <div className="text-sm font-medium text-indigo-600/80">
                                                {(() => {
                                                    const diff = profile.target_weight_kg - latestWeightLog.weight_kg;
                                                    const sign = diff > 0 ? '+' : '';
                                                    return `目標まで ${sign}${diff.toFixed(1)} kg`;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-indigo-600/80 mb-1">
                                        {latestWeightLog ? new Date(latestWeightLog.recorded_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '記録なし'}
                                    </div>
                                </div>

                                {/* Body Composition Grid */}
                                {latestWeightLog && (
                                    <div className="grid grid-cols-3 gap-y-3 gap-x-2 pt-3 border-t border-indigo-100/50">
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">体脂肪率</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.body_fat_percentage ? `${latestWeightLog.body_fat_percentage}%` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">筋肉量</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.muscle_mass_kg ? `${latestWeightLog.muscle_mass_kg}kg` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">内臓脂肪Lv</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.visceral_fat_rating ? `${latestWeightLog.visceral_fat_rating}` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">基礎代謝</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.basal_metabolic_rate ? `${Math.round(latestWeightLog.basal_metabolic_rate)}kcal` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">体内年齢</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.metabolic_age ? `${latestWeightLog.metabolic_age}才` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">除脂肪体重</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.lean_body_mass_kg ? `${latestWeightLog.lean_body_mass_kg}kg` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">体水分率</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.body_water_percentage ? `${latestWeightLog.body_water_percentage}%` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">推定骨量</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.bone_mass_kg ? `${latestWeightLog.bone_mass_kg}kg` : '-'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-indigo-900/60">タンパク質</div>
                                            <div className="text-sm font-bold text-indigo-900">{latestWeightLog.protein_percentage ? `${latestWeightLog.protein_percentage}%` : '-'}</div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Intake */}
                        <Card className="bg-rose-50 border-rose-100/50 shadow-sm relative overflow-hidden group">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-sm font-bold text-rose-900/80 flex items-center gap-2">
                                    <Utensils className="h-4 w-4 text-rose-500" /> 摂取カロリー
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline justify-between mb-2">
                                    <div className={`text-2xl font-bold ${intakeProgressPercent > 100 ? 'text-rose-600' : 'text-rose-950'}`}>
                                        {totals.calories.toLocaleString()} <span className="text-sm font-normal text-rose-900/60">kcal</span>
                                    </div>
                                    <div className="text-xs font-bold text-rose-900/60 flex flex-col items-end">
                                        <span>{Math.round(intakeProgressPercent)}%</span>
                                        {intakeProgressPercent > 100 && (
                                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full mt-0.5">Over</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-rose-900/60 mb-2 text-right">
                                    目標 {targetIntake.toLocaleString()} kcal未満
                                </div>
                                <Progress
                                    value={Math.min(intakeProgressPercent, 100)}
                                    className="h-2 bg-white/60"
                                    indicatorClassName={intakeColor}
                                />
                            </CardContent>
                        </Card>

                        {/* Burned */}
                        <Card className="bg-cyan-50 border-cyan-100/50 shadow-sm relative overflow-hidden group">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-sm font-bold text-cyan-900/80 flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-cyan-600" /> 消費カロリー
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline justify-between mb-2">
                                    <div className="text-2xl font-bold text-cyan-950">
                                        {totals.burned.toLocaleString()} <span className="text-sm font-normal text-cyan-900/60">kcal</span>
                                    </div>
                                    <div className="text-xs font-bold text-cyan-900/60">
                                        {Math.round(burnedProgressPercent)}%
                                    </div>
                                </div>
                                <div className="text-xs text-cyan-900/60 mb-2 text-right">
                                    目標 {targetBurned.toLocaleString()} kcal
                                </div>
                                <Progress
                                    value={Math.min(burnedProgressPercent, 100)}
                                    className="h-2 bg-white/60"
                                    indicatorClassName={burnedColor}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Smoking Card (Smokers Only) */}
                    {profile?.is_smoker && (
                        <Card className="bg-slate-100/80 border-slate-200/50 shadow-sm">
                            <CardHeader className="pb-0 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Cigarette className="h-4 w-4 text-slate-500" /> 本日の喫煙
                                </CardTitle>
                                <Badge
                                    variant="secondary"
                                    className="bg-slate-200 text-slate-600"
                                >
                                    消費金額 ¥{Math.round(totals.smokingSpent).toLocaleString()}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between mb-2">
                                    <div className="flex items-baseline gap-2">
                                        <div className={`text-2xl font-bold ${smokingProgressPercent > 100 ? 'text-red-600' : 'text-slate-800'}`}>
                                            {totals.cigarettes}
                                            <span className="text-sm font-normal text-slate-500 ml-1">本</span>
                                        </div>
                                        {smokingProgressPercent > 100 && (
                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Over</span>
                                        )}
                                        {totals.cigarettes === 0 && (
                                            <div className="flex items-center gap-1 text-sm bg-green-100 text-green-600 px-2.5 py-0.5 rounded-full">
                                                <Check className="h-4 w-4" />
                                                {(() => {
                                                    // 表示している日付（JST）
                                                    const currentViewDate = createJSTDate(currentDay.dateStr);

                                                    // currentViewDate より「前」にある最新の喫煙日を探す
                                                    // lastSmokeDates は新しい順（降順）に並んでいるはず
                                                    // string[] -> Date[]
                                                    const smokeDates = lastSmokeDates.map(d => new Date(d));

                                                    // currentViewDate の 00:00 より前に喫煙した記録を探す
                                                    const lastSmokeBeforeCurrent = smokeDates.find(d => {
                                                        return d < currentViewDate;
                                                    });

                                                    if (!lastSmokeBeforeCurrent) {
                                                        // 該当する過去の喫煙がない場合
                                                        // プロフィール作成日などを起点にする
                                                        const created = profile?.created_at ? new Date(profile.created_at) : new Date();
                                                        const diff = differenceInCalendarDays(currentViewDate, created);
                                                        return `禁煙 ${Math.max(1, diff + 1)}日目`;
                                                    }

                                                    // 最後に吸った日からの経過日数
                                                    const diff = differenceInCalendarDays(currentViewDate, lastSmokeBeforeCurrent);

                                                    return `禁煙 ${Math.max(1, diff)}日目`;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-slate-500">
                                            {Math.round(smokingProgressPercent)}<span className="text-xs font-normal text-slate-400 ml-0.5">%</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">目標 {targetCigarettes}本</div>
                                    </div>
                                </div>
                                <Progress
                                    value={Math.min(smokingProgressPercent, 100)}
                                    className="h-2 bg-white/60"
                                    indicatorClassName={smokingColor}
                                />
                                {profile.cigarette_brand && (
                                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                        <span className="text-slate-400">銘柄:</span>
                                        {profile.cigarette_brand}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* PFC & Salt/Fiber Summary */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-500">栄養バランス</h2>
                        {renderProgress("タンパク質", totals.protein, targetProtein, false, "bg-orange-50", "bg-orange-500")}
                        {renderProgress("脂質", totals.fat, targetFat, true, "bg-yellow-50", "bg-yellow-500")}
                        {renderProgress("炭水化物", totals.carbs, targetCarbs, true, "bg-blue-50", "bg-blue-500")}
                        {renderProgress("食物繊維", totals.fiber, targetFiber, false, "bg-green-50", "bg-green-500")}
                        {renderProgress("塩分", totals.salt, targetSalt, true, "bg-purple-50", "bg-purple-500")}
                    </div>

                    {/* Dietary Logs */}
                    <div>
                        <h2 className="text-sm font-bold text-slate-500 mb-4">{getDateLabel(selectedDayIndex)}の食事</h2>
                        <div className="space-y-6">
                            {(currentDay?.meals && currentDay.meals.length > 0) ? (
                                ['morning', 'afternoon', 'night'].map(slot => {
                                    const logs = mealGroups[slot as keyof typeof mealGroups];
                                    if (logs.length === 0) return null;
                                    return (
                                        <div key={slot} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500">{slotLabels[slot]}</span>
                                                <div className="h-px flex-1 bg-slate-200"></div>
                                            </div>
                                            {logs.map((log) => {
                                                const raw = log.ai_analysis_raw as any;
                                                const emoji = raw?.emoji || "🍽️";
                                                return (
                                                    <div key={log.id} className={`rounded-xl shadow-sm border ${slotStyles[slot]} overflow-hidden transition-all duration-300`}>
                                                        {/* メインカード部分 */}
                                                        <div
                                                            className="p-4 flex items-center gap-4 cursor-pointer active:bg-white/30 transition-colors"
                                                            onClick={() => handleCardTap(log.id)}
                                                        >
                                                            <div className="h-12 w-12 bg-white/60 rounded-lg flex items-center justify-center text-2xl">
                                                                {emoji}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-slate-900 truncate">{log.food_name}</h4>
                                                                <p className="text-xs text-slate-500">{new Date(log.recorded_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-slate-900">{log.calories} kcal</div>
                                                                <div className="text-xs text-slate-400">P{log.protein_g} F{log.fat_g} C{log.carbohydrates_g}</div>
                                                            </div>
                                                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${expandedCardId === log.id ? 'rotate-180' : ''}`} />
                                                        </div>
                                                        {/* アクションパネル */}
                                                        <div className={`grid grid-cols-3 gap-2 px-4 transition-all duration-300 ease-in-out ${expandedCardId === log.id ? 'max-h-20 pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0 overflow-hidden'}`}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEdit('meal', log.id); }}
                                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                <span>編集</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleAddToMyMenu('meal', log); }}
                                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Star className="h-4 w-4" />
                                                                <span>登録</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'meal', id: log.id, name: log.food_name }); setExpandedCardId(null); }}
                                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span>削除</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center bg-white rounded-lg border border-dashed border-slate-300">
                                    <p className="text-slate-400">まだ記録がありません</p>
                                    <p className="text-xs text-slate-400 mt-1">最初の食事を記録してみましょう</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Exercise Logs */}
                    <div>
                        <h2 className="text-sm font-bold text-slate-500 mb-4">{getDateLabel(selectedDayIndex)}の運動</h2>
                        <div className="space-y-6">
                            {(currentDay?.exercises && currentDay.exercises.length > 0) ? (
                                ['morning', 'afternoon', 'night'].map(slot => {
                                    const logs = exerciseGroups[slot as keyof typeof exerciseGroups];
                                    if (logs.length === 0) return null;
                                    return (
                                        <div key={slot} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500">{slotLabels[slot]}</span>
                                                <div className="h-px flex-1 bg-slate-200"></div>
                                            </div>
                                            {logs.map((log) => {
                                                const raw = log.ai_analysis_raw as any;
                                                const emoji = raw?.emoji || "💪";
                                                return (
                                                    <div key={log.id} className={`rounded-xl shadow-sm border ${slotStyles[slot]} overflow-hidden transition-all duration-300`}>
                                                        {/* メインカード部分 */}
                                                        <div
                                                            className="p-4 flex items-center gap-4 cursor-pointer active:bg-white/30 transition-colors"
                                                            onClick={() => handleCardTap(log.id)}
                                                        >
                                                            <div className="h-12 w-12 bg-white/60 rounded-lg flex items-center justify-center text-2xl">
                                                                {emoji}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-slate-900 truncate">{log.exercise_name}</h4>
                                                                <p className="text-xs text-slate-500">
                                                                    {new Date(log.recorded_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-slate-900">{log.calories_burned} kcal</div>
                                                                <div className="text-xs text-slate-400">
                                                                    {log.duration_minutes > 0 ? `${log.duration_minutes}分` : ''}
                                                                    {log.sets ? ` / ${log.sets}セット` : ''}
                                                                </div>
                                                            </div>
                                                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${expandedCardId === log.id ? 'rotate-180' : ''}`} />
                                                        </div>
                                                        {/* アクションパネル */}
                                                        <div className={`grid grid-cols-3 gap-2 px-4 transition-all duration-300 ease-in-out ${expandedCardId === log.id ? 'max-h-20 pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0 overflow-hidden'}`}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEdit('exercise', log.id); }}
                                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                <span>編集</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleAddToMyMenu('exercise', log); }}
                                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Star className="h-4 w-4" />
                                                                <span>登録</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'exercise', id: log.id, name: log.exercise_name }); setExpandedCardId(null); }}
                                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span>削除</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center bg-white rounded-lg border border-dashed border-slate-300">
                                    <p className="text-slate-400">まだ運動の記録がありません</p>
                                    <p className="text-xs text-slate-400 mt-1">運動を記録してみましょう</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* 削除確認ダイアログ */}
            <DeleteConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title={`「${deleteTarget?.name || ''}」を削除しますか？`}
                description=""
            />
        </>
    );
}
