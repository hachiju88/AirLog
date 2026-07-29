import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type MovementSummaryProps = {
    total: number;
    totalBurned: number;
    monthlyNorm: number;
    periodLabel: string;
};

/**
 * 移動サマリー
 *
 * 期間内の合計距離・消費カロリーと、月次移動ノルマに対する進捗を表示。
 */
export function MovementSummary({ total, totalBurned, monthlyNorm, periodLabel }: MovementSummaryProps) {
    const normPercent = monthlyNorm > 0 ? Math.min((total / monthlyNorm) * 100, 100) : 0;

    return (
        <Card className="bg-emerald-50/50 border-emerald-100">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-500">移動サマリー ({periodLabel})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg text-center shadow-sm border border-emerald-50">
                        <div className="text-xs text-slate-500 mb-1">合計距離</div>
                        <div className="text-xl font-bold text-emerald-600">
                            {total.toFixed(2)} <span className="text-sm font-normal">km</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg text-center shadow-sm border border-emerald-50">
                        <div className="text-xs text-slate-500 mb-1">消費カロリー</div>
                        <div className="text-xl font-bold text-emerald-700">
                            {Math.round(totalBurned).toLocaleString()} <span className="text-sm font-normal">kcal</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>今月のノルマ達成度</span>
                        <span className="font-bold text-emerald-600">
                            {total.toFixed(1)} / {monthlyNorm} km
                        </span>
                    </div>
                    <Progress value={normPercent} className="h-2" />
                </div>
            </CardContent>
        </Card>
    );
}
