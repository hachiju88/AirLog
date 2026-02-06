'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomXAxisTick } from './CustomXAxisTick';

type SmokingData = {
    date: string;
    count: number;
};

/**
 * 喫煙本数トレンドチャート
 * ダークテーマ対応の棒グラフで喫煙本数を表示
 */
export function SmokingTrendChart({ data, target, period }: { data: SmokingData[], target: number, period: string }) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-[300px] flex items-center justify-center text-slate-400 bg-slate-800 border-slate-700">
                データがありません
            </Card>
        );
    }

    const totalCount = data.reduce((sum, d) => sum + d.count, 0);
    const values = data.map(d => d.count);
    const maxVal = Math.max(...values, 0);
    let maxDomain = Math.max(maxVal, target) * 1.2;
    maxDomain = Math.ceil(maxDomain / 5) * 5;

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-400">喫煙本数推移</CardTitle>
                <div className="text-right">
                    <div className="text-xl font-bold text-slate-200">
                        合計 {totalCount}<span className="text-xs font-normal text-slate-500 ml-1">本</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
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
                                tick={{ fontSize: 10, fill: '#64748B' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                                    backgroundColor: '#1e293b'
                                }}
                                itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}
                                formatter={(value) => [`${value}本`, '喫煙本数']}
                            />
                            <ReferenceLine
                                y={target}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                label={{
                                    value: `目標 ${target}本`,
                                    position: 'insideTopRight',
                                    fill: '#ef4444',
                                    fontSize: 10
                                }}
                            />
                            <Bar
                                dataKey="count"
                                radius={[4, 4, 0, 0]}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.count > target ? '#ef4444' : entry.count === 0 ? '#22c55e' : '#64748b'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-2">
                    <span>🟢 禁煙成功 | 🔴 目標超過</span>
                    <span>目標: {target}本以内/日</span>
                </div>
            </CardContent>
        </Card >
    );
}
