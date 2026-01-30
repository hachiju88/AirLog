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

type CalorieData = {
    date: string;
    calories: number;
};

export function MealCalorieChart({ data, target }: { data: CalorieData[], target: number }) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-[300px] flex items-center justify-center text-slate-400">
                データがありません
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500">摂取カロリー推移</CardTitle>
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
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#94A3B8' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#F43F5E', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}
                            />
                            <ReferenceLine y={target} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '目標', position: 'insideTopRight', fill: '#EF4444', fontSize: 10 }} />
                            <Line
                                type="monotone"
                                dataKey="calories"
                                stroke="#F43F5E"
                                strokeWidth={2}
                                dot={{ fill: '#F43F5E', r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-right text-[10px] text-slate-400 mt-2 px-2">
                    目標: {target}kcal
                </div>
            </CardContent>
        </Card>
    );
}
