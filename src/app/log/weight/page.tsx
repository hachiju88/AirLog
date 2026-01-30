"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Bluetooth, Loader2, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from "sonner";
import { useWeightScale } from '@/hooks/useWeightScale';
import { LogPageHeader } from "@/components/log";
import { format, differenceInYears } from 'date-fns';
import { ja } from 'date-fns/locale';


/**
 * 健康ログの型定義
 * 体重・体組成データを保持する
 */
type HealthLog = {
    /** レコードID */
    id: string;
    /** 体重 (kg) */
    weight_kg: number;
    /** 体脂肪率 (%) */
    body_fat_percentage?: number;
    /** 筋肉量 (kg) */
    muscle_mass_kg?: number;
    /** 内臓脂肪レベル */
    visceral_fat_rating?: number;
    /** 基礎代謝量 (kcal) */
    basal_metabolic_rate?: number;
    /** 体水分率 (%) */
    body_water_percentage?: number;
    /** 骨量 (kg) */
    bone_mass_kg?: number;
    /** タンパク質率 (%) */
    protein_percentage?: number;
    /** 体内年齢 (歳) */
    metabolic_age?: number;
    /** 除脂肪体重 (kg) */
    lean_body_mass_kg?: number;
    /** 記録日時 */
    recorded_at: string;
    /** データ取得元 */
    source: string;
};

/**
 * ユーザープロフィールの型定義
 * 体組成計算に必要な情報を保持
 */
type Profile = {
    /** 身長 (cm) */
    height_cm?: number;
    /** 生年月日 (YYYY-MM-DD) */
    birth_date?: string;
    /** 性別 */
    gender?: 'male' | 'female';
}

/**
 * 体重記録ページコンポーネント
 *
 * Bluetooth体重計連携または手入力で体重を記録。
 * プロフィールから身長・年齢・性別を取得し、
 * 体組成データ10項目を自動推定する。
 */
export default function WeightLogPage() {
    const router = useRouter();
    const supabase = createClient();
    const { connect, disconnect, weightData, isConnected, isScanning, logs, lastRawHex, lastRawValues } = useWeightScale();

    const [weight, setWeight] = useState("");

    // Metrics
    const [bodyFat, setBodyFat] = useState("");
    const [muscleMass, setMuscleMass] = useState("");
    const [visceralFat, setVisceralFat] = useState("");
    const [bmr, setBmr] = useState("");
    const [bodyWater, setBodyWater] = useState("");
    const [boneMass, setBoneMass] = useState("");
    const [protein, setProtein] = useState("");
    const [metabolicAge, setMetabolicAge] = useState("");
    const [leanBodyMass, setLeanBodyMass] = useState("");

    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [isSaving, setIsSaving] = useState(false);
    const [logsHistory, setLogsHistory] = useState<HealthLog[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);

    // Bluetooth Data Binding
    useEffect(() => {
        if (weightData) {
            setWeight(weightData.weight.toString());
            calculateMetrics(weightData.weight);
        }
    }, [weightData]);

    // Fetch History & Profile
    useEffect(() => {
        fetchData();
    }, []);

    /**
     * ログ履歴とプロフィールを取得する
     */
    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Profile for Calculations
        const { data: profile } = await supabase.from('profiles').select('height_cm, birth_date, gender').eq('id', user.id).single();
        if (profile) setProfile(profile);

        // Fetch Logs
        const { data: logs } = await supabase
            .from('health_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(30);

        if (logs) setLogsHistory(logs);
    };

    /**
     * 体重から体組成データを推定する
     *
     * 身長・年齢・性別を元に、以下の10項目を計算:
     * - 体脂肪率 (Deurenberg式)
     * - 基礎代謝量 (Mifflin-St Jeor式)
     * - 除脂肪体重 (LBM)
     * - 筋肉量
     * - 骨量
     * - 体水分率
     * - 内臓脂肪レベル
     * - タンパク質率
     * - 体内年齢
     *
     * @param w - 体重 (kg)
     */
    const calculateMetrics = (w: number) => {
        if (!profile || !profile.height_cm || !profile.birth_date || !profile.gender) return;

        const h = profile.height_cm / 100; // m
        const age = differenceInYears(new Date(), new Date(profile.birth_date));
        const isMale = profile.gender === 'male';

        // 1. BMI
        const bmi = w / (h * h);

        // 2. Body Fat % (Deurenberg)
        // BF = 1.20*BMI + 0.23*Age - 10.8*Sex - 5.4. Sex=1(M), 0(F)
        const bf = 1.20 * bmi + 0.23 * age - 10.8 * (isMale ? 1 : 0) - 5.4;

        // 3. Basal Metabolic Rate (Mifflin-St Jeor)
        let bmrCalc = 10 * w + 6.25 * profile.height_cm - 5 * age;
        bmrCalc += (isMale ? 5 : -161);

        // 4. Lean Body Mass (LBM)
        const lbm = w * (1 - bf / 100);

        // 5. Muscle Mass (Estimated from LBM)
        const muscle = lbm * 0.55; // Skeletal mass approx

        // 6. Bone Mass (Generalized estimation based on Weight)
        // <50kg: 1.95kg, 50-75kg: 2.40kg, >75kg: 2.95kg (Female)
        // <65kg: 2.65kg, 65-95kg: 3.29kg, >95kg: 3.69kg (Male)
        let bone = 2.5;
        if (isMale) {
            if (w < 65) bone = 2.65;
            else if (w < 95) bone = 3.29;
            else bone = 3.69;
        } else {
            if (w < 50) bone = 1.95;
            else if (w < 75) bone = 2.40;
            else bone = 2.95;
        }

        // 7. Body Water % (TBW)
        // Generally inversely proportional to fat. Muscle has high water.
        // Watson Formula is better but requires more inputs.
        // Simple approx: Male ~50-65%, Female ~45-60%
        // Using relationship: TBW_kg ~= 0.73 * LBM. TBW_% = (TBW_kg/W)*100
        const tbw_kg = 0.73 * lbm;
        const water = (tbw_kg / w) * 100;

        // 8. Visceral Fat (Arbitrary Scale 1-59)
        // Estimate from BMI and Age
        // Simple logic for app: Scale from 1 to 15 based on BMI tiers + Age impact
        let vFat = 1;
        if (bmi > 18.5) vFat = (bmi - 18.5) / 2;
        vFat += (age / 10); // Age increases visceral fat
        if (isMale) vFat *= 1.1; // Men have more
        vFat = Math.min(Math.max(1, Math.round(vFat)), 50);

        // 9. Protein %
        // ~15-20% of LBM
        const proteinKg = lbm * 0.20;
        const prot = (proteinKg / w) * 100;

        // 10. Metabolic Age
        // Compare BMR to average BMR for that age?
        // Simple: if BMR > Avg(Age), MetAge < Age.
        // Let's keep it close to Real Age +/- 10%
        // A fitter person (high muscle/BMR) has lower MetAge.
        // Avg BMR for Age ~ 10*65 + 6.25*170 - 5*Age... roughly.
        // Factor = BMR / (Standard BMR for Age 30)
        // Let's simplistic diff: (BMR_Ideal - BMR_Real) / 20 + Age. 
        // Better: MetAge = Age * (AvgBMR / RealBMR)
        // AvgBMR (Mass based) ~= 22 * LBM if simple
        const metaAge = age * ((isMale ? 1500 : 1200) / bmrCalc); // Very rough
        // Actually lets just output a slightly optimistic age if Muscle > Avg
        const ageDiff = (bmi > 22 && bf < 20) ? -5 : (bmi > 25 ? 5 : 0);
        const finalMetAge = Math.max(18, age + ageDiff);


        // Set Values
        setBodyFat(bf.toFixed(1));
        setBmr(Math.round(bmrCalc).toString());
        setMuscleMass(muscle.toFixed(1));
        setLeanBodyMass(lbm.toFixed(1));
        setVisceralFat(vFat.toString());
        setBodyWater(water.toFixed(1));
        setBoneMass(bone.toFixed(1));
        setProtein(prot.toFixed(1));
        setMetabolicAge(finalMetAge.toString());

        toast.info("全10項目の体組成データを推定しました");
    };

    /**
     * 体重・体組成データをデータベースに保存する
     */
    const handleSave = async () => {
        if (!weight) {
            toast.error("体重を入力してください");
            return;
        }

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const record = {
                user_id: user.id,
                weight_kg: parseFloat(weight),
                body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
                muscle_mass_kg: muscleMass ? parseFloat(muscleMass) : null,
                visceral_fat_rating: visceralFat ? parseFloat(visceralFat) : null,
                basal_metabolic_rate: bmr ? parseFloat(bmr) : null,
                body_water_percentage: bodyWater ? parseFloat(bodyWater) : null,
                bone_mass_kg: boneMass ? parseFloat(boneMass) : null,
                protein_percentage: protein ? parseFloat(protein) : null,
                metabolic_age: metabolicAge ? parseInt(metabolicAge) : null,
                lean_body_mass_kg: leanBodyMass ? parseFloat(leanBodyMass) : null,

                recorded_at: new Date(date).toISOString(),
                source: isConnected ? 'bluetooth' : 'manual',
                metric_source: bodyFat ? 'calculated' : 'manual'
            };

            const { error: insertError } = await supabase.from('health_logs').insert([record]);
            if (insertError) throw insertError;

            await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id);

            toast.success("記録しました");
            router.push('/dashboard?refresh=1');
        } catch (e: any) {
            console.error('Save Error Details:', JSON.stringify(e, null, 2));
            toast.error(`保存に失敗しました: ${e.message || e.error_description || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-safe">
            <LogPageHeader
                title="体重を記録"
                icon={Activity}
                bgColor="bg-indigo-50"
                borderColor="border-indigo-100"
                textColor="text-indigo-900"
            />

            <main className="p-4 space-y-6">
                <Card className="bg-white border-indigo-200 border-dashed shadow-sm overflow-hidden">
                    <div className="px-3 py-1 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold opacity-80 text-sm">
                            <Bluetooth className="h-4 w-4" />
                            <span>デバイス連携 (開発中)</span>
                        </div>
                        <Button
                            variant={isConnected ? "outline" : "secondary"} size="sm"
                            className={isConnected ? "bg-white text-green-600 border-green-200 h-7 text-xs px-2" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 h-7 text-xs px-2"}
                            onClick={isConnected ? disconnect : connect} disabled={isScanning}
                        >
                            {isScanning ? <Loader2 className="h-3 w-3 animate-spin" /> :
                                isConnected ? "接続中" : "接続"}
                        </Button>
                    </div>
                </Card>

                {/* Debug / Calibration Info */}
                {(lastRawHex || logs.length > 0) && (
                    <Card className="border-slate-200 bg-slate-50">
                        <CardHeader className="py-3">
                            <CardTitle className="text-xs font-mono text-slate-500">DEBUG INFO (Chocozap)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 pb-3">
                            {lastRawHex && (
                                <div>
                                    <Label className="text-[10px] text-slate-400">Latest Raw Hex</Label>
                                    <div className="font-mono text-xs break-all bg-white p-2 border rounded select-all">{lastRawHex}</div>
                                </div>
                            )}
                            {lastRawValues.length > 0 && (
                                <div>
                                    <Label className="text-[10px] text-slate-400">Raw Values (UInt16)</Label>
                                    <div className="font-mono text-[10px] break-all text-slate-500 select-all">[{lastRawValues.join(', ')}]</div>
                                </div>
                            )}
                            {logs.length > 0 && (
                                <details>
                                    <summary className="text-[10px] text-indigo-600 cursor-pointer">Bluetooth Logs ({logs.length})</summary>
                                    <div className="mt-1 h-20 overflow-y-auto bg-white border p-2 rounded text-[10px] font-mono whitespace-pre-wrap select-all">
                                        {logs.join('\n')}
                                    </div>
                                </details>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card className="bg-indigo-50 border-indigo-100/50 shadow-sm">
                    {/* <CardHeader className="bg-slate-50/50 pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base text-slate-700">記録入力</CardTitle>
                    </CardHeader> */}
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="weight" className="text-xs text-slate-500 mb-1 block">体重 (kg) <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Input
                                        id="weight" type="number" step="0.05"
                                        className="h-14 text-2xl font-bold pl-4 text-slate-800 bg-white"
                                        placeholder="0.0" value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        onBlur={() => weight && calculateMetrics(parseFloat(weight))}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">kg</span>
                                </div>
                            </div>

                            {/* Grid of Metrics */}
                            <div className="grid grid-cols-2 col-span-2 gap-3 bg-white/50 p-3 rounded-lg border border-indigo-100/50">
                                <div><Label className="text-[10px] text-slate-500">体脂肪率 (%)</Label><Input type="number" step="0.1" className="h-8 text-sm bg-white" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="-" /></div>
                                <div><Label className="text-[10px] text-slate-500">内臓脂肪Lv</Label><Input type="number" step="0.5" className="h-8 text-sm bg-white" value={visceralFat} onChange={e => setVisceralFat(e.target.value)} placeholder="-" /></div>

                                <div><Label className="text-[10px] text-slate-500">基礎代謝 (kcal)</Label><Input type="number" className="h-8 text-sm bg-white" value={bmr} onChange={e => setBmr(e.target.value)} placeholder="-" /></div>
                                <div><Label className="text-[10px] text-slate-500">体内年齢 (才)</Label><Input type="number" className="h-8 text-sm bg-white" value={metabolicAge} onChange={e => setMetabolicAge(e.target.value)} placeholder="-" /></div>

                                <div><Label className="text-[10px] text-slate-500">筋肉量 (kg)</Label><Input type="number" step="0.1" className="h-8 text-sm bg-white" value={muscleMass} onChange={e => setMuscleMass(e.target.value)} placeholder="-" /></div>
                                <div><Label className="text-[10px] text-slate-500">推定骨量 (kg)</Label><Input type="number" step="0.1" className="h-8 text-sm bg-white" value={boneMass} onChange={e => setBoneMass(e.target.value)} placeholder="-" /></div>

                                <div><Label className="text-[10px] text-slate-500">体水分率 (%)</Label><Input type="number" step="0.1" className="h-8 text-sm bg-white" value={bodyWater} onChange={e => setBodyWater(e.target.value)} placeholder="-" /></div>
                                <div><Label className="text-[10px] text-slate-500">タンパク質 (%)</Label><Input type="number" step="0.1" className="h-8 text-sm bg-white" value={protein} onChange={e => setProtein(e.target.value)} placeholder="-" /></div>

                                <div className="col-span-2"><Label className="text-[10px] text-slate-500">除脂肪体重 (kg)</Label><Input type="number" step="0.1" className="h-8 text-sm bg-white" value={leanBodyMass} onChange={e => setLeanBodyMass(e.target.value)} placeholder="-" /></div>
                            </div>

                            {!profile?.birth_date && (
                                <div className="col-span-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                    ※ 設定画面で身長・年齢・性別を登録すると、これら全ての項目を自動計算できます。
                                </div>
                            )}

                            <div className="col-span-2">
                                <Label htmlFor="date" className="text-xs text-slate-500 mb-1 block">測定日時</Label>
                                <Input
                                    id="date" type="datetime-local" className="h-12 bg-white"
                                    value={date} onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <Button className="w-full h-12 bg-indigo-600 shadow-sm hover:bg-indigo-700 text-base" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                    記録する
                </Button>
            </main>
        </div>
    );
}
