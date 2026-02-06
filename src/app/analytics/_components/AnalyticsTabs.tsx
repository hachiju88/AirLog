'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Utensils, Flame, Cigarette, Skull, Clock, TrendingDown } from "lucide-react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SmokingData = {
    trend: { date: string; count: number }[];
    target: number;
    average: number;
    averageSpent: number;
    total: number;
    totalSpent: number;
    lifeConsumedMinutes: number;
};

type AnalyticsTabsProps = {
    currentTab: string;
    period: string;
    // Data Props
    weightData: {
        trend: any[];
        average: any; // Changed from latest
        target?: number;
    };
    mealData: {
        calories: any[];
        nutrients: any;
        target: number;
    };
    exerciseData: {
        calories: any[];
        target: number;

        total: number;
        average: number;
        logs: any[];
    };
    smokingData?: SmokingData;
    isSmoker?: boolean;
};

import { WeightTrendChart } from "./WeightTrendChart";
import { BodyCompositionGrid } from "./BodyCompositionGrid";
import { MealCalorieChart } from "./MealCalorieChart";
import { NutrientBalanceList } from "./NutrientBalanceList";
import { ExerciseCalorieChart } from "./ExerciseCalorieChart";

import { ExerciseSummary } from "./ExerciseSummary";
import { ExerciseHistoryList } from "./ExerciseHistoryList";
import { SmokingTrendChart } from "./SmokingTrendChart";

export function AnalyticsTabs({ currentTab, period, weightData, mealData, exerciseData, smokingData, isSmoker }: AnalyticsTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    /** タブの順序定義 - 喫煙者の場合は喫煙タブを追加 */
    const TAB_ORDER = useMemo(() =>
        isSmoker ? ['weight', 'meal', 'exercise', 'smoking'] : ['weight', 'meal', 'exercise'],
        [isSmoker]
    );

    const handleTabChange = useCallback((val: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', val);
        router.replace(`?${params.toString()}`);
    }, [router, searchParams]);

    /** 次のタブへ移動 */
    const goToNextTab = useCallback(() => {
        const currentIndex = TAB_ORDER.indexOf(currentTab);
        if (currentIndex < TAB_ORDER.length - 1) {
            handleTabChange(TAB_ORDER[currentIndex + 1]);
        }
    }, [currentTab, handleTabChange, TAB_ORDER]);

    /** 前のタブへ移動 */
    const goToPrevTab = useCallback(() => {
        const currentIndex = TAB_ORDER.indexOf(currentTab);
        if (currentIndex > 0) {
            handleTabChange(TAB_ORDER[currentIndex - 1]);
        }
    }, [currentTab, handleTabChange, TAB_ORDER]);

    // スワイプジェスチャーのref
    const swipeRef = useSwipeGesture<HTMLDivElement>({
        onSwipeLeft: goToNextTab,
        onSwipeRight: goToPrevTab,
        threshold: 50
    });

    const periodLabel = (() => {
        switch (period) {
            case 'week': return '過去1週間';
            case 'month': return '過去1ヶ月';
            case 'year': return '過去1年';
            case '5years': return '過去5年';
            default: return '';
        }
    })();

    /** 時間のフォーマット */
    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes}分`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours < 24) return `${hours}時間${mins > 0 ? mins + '分' : ''}`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}日${remainingHours > 0 ? remainingHours + '時間' : ''}`;
    };

    const isSmoking = currentTab === 'smoking';

    return (
        <div ref={swipeRef} className={`touch-pan-y ${isSmoking ? 'rounded-xl' : ''}`}>
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className={`
                    grid w-full mb-6 
                    ${isSmoker ? 'grid-cols-4' : 'grid-cols-3'} 
                    ${isSmoking ? 'bg-slate-800' : 'bg-slate-100/80'}
                `}>
                    <TabsTrigger value="weight" className={`data-[state=active]:bg-indigo-600 data-[state=active]:text-white ${isSmoking ? '!text-slate-400 hover:!text-slate-200' : ''}`}>
                        <Activity className="h-4 w-4 mr-2" /> 体重
                    </TabsTrigger>
                    <TabsTrigger value="meal" className={`data-[state=active]:bg-rose-500 data-[state=active]:text-white ${isSmoking ? '!text-slate-400 hover:!text-slate-200' : ''}`}>
                        <Utensils className="h-4 w-4 mr-2" /> 食事
                    </TabsTrigger>
                    <TabsTrigger value="exercise" className={`data-[state=active]:bg-cyan-500 data-[state=active]:text-white ${isSmoking ? '!text-slate-400 hover:!text-slate-200' : ''}`}>
                        <Flame className="h-4 w-4 mr-2" /> 運動
                    </TabsTrigger>
                    {isSmoker && (
                        <TabsTrigger value="smoking" className={`data-[state=active]:!bg-slate-700 data-[state=active]:!text-slate-100 ${isSmoking ? '!text-slate-400 hover:!text-slate-200' : ''}`}>
                            <Cigarette className="h-4 w-4 mr-2" /> 喫煙
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="weight" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                    <WeightTrendChart data={weightData.trend} target={weightData.target} period={period} />
                    <BodyCompositionGrid data={weightData.average} periodLabel={periodLabel} />
                </TabsContent>

                <TabsContent value="meal" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                    <MealCalorieChart data={mealData.calories} target={mealData.target} period={period} />
                    <NutrientBalanceList data={mealData.nutrients} periodLabel={periodLabel} />
                </TabsContent>

                <TabsContent value="exercise" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                    <ExerciseCalorieChart data={exerciseData.calories} target={exerciseData.target} period={period} />
                    <ExerciseSummary total={exerciseData.total} average={exerciseData.average} periodLabel={periodLabel} />
                    <ExerciseHistoryList logs={exerciseData.logs} />
                </TabsContent>

                {isSmoker && smokingData && (
                    <TabsContent value="smoking" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                        {/* ダークテーマのコンテナ */}
                        <div className="bg-slate-900 rounded-xl p-4 -mx-4 space-y-6">

                            {/* トレンドチャート */}
                            <SmokingTrendChart data={smokingData.trend} target={smokingData.target} period={period} />

                            {/* 禁煙ガールフレンドボタン */}
                            <Link href="/analytics/girlfriend" className="block my-4">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 bg-slate-800/50 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                                >
                                    <Skull className="h-5 w-5 mr-2 text-red-400" />
                                    禁煙ガールフレンドと話す
                                </Button>
                            </Link>

                            {/* 平均 */}
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4" /> {periodLabel}の平均
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-100">
                                            {smokingData.average.toFixed(1)}本
                                        </div>
                                        <div className="text-xs text-slate-500">1日平均</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-100">
                                            ¥{Math.round(smokingData.averageSpent).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-slate-500">1日平均消費金額</div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 累計 */}
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                        <Cigarette className="h-4 w-4" /> {periodLabel}の累計
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-slate-100">
                                            {smokingData.total}本
                                        </div>
                                        <div className="text-xs text-slate-500">吸った本数</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-slate-100">
                                            ¥{Math.round(smokingData.totalSpent).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-slate-500">消費金額</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-red-400 flex items-center justify-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {formatTime(smokingData.lifeConsumedMinutes)}
                                        </div>
                                        <div className="text-xs text-slate-500">消費された いのち</div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 警告メッセージ */}
                            {smokingData.lifeConsumedMinutes > 0 && (
                                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-center">
                                    <p className="text-red-300 text-sm">
                                        🚬 タバコ1本につき約5分の命が縮まると言われています
                                    </p>
                                    <p className="text-red-400 text-xs mt-1">
                                        {periodLabel}で {formatTime(smokingData.lifeConsumedMinutes)} の命を消費しました
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

