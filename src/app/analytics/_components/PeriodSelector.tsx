'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils";

type Period = 'day' | 'week' | 'month' | 'year' | '5years';

const PERIODS: { value: Period; label: string }[] = [
    { value: 'week', label: '週' },
    { value: 'month', label: '月' },
    { value: 'year', label: '年' },
    { value: '5years', label: '5年' },
];

export function PeriodSelector({ currentPeriod }: { currentPeriod: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePeriodChange = (period: Period) => {
        const params = new URLSearchParams(searchParams);
        params.set('period', period);
        router.replace(`?${params.toString()}`);
    };

    const currentTab = searchParams.get('tab');
    const isSmokingTab = currentTab === 'smoking';

    return (
        <div className={cn(
            "flex p-1 rounded-lg transition-colors duration-300",
            isSmokingTab ? "bg-slate-800" : "bg-slate-100"
        )}>
            {PERIODS.map((p) => (
                <button
                    key={p.value}
                    onClick={() => handlePeriodChange(p.value)}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-all",
                        currentPeriod === p.value
                            ? (isSmokingTab ? "bg-slate-700 text-slate-100 shadow-sm" : "bg-white text-slate-900 shadow-sm")
                            : (isSmokingTab ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700")
                    )}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
