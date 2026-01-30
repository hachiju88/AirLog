import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NutrientData = {
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    salt: number;
};

// Standard logic, but could be passed as props
const TARGETS = {
    protein: 80,
    fat: 60,
    carbs: 300,
    fiber: 20,
    salt: 7.5
};

export function NutrientBalanceList({ data, periodLabel }: { data: NutrientData, periodLabel: string }) {

    // Helper to calculate progress props
    const renderProgress = (label: string, value: number, target: number, isLimitType: boolean, colorClass: string) => {
        const percent = (value / target) * 100;
        let indicatorColor = colorClass;

        if (isLimitType && percent > 100) {
            indicatorColor = "bg-red-500";
        }

        return (
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <div className="font-medium text-slate-700 flex items-center gap-2">
                        {label}
                        {isLimitType && percent > 100 && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Over</span>
                        )}
                    </div>
                    <span className={isLimitType && percent > 100 ? "font-bold text-red-600" : "text-slate-500"}>
                        {value.toFixed(1)} <span className="text-[10px] opacity-70">/ {target}g</span>
                    </span>
                </div>
                <Progress
                    value={Math.min(percent, 100)}
                    className="h-2 bg-slate-100"
                    indicatorClassName={indicatorColor}
                />
            </div>
        );
    };

    return (
        <Card className="bg-rose-50/50 border-rose-100">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-500">平均栄養バランス ({periodLabel})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                {renderProgress("タンパク質 (P)", data.protein, TARGETS.protein, false, "bg-orange-500")}
                {renderProgress("脂質 (F)", data.fat, TARGETS.fat, true, "bg-yellow-500")}
                {renderProgress("炭水化物 (C)", data.carbs, TARGETS.carbs, true, "bg-blue-500")}

                <div className="pt-2 grid grid-cols-2 gap-4">
                    {renderProgress("食物繊維", data.fiber, TARGETS.fiber, false, "bg-green-500")}
                    {renderProgress("塩分", data.salt, TARGETS.salt, true, "bg-purple-500")}
                </div>
            </CardContent>
        </Card>
    );
}
