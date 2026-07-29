'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomXAxisTick } from './CustomXAxisTick';

type DistanceData = {
    date: string;
    distance: number;
};

/**
 * 移動距離推移チャート
 *
 * 日次の移動距離(km)を折れ線で表示。1日あたりの目安ノルマ（月ノルマ÷30）を
 * 目標ラインとして表示する。
 */
export function MovementDistanceChart({
    data,
    dailyNorm,
    period
}: {
    data: DistanceData[];
    dailyNorm: number;
    period: string;
}) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-[300px] flex items-center justify-center text-slate-400">
                データがありません
            </Card>
        );
    }

    const showDots = period !== 'month' && period !== 'year' && period !== '5years';

    const totalDistance = data.reduce((sum, d) => sum + d.distance, 0);
    const values = data.map(d => d.distance);
    const maxVal = Math.max(...values, 0);
    let maxDomain = Math.max(maxVal, dailyNorm) * 1.2;
    maxDomain = Math.ceil(maxDomain);

    return (
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-500">移動距離推移</CardTitle>
                <div className="text-right">
                    <div className="text-xl font-bold text-emerald-600">
                        Total {totalDistance.toFixed(2)} <span className="text-xs font-normal text-slate-400">km</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}
                                formatter={(value: any) => [`${value} km`, '距離']}
                            />
                            <ReferenceLine y={dailyNorm} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: '1日目安', position: 'insideTopRight', fill: '#94A3B8', fontSize: 10 }} />
                            <Line
                                type="monotone"
                                dataKey="distance"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={showDots ? { fill: '#10B981', r: 3 } : false}
                                activeDot={{ r: 5 }}
                            >
                                {showDots && (
                                    <LabelList
                                        dataKey="distance"
                                        position="top"
                                        offset={10}
                                        className="fill-emerald-600 text-[10px] font-bold"
                                        formatter={(value: any) => value > 0 ? value : ''}
                                    />
                                )}
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-right text-[10px] text-slate-400 mt-2 px-2">
                    1日の目安: {dailyNorm.toFixed(1)}km
                </div>
            </CardContent>
        </Card>
    );
}
