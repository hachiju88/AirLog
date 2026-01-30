import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExerciseLog = {
    id: string;
    recorded_at: string;
    exercise_name: string;
    calories_burned: number;
    duration_minutes: number;
    sets?: number;
    reps?: number;
    weight_kg?: number;
};

type ExerciseHistoryListProps = {
    logs: ExerciseLog[];
};

export function ExerciseHistoryList({ logs }: ExerciseHistoryListProps) {
    if (!logs || logs.length === 0) {
        return null;
    }

    // Sort by date desc (newest first)
    const sortedLogs = [...logs].sort((a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );

    return (
        <Card className="bg-cyan-50/50 border-cyan-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-cyan-100">
                <CardTitle className="text-sm font-bold text-slate-500">運動実績</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {sortedLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-white rounded-lg border border-cyan-100/50 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                            <div className="flex-1 min-w-0 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-cyan-600/60 font-mono">
                                        {format(new Date(log.recorded_at), "MM/dd HH:mm", { locale: ja })}
                                    </span>
                                    <h4 className="text-sm font-bold text-slate-700 truncate">
                                        {log.exercise_name}
                                    </h4>
                                </div>
                                <div className="text-xs text-slate-500 flex gap-2">
                                    {log.duration_minutes > 0 && <span>{log.duration_minutes}分</span>}
                                    {log.weight_kg ? <span>{log.weight_kg}kg</span> : null}
                                    {log.reps ? <span>{log.reps}回</span> : null}
                                    {log.sets ? <span>{log.sets}セット</span> : null}
                                </div>
                            </div>
                            <div className="text-right whitespace-nowrap">
                                <span className="text-sm font-bold text-cyan-600 block">
                                    {log.calories_burned} <span className="text-xs font-normal text-slate-400">kcal</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
