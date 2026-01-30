'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { LogOut } from 'lucide-react';
import { toast } from "sonner";
import { ProfileAvatarUpload } from "./_components/ProfileAvatarUpload";

/**
 * 設定ページコンポーネント
 *
 * ユーザープロフィールの編集・目標設定の変更・
 * My Menu管理・ログアウトなどの機能を提供。
 */
export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Local state for inputs
    const [intake, setIntake] = useState('');
    const [burned, setBurned] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(data);
                if (data) {
                    setIntake(data.target_calories_intake?.toString() || '2200');
                    setBurned(data.target_calories_burned?.toString() || '300');
                    setWeight(data.target_weight_kg?.toString() || '');
                    setHeight(data.height_cm?.toString() || '');
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    /**
     * プロフィールの特定フィールドを更新する
     *
     * @param key - 更新するフィールド名
     * @param value - 新しい値
     */
    const updateProfile = async (key: string, value: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({ [key]: value })
            .eq('id', user.id);

        if (error) {
            toast.error('更新に失敗しました');
        } else {
            toast.success('設定を保存しました');
            router.refresh();
        }
    };

    /**
     * ログアウトを実行しログインページへ移動
     */
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <header className="px-6 py-4 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 shadow-sm sticky top-0 z-10">
                <h1 className="text-xl font-bold text-slate-800">設定</h1>
            </header>

            <main className="px-4 py-6 space-y-6">
                <Card className="bg-blue-50 border-blue-100 shadow-sm">
                    <CardHeader>
                        <CardTitle>アカウント</CardTitle>
                        <CardDescription>ログイン中のアカウント情報</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Profile Image & Basic Info */}
                        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b">
                            <ProfileAvatarUpload
                                userId={profile?.id}
                                currentAvatarUrl={profile?.avatar_url}
                                onUploadComplete={(url) => {
                                    setProfile({ ...profile, avatar_url: url });
                                    router.refresh();
                                }}
                            />
                            <div className="flex-1 space-y-4 w-full">
                                <h3 className="text-sm font-medium text-slate-700">基本情報</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">身長 (cm)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="170.0"
                                                value={height}
                                                onChange={(e) => setHeight(e.target.value)}
                                            />
                                            <Button
                                                size="sm"
                                                className="h-10 px-4 bg-slate-800 hover:bg-slate-700"
                                                onClick={() => updateProfile('height_cm', parseFloat(height) || 0)}
                                            >
                                                保存
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">生年月日</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={profile?.birth_date || ''}
                                                onChange={(e) => updateProfile('birth_date', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">性別</label>
                                        <div className="flex gap-2">
                                            <select
                                                className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={profile?.gender || ''}
                                                onChange={(e) => updateProfile('gender', e.target.value)}
                                            >
                                                <option value="">未設定</option>
                                                <option value="male">男性</option>
                                                <option value="female">女性</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Goal Settings Form */}
                        <div className="space-y-4 border-t pt-6">
                            <h3 className="text-sm font-medium text-slate-700">目標設定</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">目標摂取カロリー (kcal/日)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="2200"
                                            value={intake}
                                            onChange={(e) => setIntake(e.target.value)}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-10 px-4 bg-slate-800 hover:bg-slate-700"
                                            onClick={() => updateProfile('target_calories_intake', parseInt(intake) || 0)}
                                        >
                                            保存
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500">1日の摂取カロリーの目安です。</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">目標消費カロリー (kcal/日)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="300"
                                            value={burned}
                                            onChange={(e) => setBurned(e.target.value)}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-10 px-4 bg-slate-800 hover:bg-slate-700"
                                            onClick={() => updateProfile('target_calories_burned', parseInt(burned) || 0)}
                                        >
                                            保存
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500">運動で消費するカロリーの目標です。</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600">目標体重 (kg)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="60.0"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-10 px-4 bg-slate-800 hover:bg-slate-700"
                                            onClick={() => updateProfile('target_weight_kg', parseFloat(weight) || 0)}
                                        >
                                            保存
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-sm font-medium text-slate-700 mb-4">アカウント操作</h3>
                            <Button
                                variant="destructive"
                                className="w-full flex items-center justify-center gap-2"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4" />
                                ログアウト
                            </Button>
                        </div>


                    </CardContent>
                </Card>
            </main>

            <BottomNav />
        </div>
    );
}
