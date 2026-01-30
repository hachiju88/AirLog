'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Utensils, Flame } from "lucide-react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useCallback } from "react";

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
};

import { WeightTrendChart } from "./WeightTrendChart";
import { BodyCompositionGrid } from "./BodyCompositionGrid";
import { MealCalorieChart } from "./MealCalorieChart";
import { NutrientBalanceList } from "./NutrientBalanceList";
import { ExerciseCalorieChart } from "./ExerciseCalorieChart";

import { ExerciseSummary } from "./ExerciseSummary";
import { ExerciseHistoryList } from "./ExerciseHistoryList";

/** タブの順序定義 */
const TAB_ORDER = ['weight', 'meal', 'exercise'];

export function AnalyticsTabs({ currentTab, period, weightData, mealData, exerciseData }: AnalyticsTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

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
    }, [currentTab, handleTabChange]);

    /** 前のタブへ移動 */
    const goToPrevTab = useCallback(() => {
        const currentIndex = TAB_ORDER.indexOf(currentTab);
        if (currentIndex > 0) {
            handleTabChange(TAB_ORDER[currentIndex - 1]);
        }
    }, [currentTab, handleTabChange]);

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
            default: return '';
        }
    })();

    return (
        <div ref={swipeRef} className="touch-pan-y">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/80">
                    <TabsTrigger value="weight" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <Activity className="h-4 w-4 mr-2" /> 体重
                    </TabsTrigger>
                    <TabsTrigger value="meal" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                        <Utensils className="h-4 w-4 mr-2" /> 食事
                    </TabsTrigger>
                    <TabsTrigger value="exercise" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                        <Flame className="h-4 w-4 mr-2" /> 運動
                    </TabsTrigger>
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
            </Tabs>
        </div>
    );
}
