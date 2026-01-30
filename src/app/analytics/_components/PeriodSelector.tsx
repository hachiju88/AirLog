'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils";

type Period = 'day' | 'week' | 'month' | 'year';

const PERIODS: { value: Period; label: string }[] = [
    { value: 'week', label: '週' },
    { value: 'month', label: '月' },
    { value: 'year', label: '年' },
];

export function PeriodSelector({ currentPeriod }: { currentPeriod: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePeriodChange = (period: Period) => {
        const params = new URLSearchParams(searchParams);
        params.set('period', period);
        router.replace(`?${params.toString()}`);
    };

    return (
        <div className="flex bg-slate-100 p-1 rounded-lg">
            {PERIODS.map((p) => (
                <button
                    key={p.value}
                    onClick={() => handlePeriodChange(p.value)}
                    className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-all",
                        currentPeriod === p.value
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
