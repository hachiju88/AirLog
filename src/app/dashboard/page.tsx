import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Camera, Mic, Activity, Flame, Utensils } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "./_components/DashboardHeader";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fallback if no profile
    const displayName = profile?.full_name || 'ゲスト';
    const targetWeight = profile?.target_weight_kg || '-';


    // Date range for "today"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch Meal Logs
    let { data: todaysLogs } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', today.toISOString())
        .lt('recorded_at', tomorrow.toISOString())
        .order('recorded_at', { ascending: false });

    // Filter out pending drafts
    if (todaysLogs) {
        todaysLogs = todaysLogs.filter(log => {
            const raw = log.ai_analysis_raw as any;
            return raw?.status !== 'pending';
        });
    }

    // Fetch Exercise Logs
    let { data: todaysExercises } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', today.toISOString())
        .lt('recorded_at', tomorrow.toISOString())
        .order('recorded_at', { ascending: false });

    if (todaysExercises) {
        todaysExercises = todaysExercises.filter(log => {
            const raw = log.ai_analysis_raw as any;
            return raw?.status !== 'pending';
        });
    }

    // Fetch Latest Weight
    const { data: latestWeightLog } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

    // Calculate totals
    // Calorie Targets (default if not set)
    // Calorie Targets (default if not set)
    const targetIntake = profile?.target_calories_intake || 2200;
    const targetBurned = profile?.target_calories_burned || 300;

    // Dynamic Goals (PFC Balance: P 15%, F 25%, C 60%)
    const targetProtein = Math.round((targetIntake * 0.15) / 4);
    const targetFat = Math.round((targetIntake * 0.25) / 9);
    const targetCarbs = Math.round((targetIntake * 0.60) / 4);
    const targetFiber = 20; // Fixed
    const targetSalt = 7.5; // Fixed

    // Calculate totals
    const totalCalories = todaysLogs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
    const totalBurned = todaysExercises?.reduce((sum, log) => sum + (log.calories_burned || 0), 0) || 0;
    const totalProtein = todaysLogs?.reduce((sum, log) => sum + (log.protein_g || 0), 0) || 0;
    const totalFat = todaysLogs?.reduce((sum, log) => sum + (log.fat_g || 0), 0) || 0;
    const totalCarbs = todaysLogs?.reduce((sum, log) => sum + (log.carbohydrates_g || 0), 0) || 0;

    // Intake Progress Logic
    const intakeProgressPercent = (totalCalories / targetIntake) * 100;
    let intakeColor = "bg-primary";
    if (intakeProgressPercent > 120) intakeColor = "bg-red-500";
    else if (intakeProgressPercent > 100) intakeColor = "bg-orange-500";

    // Burned Progress Logic
    const burnedProgressPercent = (totalBurned / targetBurned) * 100;
    let burnedColor = "bg-cyan-500"; // Default Blue
    if (burnedProgressPercent >= 100) burnedColor = "bg-green-500"; // Goal Met!

    return (
        <div className="min-h-screen bg-slate-50 pb-24">

            {/* Header */}
            <DashboardHeader
                initialData={{
                    weight: latestWeightLog,
                    meals: todaysLogs,
                    exercises: todaysExercises,
                    totalCalories,
                    totalBurned
                }}
                userProfile={profile}
            />

            <main className="px-4 py-6 space-y-6">
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
                                    {latestWeightLog ? new Date(latestWeightLog.recorded_at).toLocaleDateString('ja-JP') : '記録なし'}
                                </div>
                            </div>

                            {/* Body Composition Grid - All 9 items */}
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
                                    {totalCalories.toLocaleString()} <span className="text-sm font-normal text-rose-900/60">kcal</span>
                                </div>
                                <div className="text-xs font-bold text-rose-900/60 flex items-center gap-1">
                                    {Math.round(intakeProgressPercent)}%
                                    {intakeProgressPercent > 100 && (
                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Over</span>
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
                                    {totalBurned.toLocaleString()} <span className="text-sm font-normal text-cyan-900/60">kcal</span>
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

                {/* PFC & Salt/Fiber Summary */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-500">栄養バランス</h2>

                    {/* Helper to calculate progress props */}
                    {(() => {
                        const renderProgress = (label: string, value: number, target: number, isLimitType: boolean, cardBgColor: string) => {
                            const percent = (value / target) * 100;

                            // Logic:
                            // If isLimitType (Fat, Carbs, Salt): <100 ok (Black), >100 Alert (Red) + Over Badge
                            // If not limit (Protein, Fiber): Always Black (bg-primary)

                            let colorClass = "bg-primary";

                            if (isLimitType) {
                                if (percent > 100) colorClass = "bg-red-500";
                            }

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
                                {renderProgress("タンパク質", totalProtein, targetProtein, false, "bg-orange-50")}
                                {renderProgress("脂質", totalFat, targetFat, true, "bg-yellow-50")}
                                {renderProgress("炭水化物", totalCarbs, targetCarbs, true, "bg-blue-50")}

                                {renderProgress("食物繊維", todaysLogs?.reduce((sum, log) => sum + (log.fiber_g || 0), 0) || 0, targetFiber, false, "bg-green-50")}
                                {renderProgress("塩分", todaysLogs?.reduce((sum, log) => sum + (log.salt_g || 0), 0) || 0, targetSalt, true, "bg-purple-50")}
                            </>
                        );
                    })()}
                </div>

                {/* Dietary Logs */}
                <div>
                    <h2 className="text-sm font-bold text-slate-500 mb-4">今日の食事</h2>
                    <div className="space-y-3">
                        {todaysLogs && todaysLogs.length > 0 ? (
                            todaysLogs.map((log) => {
                                const raw = log.ai_analysis_raw as any;
                                const emoji = raw?.emoji || "🍽️";

                                return (
                                    <div key={log.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className="h-12 w-12 bg-slate-50 rounded-lg flex items-center justify-center text-2xl">
                                            {emoji}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900">{log.food_name}</h4>
                                            <p className="text-xs text-slate-500">{new Date(log.recorded_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{log.calories} kcal</div>
                                            <div className="text-xs text-slate-400">P{log.protein_g} F{log.fat_g} C{log.carbohydrates_g}</div>
                                        </div>
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
                    <h2 className="text-sm font-bold text-slate-500 mb-4">今日の運動</h2>
                    <div className="space-y-3">
                        {todaysExercises && todaysExercises.length > 0 ? (
                            todaysExercises.map((log) => {
                                const raw = log.ai_analysis_raw as any;
                                const emoji = raw?.emoji || "💪";

                                return (
                                    <div key={log.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className="h-12 w-12 bg-slate-50 rounded-lg flex items-center justify-center text-2xl">
                                            {emoji}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900">{log.exercise_name}</h4>
                                            <p className="text-xs text-slate-500">
                                                {new Date(log.recorded_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{log.calories_burned} kcal</div>
                                            <div className="text-xs text-slate-400">
                                                {log.duration_minutes > 0 ? `${log.duration_minutes}分` : ''}
                                                {log.sets ? ` / ${log.sets}セット` : ''}
                                            </div>
                                        </div>
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

            <BottomNav />
        </div>
    );
}
