'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomXAxisTick } from './CustomXAxisTick';

type CalorieData = {
    date: string;
    calories: number;
};

export function MealCalorieChart({ data, target, period }: { data: CalorieData[], target: number, period: string }) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-[300px] flex items-center justify-center text-slate-400">
                データがありません
            </Card>
        );
    }

    const showDots = period !== 'month' && period !== 'year' && period !== '5years';

    // Domain Calculation
    const values = data.map(d => d.calories);
    const maxVal = Math.max(...values, 0);
    // Ensure max domain covers target and some padding, rounded to nearest 100
    let maxDomain = Math.max(maxVal, target) * 1.1;
    maxDomain = Math.ceil(maxDomain / 100) * 100;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500">摂取カロリー推移</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                tick={<CustomXAxisTick />}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={15}
                                interval="preserveStartEnd"
                                padding={{ left: 20, right: 20 }}
                            />
                            <YAxis
                                domain={[0, maxDomain]}
                                tick={{ fontSize: 10, fill: '#94A3B8' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#F43F5E', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}
                            />
                            <ReferenceLine y={target} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: '目標', position: 'insideTopRight', fill: '#94A3B8', fontSize: 10 }} />
                            <Line
                                type="monotone"
                                dataKey="calories"
                                stroke="#F43F5E"
                                strokeWidth={2}
                                dot={showDots ? { fill: '#F43F5E', r: 3 } : false}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-right text-[10px] text-slate-400 mt-2 px-2">
                    目標: {target}kcal
                </div>
            </CardContent>
        </Card >
    );
}
