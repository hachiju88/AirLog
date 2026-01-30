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

export function WeightTrendChart({ data, target }: { data: WeightData[], target?: number }) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-[300px] flex items-center justify-center text-slate-400">
                データがありません
            </Card>
        );
    }

    // Calculate Y-axis domain padding
    const weights = data.map(d => d.weight);
    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;

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
                            />
                            <Line
                                type="monotone"
                                dataKey="weight"
                                stroke="#4F46E5"
                                strokeWidth={3}
                                dot={{ fill: '#4F46E5', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                            />
                            {target && (
                                <ReferenceLine
                                    y={target}
                                    stroke="#EF4444"
                                    strokeDasharray="3 3"
                                    label={{ value: '目標', position: 'right', fill: '#EF4444', fontSize: 10 }}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
