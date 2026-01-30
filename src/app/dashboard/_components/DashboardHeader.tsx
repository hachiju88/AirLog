'use client';

import { useEffect, useState } from "react";
import { Sparkles, MessageCircleHeart } from "lucide-react";

type DashboardHeaderProps = {
    initialData: any;
    userProfile: {
        id: string;
        full_name: string | null;
        [key: string]: any;
    } | null;
    selectedDate: Date;
};

export function DashboardHeader({ initialData, userProfile, selectedDate }: DashboardHeaderProps) {
    const [greeting, setGreeting] = useState(`こんにちは、${userProfile?.full_name || 'ゲスト'}さん 👋`);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);


    // Calculate display date context
    const now = new Date();
    // In real app, consider hydration mismatch if server JST != client local.
    // For now we trust selectedDate passed from Server (which is JST 00:00).
    // Let's rely on server prop to determine "Are we looking at today?".
    const isToday = selectedDate.getDate() === new Date().getDate(); // approximate "Today" check for UI highlight

    useEffect(() => {
        const fetchFeedback = async () => {
            const getRandomFallback = () => {
                const fallbackMessages = [
                    "今日も1日頑張りましょう！健康は毎日の積み重ねです✨",
                    "新しい1日の始まりです。まずは朝の体重測定からいかがですか？",
                    "昨日はお疲れ様でした。今日はどんな食事にしますか？🥗",
                    "無理せず、自分のペースで続けていきましょう！"
                ];
                return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
            };

            // CACHE CHECK (Always check today's cache first)
            // We want to show Today's feedback even if viewing past dates if available.
            const CACHE_KEY = `airlog_ai_feedback_${userProfile?.id || 'guest'}_${new Date().toDateString()}`;

            const cachedData = sessionStorage.getItem(CACHE_KEY);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    if (parsed.greeting) setGreeting(parsed.greeting);
                    if (parsed.feedback) setFeedback(parsed.feedback);
                    return; // Use cache and skip API
                } catch (e) {
                    sessionStorage.removeItem(CACHE_KEY);
                }
            }

            // If not today and no cache, do NOT run API (wrong context).
            // Just show a generic greeting/fallback so the UI isn't empty.
            if (!isToday) {
                setFeedback(getRandomFallback());
                return;
            }

            // Check if there is data to analyze (at least one log)
            // Even if we are viewing past, initialData here is TODAY's data for AI context.
            const hasData = (initialData.weight?.weight_kg) ||
                (initialData.meals && initialData.meals.length > 0) ||
                (initialData.exercises && initialData.exercises.length > 0);

            if (!hasData) {
                setFeedback(getRandomFallback());
                return;
            }

            setLoading(true);
            try {
                const res = await fetch('/api/analysis/praise', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        logs: initialData,
                        profile: userProfile
                    })
                });

                if (res.ok) {
                    const data = await res.json();

                    // Update state
                    if (data.greeting) setGreeting(data.greeting);
                    if (data.feedback) setFeedback(data.feedback);
                    else setFeedback(getRandomFallback());

                    // SAVE TO CACHE
                    if (data.greeting || data.feedback) {
                        const cachePayload = {
                            greeting: data.greeting,
                            feedback: data.feedback,
                            timestamp: Date.now()
                        };
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
                    }

                } else {
                    // API Error status
                    console.warn("AI API returned error status");
                    setFeedback(getRandomFallback());
                }
            } catch (error) {
                console.error("Failed to fetch AI feedback", error);
                setFeedback(getRandomFallback());
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [initialData, userProfile, isToday]);

    return (
        <header className="px-6 pt-6 pb-4 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 shadow-sm sticky top-0 z-10">
            <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {greeting}
                    </h1>

                    <div className="mt-2 min-h-[40px]">
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400 animate-pulse">
                                <Sparkles className="h-4 w-4" />
                                <span>AIがデータを分析中...</span>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2 text-sm text-slate-600 animate-in fade-in slide-in-from-top-1 duration-500">
                                <MessageCircleHeart className="h-4 w-4 text-pink-500 mt-0.5 shrink-0" />
                                <p className="leading-snug">{feedback}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-10 w-10 ml-4 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm shrink-0">
                    <img
                        src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/open-peeps/svg?seed=${userProfile?.id || 'guest'}`}
                        alt="User"
                        className="h-full w-full object-cover"
                    />
                </div>
            </div>
        </header>
    );
}
