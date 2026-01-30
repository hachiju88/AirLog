import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExerciseSummaryProps = {
    total: number;
    average: number;
    periodLabel: string;
};

export function ExerciseSummary({ total, average, periodLabel }: ExerciseSummaryProps) {
    return (
        <Card className="bg-cyan-50/50 border-cyan-100">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-500">平均消費カロリー ({periodLabel})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg text-center shadow-sm border border-cyan-50">
                        <div className="text-xs text-slate-500 mb-1">合計</div>
                        <div className="text-xl font-bold text-cyan-600">
                            {total.toLocaleString()} <span className="text-sm font-normal">kcal</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center shadow-sm border border-cyan-50">
                        <div className="text-xs text-slate-500 mb-1">1日平均</div>
                        <div className="text-xl font-bold text-cyan-700">
                            {Math.round(average).toLocaleString()} <span className="text-sm font-normal">kcal</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
