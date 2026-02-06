import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./_components/DashboardClient";

/**
 * ダッシュボードページ (Server Component)
 *
 * 食事・運動・体重・喫煙の日別サマリーを表示。
 * 3日分のデータを先読みし、クライアント側で即座に切り替え可能。
 */
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

    /**
     * 現在のJST日付をYYYY-MM-DD形式で取得する
     */
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

    /**
     * 指定日の範囲を計算
     */
    const getDateRange = (dateStr: string) => {
        const start = new Date(`${dateStr}T00:00:00+09:00`);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return { start, end, dateStr };
    };

    /**
     * 指定オフセット分の日付文字列を取得（JSTベース）
     */
    const getDateStrWithOffset = (offset: number) => {
        // JST基準の今日の00:00を計算
        const today = new Date(`${todayStr}T00:00:00+09:00`);
        // オフセット分の日を引く
        const targetDate = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
        // JSTでフォーマット
        const formatter = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(targetDate);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        return `${y}-${m}-${d}`;
    };

    // 3日分の日付範囲を生成 [今日, 昨日, 一昨日]
    const dateRanges = [0, 1, 2].map(offset => getDateRange(getDateStrWithOffset(offset)));

    // 3日分のデータを並行フェッチ
    const daysDataPromises = dateRanges.map(async ({ start, end, dateStr }) => {
        // Fetch Meal Logs
        let { data: meals } = await supabase
            .from('meal_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('recorded_at', start.toISOString())
            .lt('recorded_at', end.toISOString())
            .order('recorded_at', { ascending: true });

        // Filter pending meals
        if (meals) {
            meals = meals.filter(log => {
                const raw = log.ai_analysis_raw as any;
                return raw?.status !== 'pending';
            });
        }

        // Fetch Exercise Logs
        let { data: exercises } = await supabase
            .from('exercise_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('recorded_at', start.toISOString())
            .lt('recorded_at', end.toISOString())
            .order('recorded_at', { ascending: true });

        if (exercises) {
            exercises = exercises.filter(log => {
                const raw = log.ai_analysis_raw as any;
                return raw?.status !== 'pending';
            });
        }

        // Fetch Smoking Logs (喫煙者のみ)
        let smokingLogs: any[] = [];
        if (profile?.is_smoker) {
            const { data: smoking } = await supabase
                .from('smoking_logs')
                .select('*')
                .eq('user_id', user.id)
                .gte('recorded_at', start.toISOString())
                .lt('recorded_at', end.toISOString())
                .order('recorded_at', { ascending: true });

            if (smoking) {
                smokingLogs = smoking.filter(log => {
                    const raw = log.ai_analysis_raw as any;
                    return raw?.status !== 'pending';
                });
            }
        }

        return {
            dateStr,
            meals: meals || [],
            exercises: exercises || [],
            smokingLogs,
        };
    });

    const daysData = await Promise.all(daysDataPromises);

    // Fetch Latest Weight (Always latest known)
    const { data: latestWeightLog } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

    // Fetch Last Smoking Log (for streak calculation)
    // Fetch Last Smoking Logs (for accurate streak calculation including past days)
    // 過去3件取得（今日・昨日・一昨日の表示に必要な直近の履歴を取得するため）
    let lastSmokeDates: string[] = [];
    if (profile?.is_smoker) {
        const { data: lastSmokes } = await supabase
            .from('smoking_logs')
            .select('recorded_at')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(3);

        if (lastSmokes) {
            lastSmokeDates = lastSmokes.map(log => log.recorded_at);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <DashboardClient
                daysData={daysData}
                latestWeightLog={latestWeightLog}
                profile={profile}
                todayStr={todayStr}
                lastSmokeDates={lastSmokeDates}
            />
            <BottomNav />
        </div>
    );
}

