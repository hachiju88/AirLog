'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { LogOut, Loader2, Cigarette } from 'lucide-react';
import { toast } from "sonner";
import { ProfileAvatarUpload } from "./_components/ProfileAvatarUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

    // Smoking settings state
    const [isSmoker, setIsSmoker] = useState(false);
    const [cigaretteBrand, setCigaretteBrand] = useState('');
    const [targetCigarettes, setTargetCigarettes] = useState('');
    const [brandInfo, setBrandInfo] = useState<{
        brand_name?: string;
        cigarettes_per_pack?: number;
        price_per_pack?: number;
    } | null>(null);
    const [isFetchingBrand, setIsFetchingBrand] = useState(false);

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
                    // Smoking settings
                    setIsSmoker(data.is_smoker || false);
                    setCigaretteBrand(data.cigarette_brand || '');
                    setTargetCigarettes(data.target_cigarettes_per_day?.toString() || '');
                    if (data.cigarette_brand && data.cigarettes_per_pack && data.price_per_pack) {
                        setBrandInfo({
                            brand_name: data.cigarette_brand,
                            cigarettes_per_pack: data.cigarettes_per_pack,
                            price_per_pack: data.price_per_pack
                        });
                    }
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
     * 複数フィールドを一括更新する
     */
    const updateMultipleFields = async (fields: Record<string, any>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update(fields)
            .eq('id', user.id);

        if (error) {
            toast.error('更新に失敗しました');
            return false;
        } else {
            toast.success('設定を保存しました');
            router.refresh();
            return true;
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

    /**
     * 喫煙者チェックボックスの変更処理
     */
    const handleSmokerChange = async (checked: boolean) => {
        setIsSmoker(checked);
        await updateProfile('is_smoker', checked);
    };

    /**
     * AIで銘柄情報を取得して保存
     */
    const fetchAndSaveBrandInfo = async () => {
        if (!cigaretteBrand.trim()) {
            toast.error('銘柄名を入力してください');
            return;
        }

        setIsFetchingBrand(true);
        try {
            const response = await fetch('/api/estimate/cigarette', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand: cigaretteBrand }),
            });

            if (!response.ok) {
                throw new Error('銘柄情報の取得に失敗しました');
            }

            const data = await response.json();
            setBrandInfo(data);

            // プロフィールに保存
            const success = await updateMultipleFields({
                cigarette_brand: data.brand_name,
                cigarettes_per_pack: data.cigarettes_per_pack,
                price_per_pack: data.price_per_pack
            });

            if (success) {
                setCigaretteBrand(data.brand_name);
            }
        } catch (error) {
            console.error('Brand fetch error:', error);
            toast.error('銘柄情報の取得に失敗しました');
        } finally {
            setIsFetchingBrand(false);
        }
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

                        {/* Smoking Settings Section */}
                        <div className="space-y-4 border-t pt-6">
                            <div className="flex items-center gap-3">
                                <Cigarette className="h-5 w-5 text-slate-500" />
                                <h3 className="text-sm font-medium text-slate-700">喫煙設定</h3>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="is-smoker"
                                    checked={isSmoker}
                                    onCheckedChange={handleSmokerChange}
                                />
                                <Label htmlFor="is-smoker" className="text-sm text-slate-600 cursor-pointer">
                                    喫煙者モード
                                </Label>
                            </div>

                            {isSmoker && (
                                <div className="space-y-4 pl-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* 銘柄登録 */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">メインで吸っている銘柄</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                placeholder="例: メビウス、セブンスター"
                                                value={cigaretteBrand}
                                                onChange={(e) => setCigaretteBrand(e.target.value)}
                                            />
                                            <Button
                                                size="sm"
                                                className="h-10 px-4 bg-slate-700 hover:bg-slate-600"
                                                onClick={fetchAndSaveBrandInfo}
                                                disabled={isFetchingBrand}
                                            >
                                                {isFetchingBrand ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    '保存'
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-500">AIが銘柄の正式名称と価格を自動取得します。</p>
                                    </div>

                                    {/* 銘柄情報表示 */}
                                    {brandInfo && (
                                        <div className="bg-slate-100 rounded-lg p-4 space-y-2 animate-in fade-in duration-300">
                                            <div className="flex items-center gap-2">
                                                <Cigarette className="h-4 w-4 text-slate-500" />
                                                <span className="font-medium text-slate-800">{brandInfo.brand_name}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="text-slate-600">
                                                    <span className="text-slate-400">本数/箱: </span>
                                                    {brandInfo.cigarettes_per_pack}本
                                                </div>
                                                <div className="text-slate-600">
                                                    <span className="text-slate-400">価格/箱: </span>
                                                    ¥{brandInfo.price_per_pack?.toLocaleString()}
                                                </div>
                                                <div className="text-slate-600 col-span-2 mt-1 pt-1 border-t border-slate-200">
                                                    <span className="text-slate-400">1本あたり: </span>
                                                    ¥{brandInfo.price_per_pack && brandInfo.cigarettes_per_pack
                                                        ? (brandInfo.price_per_pack / brandInfo.cigarettes_per_pack).toFixed(1)
                                                        : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 目標本数 */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">1日の目標本数</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                className="flex-1 h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                placeholder="10"
                                                value={targetCigarettes}
                                                onChange={(e) => setTargetCigarettes(e.target.value)}
                                            />
                                            <Button
                                                size="sm"
                                                className="h-10 px-4 bg-slate-700 hover:bg-slate-600"
                                                onClick={() => updateProfile('target_cigarettes_per_day', parseInt(targetCigarettes) || 0)}
                                            >
                                                保存
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-500">禁煙目標に向けて少しずつ減らしましょう。</p>
                                    </div>
                                </div>
                            )}
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

