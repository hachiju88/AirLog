import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Flame, Utensils, Calendar } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "./_components/DashboardHeader";

type Props = {
    searchParams: Promise<{ date?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
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

    // Resolved params (Nextjs 15+ needs await, 16 is safer to await too)
    const { date } = await searchParams;

    // Date Logic (Robust JST)
    const getJSTDateStr = () => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(now);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        return `${y}-${m}-${d}`;
    };

    const todayStr = getJSTDateStr();
    const selectedDateStr = date || todayStr;

    // Construct Range: 00:00 JST to 00:00 JST next day
    // We use explicit offset in string to ensure consistency across environments (UTC or JST server)
    const startJST = new Date(`${selectedDateStr}T00:00:00+09:00`);
    const endJST = new Date(startJST.getTime() + 24 * 60 * 60 * 1000);

    // Queries use ISO strings which are always UTC
    const startUTC = startJST;
    const endUTC = endJST;

    // AI Context Logic
    // Update: User requested NO AI generation for past dates.
    // So we just fetch the data for the selected view range.

    // Fetch Meal Logs
    let { data: todaysLogs } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', startUTC.toISOString())
        .lt('recorded_at', endUTC.toISOString())
        .order('recorded_at', { ascending: false });

    // Filter meals
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
        .gte('recorded_at', startUTC.toISOString())
        .lt('recorded_at', endUTC.toISOString())
        .order('recorded_at', { ascending: true });

    if (todaysExercises) {
        todaysExercises = todaysExercises.filter(log => {
            const raw = log.ai_analysis_raw as any;
            return raw?.status !== 'pending';
        });
    }

    // Fetch Latest Weight (Always latest known)
    const { data: latestWeightLog } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

    // Date Navigation Generators
    // Date Navigation Generators
    const todayJSTforNav = new Date(`${todayStr}T00:00:00+09:00`);

    const getLink = (offset: number) => {
        const d = new Date(todayJSTforNav);
        d.setDate(d.getDate() - offset);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `/dashboard?date=${y}-${m}-${da}`;
    };
    const formatDate = (d: Date) => {
        return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' });
    };

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
    let intakeColor = "bg-rose-400";
    if (intakeProgressPercent > 100) intakeColor = "bg-red-500";

    // Burned Progress Logic
    const burnedProgressPercent = (totalBurned / targetBurned) * 100;
    let burnedColor = "bg-cyan-500"; // Default Blue
    if (burnedProgressPercent >= 100) burnedColor = "bg-green-500"; // Goal Met!

    // Grouping Logic
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

    const mealGroups = groupLogsBySlot(todaysLogs || []);
    const exerciseGroups = groupLogsBySlot(todaysExercises || []);

    const slotLabels: { [key: string]: string } = { morning: '朝', afternoon: '昼', night: '夜' };
    const slotStyles: { [key: string]: string } = {
        morning: 'bg-orange-50 border-orange-100',
        afternoon: 'bg-sky-50 border-sky-100',
        night: 'bg-indigo-50 border-indigo-100'
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">

            {/* Header with AI (Only for Today) */}
            <DashboardHeader
                initialData={{
                    weight: latestWeightLog,
                    meals: todaysLogs,
                    exercises: todaysExercises,
                }}
                userProfile={profile}
                selectedDate={startJST}
            />

            {/* Date Navigation - Separate from Header, Sticky below header */}
            <div className="sticky top-[88px] z-10 py-1 bg-slate-50/95 backdrop-blur-sm flex items-center justify-center gap-4 overflow-x-auto no-scrollbar px-4">
                <div className="inline-flex p-1 gap-1">
                    {[2, 1, 0].map((daysAgo) => {
                        const d = new Date(todayJSTforNav);
                        d.setDate(d.getDate() - daysAgo);

                        // Determine active: Comparing JST Day equality
                        const isActive = startJST.getTime() === d.getTime();

                        return (
                            <Link
                                key={daysAgo}
                                href={getLink(daysAgo)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isActive
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                {daysAgo === 0 ? "今日" : daysAgo === 1 ? "昨日" : daysAgo === 2 ? "一昨日" : formatDate(d)}
                            </Link>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/50 rounded-full border border-slate-200 text-sm font-bold text-slate-600 shadow-sm whitespace-nowrap">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {startJST.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', timeZone: 'Asia/Tokyo' })}
                </div>
            </div>

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
                        const renderProgress = (label: string, value: number, target: number, isLimitType: boolean, cardBgColor: string, progressColor: string) => {
                            const percent = (value / target) * 100;

                            // Logic:
                            // If isLimitType (Fat, Carbs, Salt): <100 ok (progressColor), >100 Alert (Red) + Over Badge
                            // If not limit (Protein, Fiber): Always progressColor

                            let colorClass = progressColor;

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
                                {renderProgress("タンパク質", totalProtein, targetProtein, false, "bg-orange-50", "bg-orange-500")}
                                {renderProgress("脂質", totalFat, targetFat, true, "bg-yellow-50", "bg-yellow-500")}
                                {renderProgress("炭水化物", totalCarbs, targetCarbs, true, "bg-blue-50", "bg-blue-500")}

                                {renderProgress("食物繊維", todaysLogs?.reduce((sum, log) => sum + (log.fiber_g || 0), 0) || 0, targetFiber, false, "bg-green-50", "bg-green-500")}
                                {renderProgress("塩分", todaysLogs?.reduce((sum, log) => sum + (log.salt_g || 0), 0) || 0, targetSalt, true, "bg-purple-50", "bg-purple-500")}
                            </>
                        );
                    })()}
                </div>

                {/* Dietary Logs */}
                <div>
                    <h2 className="text-sm font-bold text-slate-500 mb-4">今日の食事</h2>
                    <div className="space-y-6">
                        {(todaysLogs && todaysLogs.length > 0) ? (
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
                                                <div key={log.id} className={`p-4 rounded-xl shadow-sm border ${slotStyles[slot]} flex items-center gap-4`}>
                                                    <div className="h-12 w-12 bg-white/60 rounded-lg flex items-center justify-center text-2xl">
                                                        {emoji}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900">{log.food_name}</h4>
                                                        <p className="text-xs text-slate-500">{new Date(log.recorded_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-900">{log.calories} kcal</div>
                                                        <div className="text-xs text-slate-400">P{log.protein_g} F{log.fat_g} C{log.carbohydrates_g}</div>
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
                    <h2 className="text-sm font-bold text-slate-500 mb-4">今日の運動</h2>
                    <div className="space-y-6">
                        {(todaysExercises && todaysExercises.length > 0) ? (
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
                                                <div key={log.id} className={`p-4 rounded-xl shadow-sm border ${slotStyles[slot]} flex items-center gap-4`}>
                                                    <div className="h-12 w-12 bg-white/60 rounded-lg flex items-center justify-center text-2xl">
                                                        {emoji}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900">{log.exercise_name}</h4>
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

            <BottomNav />
        </div>
    );
}
