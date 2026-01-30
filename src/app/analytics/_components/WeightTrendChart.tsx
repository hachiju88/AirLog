'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
    ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WeightData = {
    date: string;
    weight: number;
    bmi?: number;
};

export function WeightTrendChart({ data, target, period }: { data: WeightData[], target?: number, period: string }) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-[300px] flex items-center justify-center text-slate-400">
                データがありません
            </Card>
        );
    }

    const showDots = period !== 'month' && period !== 'year';

    // Calculate Y-axis domain padding
    const weights = data.map(d => d.weight).filter(w => w !== null && w !== undefined);
    let minDomain = weights.length > 0 ? Math.min(...weights) : 0;
    let maxDomain = weights.length > 0 ? Math.max(...weights) : 100;

    // Include target in domain
    if (target) {
        minDomain = Math.min(minDomain, target);
        maxDomain = Math.max(maxDomain, target);
    }

    const minWeight = minDomain - 1;
    const maxWeight = maxDomain + 1;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500">体重推移</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#94A3B8' }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                                tickFormatter={(val) => {
                                    // YYYY/MM/DD -> MM/DD
                                    const parts = val.split('/');
                                    if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
                                    return val;
                                }}
                            />
                            <YAxis
                                domain={[minWeight, maxWeight]}
                                tick={{ fontSize: 10, fill: '#94A3B8' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#4F46E5', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}
                                labelFormatter={(label) => {
                                    // Full date in tooltip
                                    return label;
                                }}
                            />
                            <Line
                                type="monotone"
                                connectNulls
                                dataKey="weight"
                                stroke="#4F46E5"
                                strokeWidth={3}
                                dot={showDots ? { fill: '#4F46E5', r: 4, strokeWidth: 2, stroke: '#fff' } : false}
                                activeDot={{ r: 6 }}
                            />
                            {target && (
                                <ReferenceLine
                                    y={target}
                                    stroke="#94A3B8"
                                    strokeDasharray="3 3"
                                    label={{ value: '目標', position: 'insideTopRight', fill: '#94A3B8', fontSize: 10 }}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
