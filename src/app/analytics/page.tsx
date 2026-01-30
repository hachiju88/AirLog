import { Suspense } from 'react';
import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';
import { BottomNav } from "@/components/BottomNav";
import { PeriodSelector } from "./_components/PeriodSelector";
import { AnalyticsTabs } from "./_components/AnalyticsTabs";

export default async function AnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ period?: string; tab?: string }>
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const params = await searchParams;
    const period = params.period || 'week'; // day, week, month, year
    const activeTab = params.tab || 'weight'; // weight, meal, exercise

    // --- Date Calculations (JST) ---
    // Start "Today" based on JST
    const getJSTDate = () => {
        const d = new Date();
        const jstStr = d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });
        const jstDate = new Date(jstStr);
        jstDate.setHours(0, 0, 0, 0); // Normalize to midnight
        return jstDate;
    };

    const todayJST = getJSTDate();
    let startDate = new Date(todayJST);

    // Adjust start date based on period
    if (period === 'month') {
        startDate.setDate(todayJST.getDate() - 29); // Last 30 days
    } else if (period === 'year') {
        startDate.setFullYear(todayJST.getFullYear() - 1); // Last 1 year
    } else {
        // Default 'week'
        startDate.setDate(todayJST.getDate() - 6); // Last 7 days
    }

    const endDate = new Date(todayJST);
    endDate.setHours(23, 59, 59, 999);

    // --- Data Fetching ---

    // 1. Profile (Targets)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const targetIntake = profile?.target_calories_intake || 2200;
    const targetBurned = profile?.target_calories_burned || 300;
    const targetWeight = profile?.target_weight_kg; // Might be undefined

    // 2. Health Logs (Weight)
    const { data: healthLogs } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

    // 3. Meal Logs
    const { data: mealLogs } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

    // 4. Exercise Logs
    const { data: exerciseLogs } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });

    // --- Aggregation Logic ---

    // Helper to get date string key (YYYY/MM/DD) in JST
    const getDateKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Tokyo'
        });
    };

    // Helper to generate date range array
    const generateDateRange = () => {
        const dates = [];
        let current = new Date(startDate);
        // Safety break
        let safety = 0;

        while (current <= endDate && safety < 400) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
            safety++;
        }
        return dates;
    };

    const dateRange = generateDateRange();

    // --- Weight Data Prep ---
    // Calculate Averages for Body Composition
    const bodyCompSum = {
        weight: 0, fat: 0, muscle: 0, visceral: 0, bmr: 0,
        age: 0, lean: 0, water: 0, bone: 0, protein: 0
    };
    let bodyCompCount = 0;

    // Trend Data : Group by day, take latest entry for that day
    const weightTrendMap = new Map();
    healthLogs?.forEach(log => {
        const key = getDateKey(log.recorded_at);
        weightTrendMap.set(key, log.weight_kg);

        // Sum for average
        bodyCompSum.weight += log.weight_kg || 0;
        bodyCompSum.fat += log.body_fat_percentage || 0;
        bodyCompSum.muscle += log.muscle_mass_kg || 0;
        bodyCompSum.visceral += log.visceral_fat_rating || 0;
        bodyCompSum.bmr += log.basal_metabolic_rate || 0;
        bodyCompSum.age += log.metabolic_age || 0;
        bodyCompSum.lean += log.lean_body_mass_kg || 0;
        bodyCompSum.water += log.body_water_percentage || 0;
        bodyCompSum.bone += log.bone_mass_kg || 0;
        bodyCompSum.protein += log.protein_percentage || 0;
        bodyCompCount++;
    });

    const bodyCompAvg = bodyCompCount > 0 ? {
        weight_kg: bodyCompSum.weight / bodyCompCount,
        body_fat_percentage: bodyCompSum.fat / bodyCompCount,
        muscle_mass_kg: bodyCompSum.muscle / bodyCompCount,
        visceral_fat_rating: bodyCompSum.visceral / bodyCompCount,
        basal_metabolic_rate: bodyCompSum.bmr / bodyCompCount,
        metabolic_age: bodyCompSum.age / bodyCompCount,
        lean_body_mass_kg: bodyCompSum.lean / bodyCompCount,
        body_water_percentage: bodyCompSum.water / bodyCompCount,
        bone_mass_kg: bodyCompSum.bone / bodyCompCount,
        protein_percentage: bodyCompSum.protein / bodyCompCount,
    } : null;

    const weightTrend = dateRange.map(d => {
        const key = getDateKey(d.toISOString());
        return {
            date: key,
            weight: weightTrendMap.get(key) || null
        };
    }).filter(d => period === 'year' ? d.weight !== null : true); // Filter gaps only for large periods? Or keep gaps for line chart?
    // User requested "Line Chart". Gaps in line chart are handled by connectNulls or showing gaps. 
    // Usually showing gaps is better for honest data, but for weight trend lines usually connect.
    // Let's filter nulls for now to clean up, unless we use connectNulls.

    // --- Meal Data Prep ---
    const mealCalorieMap = new Map();
    const nutrientSum = { p: 0, f: 0, c: 0, fiber: 0, salt: 0 };
    let daysWithMeals = new Set(); // To count actual days with logs

    mealLogs?.forEach(log => {
        // Skip pending
        const raw = log.ai_analysis_raw as any;
        if (raw?.status === 'pending') return;

        const key = getDateKey(log.recorded_at);
        const currentCal = mealCalorieMap.get(key) || 0;
        mealCalorieMap.set(key, currentCal + (log.calories || 0));
        daysWithMeals.add(key);

        nutrientSum.p += log.protein_g || 0;
        nutrientSum.f += log.fat_g || 0;
        nutrientSum.c += log.carbohydrates_g || 0;
        nutrientSum.fiber += log.fiber_g || 0;
        nutrientSum.salt += log.salt_g || 0;
    });

    const mealCalories = dateRange.map(d => {
        const key = getDateKey(d.toISOString());
        return {
            date: key,
            calories: mealCalorieMap.get(key) || 0
        };
    });

    // Averages (over logs or days?)
    // Using daysWithMeals.size avoids diluting average with empty days if user forgot to log.
    // But if period is 'day', divider is 1.
    const divider = daysWithMeals.size || 1;

    const nutrientAvg = {
        protein: nutrientSum.p / divider,
        fat: nutrientSum.f / divider,
        carbs: nutrientSum.c / divider,
        fiber: nutrientSum.fiber / divider,
        salt: nutrientSum.salt / divider,
    };

    // --- Exercise Data Prep ---
    const exerciseCalorieMap = new Map();
    let totalBurnedFromLogs = 0;
    let daysWithExercise = new Set();

    exerciseLogs?.forEach(log => {
        const key = getDateKey(log.recorded_at);
        const currentCal = exerciseCalorieMap.get(key) || 0;
        exerciseCalorieMap.set(key, currentCal + (log.calories_burned || 0));
        totalBurnedFromLogs += (log.calories_burned || 0);
        daysWithExercise.add(key);
    });

    const exerciseCalories = dateRange.map(d => {
        const key = getDateKey(d.toISOString());
        return {
            date: key,
            calories: exerciseCalorieMap.get(key) || 0
        };
    });

    // Average Daily Burn (over days with exercise? or over period?)
    // Usually "Average per day" over the period is good for stats.
    // "Total / days in period"
    const periodDays = dateRange.length || 1;
    const averageBurned = totalBurnedFromLogs / periodDays;

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <header className="px-6 py-4 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 shadow-sm sticky top-0 z-10 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800">レポート</h1>
                <Suspense fallback={<div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />}>
                    <PeriodSelector currentPeriod={period} />
                </Suspense>
            </header>

            <main className="px-4 py-6 space-y-6">
                <Suspense fallback={<div className="h-96 w-full bg-slate-100 rounded-xl animate-pulse" />}>
                    <AnalyticsTabs
                        currentTab={activeTab}
                        period={period}
                        weightData={{
                            trend: weightTrend,
                            average: bodyCompAvg, // Passing average instead of latest
                            target: targetWeight
                        }}
                        mealData={{
                            calories: mealCalories,
                            nutrients: nutrientAvg,
                            target: targetIntake
                        }}
                        exerciseData={{
                            calories: exerciseCalories,
                            target: targetBurned,
                            total: totalBurnedFromLogs,
                            average: averageBurned,
                            logs: exerciseLogs || []
                        }}

                    />
                </Suspense>
            </main>

            <BottomNav />
        </div>
    );
}
