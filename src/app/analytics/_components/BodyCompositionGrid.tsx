import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BodyCompositionData = {
    weight_kg: number;
    body_fat_percentage?: number;
    muscle_mass_kg?: number;
    visceral_fat_rating?: number;
    basal_metabolic_rate?: number;
    metabolic_age?: number;
    lean_body_mass_kg?: number;
    body_water_percentage?: number;
    bone_mass_kg?: number;
    protein_percentage?: number;
};

export function BodyCompositionGrid({ data, periodLabel }: { data: BodyCompositionData | null, periodLabel: string }) {
    if (!data) return null;

    const items = [
        { label: "体重", value: `${data.weight_kg.toFixed(2)}kg` },
        { label: "体脂肪率", value: data.body_fat_percentage ? `${data.body_fat_percentage.toFixed(2)}%` : '-' },
        { label: "筋肉量", value: data.muscle_mass_kg ? `${data.muscle_mass_kg.toFixed(2)}kg` : '-' },
        { label: "内臓脂肪Lv", value: data.visceral_fat_rating ? `${data.visceral_fat_rating.toFixed(2)}` : '-' },
        { label: "基礎代謝", value: data.basal_metabolic_rate ? `${Math.round(data.basal_metabolic_rate)}kcal` : '-' },
        { label: "体内年齢", value: data.metabolic_age ? `${Math.round(data.metabolic_age)}才` : '-' },
        { label: "除脂肪体重", value: data.lean_body_mass_kg ? `${data.lean_body_mass_kg.toFixed(2)}kg` : '-' },
        { label: "体水分率", value: data.body_water_percentage ? `${data.body_water_percentage.toFixed(2)}%` : '-' },
        { label: "推定骨量", value: data.bone_mass_kg ? `${data.bone_mass_kg.toFixed(2)}kg` : '-' },
        { label: "タンパク質", value: data.protein_percentage ? `${data.protein_percentage.toFixed(2)}%` : '-' },
    ];

    return (
        <Card className="bg-indigo-50/50 border-indigo-100">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-slate-500">平均体組成データ ({periodLabel})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-3">
                    {items.map((item, i) => (
                        <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                            <span className="text-sm font-bold text-indigo-900">{item.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
