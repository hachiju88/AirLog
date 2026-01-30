'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Utensils, Flame } from "lucide-react";

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

export function AnalyticsTabs({ currentTab, period, weightData, mealData, exerciseData }: AnalyticsTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', val);
        router.replace(`?${params.toString()}`);
    };

    const periodLabel = (() => {
        switch (period) {
            case 'week': return '過去1週間';
            case 'month': return '過去1ヶ月';
            case 'year': return '過去1年';
            default: return '';
        }
    })();

    return (
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
                <WeightTrendChart data={weightData.trend} target={weightData.target} />
                <BodyCompositionGrid data={weightData.average} periodLabel={periodLabel} />
            </TabsContent>

            <TabsContent value="meal" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                <MealCalorieChart data={mealData.calories} target={mealData.target} />
                <NutrientBalanceList data={mealData.nutrients} periodLabel={periodLabel} />
            </TabsContent>

            <TabsContent value="exercise" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                <ExerciseCalorieChart data={exerciseData.calories} target={exerciseData.target} />
                <ExerciseSummary total={exerciseData.total} average={exerciseData.average} periodLabel={periodLabel} />
                <ExerciseHistoryList logs={exerciseData.logs} />
            </TabsContent>
        </Tabs>
    );
}
