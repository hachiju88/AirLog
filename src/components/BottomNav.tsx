'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, BarChart2, Settings, Plus, Utensils, Activity, Scale, Flame, Cigarette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";

// ... imports

function BottomNavContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isSmoker, setIsSmoker] = useState(false);

    useEffect(() => {
        // ... existing useEffect
        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_smoker')
                    .eq('id', user.id)
                    .single();
                setIsSmoker(data?.is_smoker || false);
            }
        };
        fetchProfile();
    }, []);

    const isActive = (path: string) => pathname === path;
    const isSmokingTab = pathname === '/analytics' && searchParams.get('tab') === 'smoking';

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-2xl border-t backdrop-blur pb-safe z-50 transition-colors duration-300",
            isSmokingTab
                ? "border-slate-800 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95"
                : "border-white/50 bg-gradient-to-r from-indigo-100/95 via-purple-100/95 to-pink-100/95"
        )}>
            <div className="flex items-center justify-around h-16 w-full px-4">
                {/* Home */}
                <Link href="/dashboard" className="flex flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-10 w-10 rounded-full",
                            isActive('/dashboard')
                                ? "text-indigo-600 bg-indigo-50"
                                : (isSmokingTab ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                        )}
                    >
                        <Home className="h-6 w-6" />
                        <span className="sr-only">ホーム</span>
                    </Button>
                    <span className={cn(
                        "text-[10px] font-medium",
                        isActive('/dashboard')
                            ? "text-indigo-600"
                            : (isSmokingTab ? "text-slate-500" : "text-slate-400")
                    )}>
                        ホーム
                    </span>
                </Link>

                {/* FAB (Floating Action Button) - Central Input Trigger */}
                <div className="relative -top-5">
                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button
                                size="icon"
                                className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-4 border-background"
                            >
                                <Plus className="h-8 w-8" />
                                <span className="sr-only">記録</span>
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                            <div className="mx-auto w-full max-w-sm">
                                <DrawerHeader>
                                    <DrawerTitle>何を記録しますか？</DrawerTitle>
                                    <DrawerDescription>記録したい内容を選択してください。</DrawerDescription>
                                </DrawerHeader>
                                <div className="p-4 pb-8 space-y-4">
                                    <Button variant="outline" className="w-full justify-start h-16 text-lg font-medium hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200" asChild>
                                        <Link href="/log/weight">
                                            <div className="bg-indigo-100 p-2 rounded-full mr-4">
                                                <Activity className="h-6 w-6 text-indigo-600" />
                                            </div>
                                            体重を記録
                                        </Link>
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start h-16 text-lg font-medium hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" asChild>
                                        <Link href="/log/meal">
                                            <div className="bg-rose-100 p-2 rounded-full mr-4">
                                                <Utensils className="h-6 w-6 text-rose-600" />
                                            </div>
                                            食事を記録
                                        </Link>
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start h-16 text-lg font-medium hover:bg-cyan-50 hover:text-cyan-600 hover:border-cyan-200" asChild>
                                        <Link href="/log/exercise">
                                            <div className="bg-cyan-100 p-2 rounded-full mr-4">
                                                <Flame className="h-6 w-6 text-cyan-600" />
                                            </div>
                                            運動を記録
                                        </Link>
                                    </Button>
                                    {/* 喫煙者のみ表示 */}
                                    {isSmoker && (
                                        <Button variant="outline" className="w-full justify-start h-16 text-lg font-medium hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300" asChild>
                                            <Link href="/log/smoking">
                                                <div className="bg-slate-200 p-2 rounded-full mr-4">
                                                    <Cigarette className="h-6 w-6 text-slate-600" />
                                                </div>
                                                喫煙を記録
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </DrawerContent>
                    </Drawer>
                </div>

                {/* Analytics */}
                <Link href="/analytics" className="flex flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-10 w-10 rounded-full",
                            isActive('/analytics')
                                ? (isSmokingTab ? "text-indigo-400 bg-slate-800" : "text-indigo-600 bg-indigo-50")
                                : (isSmokingTab ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                        )}
                    >
                        <BarChart2 className="h-6 w-6" />
                        <span className="sr-only">レポート</span>
                    </Button>
                    <span className={cn(
                        "text-[10px] font-medium",
                        isActive('/analytics')
                            ? (isSmokingTab ? "text-indigo-400" : "text-indigo-600")
                            : (isSmokingTab ? "text-slate-500" : "text-slate-400")
                    )}>
                        レポート
                    </span>
                </Link>

                {/* Settings */}
                <Link href="/settings" className="flex flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-10 w-10 rounded-full",
                            isActive('/settings')
                                ? "text-indigo-600 bg-indigo-50" // Settings tab is separate page, won't be active with tab=smoking
                                : (isSmokingTab ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                        )}
                    >
                        <Settings className="h-6 w-6" />
                        <span className="sr-only">設定</span>
                    </Button>
                    <span className={cn(
                        "text-[10px] font-medium",
                        isActive('/settings')
                            ? "text-indigo-600"
                            : (isSmokingTab ? "text-slate-500" : "text-slate-400")
                    )}>
                        設定
                    </span>
                </Link>
            </div>
        </div>
    );
}

export function BottomNav() {
    return (
        <Suspense fallback={null}>
            <BottomNavContent />
        </Suspense>
    );
}

