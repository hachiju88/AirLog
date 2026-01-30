'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    // Form States
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('male');
    const [birthDate, setBirthDate] = useState('2000-01-01');
    const [height, setHeight] = useState(160);
    const [currentWeight, setCurrentWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState<number>(55);
    const [activityLevel, setActivityLevel] = useState('2');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        const updates = {
            id: user.id,
            full_name: fullName,
            gender,
            birth_date: birthDate,
            height_cm: height,
            target_weight_kg: targetWeight,
            activity_level: parseInt(activityLevel),
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('profiles').upsert(updates);

        if (error) {
            alert('Error updating profile: ' + error.message);
            setLoading(false);
            return;
        }

        // Save initial weight log if provided
        if (currentWeight) {
            const { error: logError } = await supabase.from('health_logs').insert({
                user_id: user.id,
                weight_kg: parseFloat(currentWeight),
                recorded_at: new Date().toISOString(),
                metric_source: 'manual'
            });

            if (logError) {
                console.error('Error saving initial weight:', logError);
                // Continue anyway as profile is saved
            }
        }

        router.push('/dashboard');
        // setLoading(false); // No need to set false as we redirect
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-white/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl">プロフィール設定</CardTitle>
                    <CardDescription>
                        精度の高いアドバイスのために、あなたのことを教えてください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">お名前 (ニックネーム可)</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Taro"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="bg-white"
                            />
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <Label>性別</Label>
                            <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="male" id="male" />
                                    <Label htmlFor="male">男性</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="female" id="female" />
                                    <Label htmlFor="female">女性</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="other" id="other" />
                                    <Label htmlFor="other">その他</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Birth Date */}
                        <div className="space-y-2">
                            <Label htmlFor="birthDate">生年月日</Label>
                            <Input
                                id="birthDate"
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                required
                                className="bg-white"
                            />
                        </div>

                        {/* Height */}
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label>身長 (cm)</Label>
                                <span className="text-sm font-bold text-indigo-600">{height} cm</span>
                            </div>
                            <Slider
                                value={[height]}
                                onValueChange={(vals) => setHeight(vals[0])}
                                min={120}
                                max={220}
                                step={1}
                            />
                        </div>

                        {/* Current Weight */}
                        <div className="space-y-2">
                            <Label htmlFor="currentWeight">現在の体重 (kg)</Label>
                            <Input
                                id="currentWeight"
                                type="number"
                                step="0.1"
                                placeholder="60.0"
                                value={currentWeight}
                                onChange={(e) => setCurrentWeight(e.target.value)}
                                className="bg-white"
                                required
                            />
                        </div>

                        {/* Target Weight */}
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label>目標体重 (kg)</Label>
                                <span className="text-sm font-bold text-indigo-600">{targetWeight} kg</span>
                            </div>
                            <Slider
                                value={[typeof targetWeight === 'string' ? parseFloat(targetWeight) : targetWeight]}
                                onValueChange={(vals) => setTargetWeight(vals[0])}
                                min={30}
                                max={150}
                                step={1}
                            />
                        </div>

                        {/* Activity Level */}
                        <div className="space-y-2">
                            <Label>普段の運動レベル</Label>
                            <Select value={activityLevel} onValueChange={setActivityLevel}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">レベル1: ほぼ運動しない（デスクワーク中心）</SelectItem>
                                    <SelectItem value="2">レベル2: 軽い運動・移動をする</SelectItem>
                                    <SelectItem value="3">レベル3: 定期的に運動する</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="submit" className="w-full mt-4" disabled={loading}>
                            {loading ? '保存中...' : 'はじめる'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
