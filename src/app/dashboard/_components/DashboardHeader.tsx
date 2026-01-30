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
};

export function DashboardHeader({ initialData, userProfile }: DashboardHeaderProps) {
    const [greeting, setGreeting] = useState(`こんにちは、${userProfile?.full_name || 'ゲスト'}さん 👋`);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAI, setIsAI] = useState(false);

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

            // Check if there is data to analyze (at least one log)
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
                    if (data.greeting) {
                        setGreeting(data.greeting);
                        setIsAI(true);
                    }
                    if (data.feedback) {
                        setFeedback(data.feedback);
                    } else {
                        // AI returned valid JSON but no feedback? fallback
                        setFeedback(getRandomFallback());
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
    }, [initialData, userProfile]);

    return (
        <header className="px-6 py-6 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 shadow-sm sticky top-0 z-10">
            <div className="flex justify-between items-start">
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
