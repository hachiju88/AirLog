import { SupabaseClient } from '@supabase/supabase-js';

export async function seedData(supabase: SupabaseClient, userId: string) {
    const today = new Date();
    const logs = [];
    const exercises = [];
    const healthLogs = [];

    // Past 30 days
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString();

        // 1. Health Log (Weight)
        // Trend: start at 70kg, drop to 68kg, then slight fluctuation
        const baseWeight = 70;
        const progress = (30 - i) / 30; // 0 to 1
        const weight = baseWeight - (progress * 2) + (Math.random() * 0.4 - 0.2);

        healthLogs.push({
            user_id: userId,
            recorded_at: dateStr,
            weight_kg: parseFloat(weight.toFixed(2)),
            body_fat_percentage: parseFloat((20 - (progress * 1) + (Math.random() * 0.2 - 0.1)).toFixed(1)),
            muscle_mass_kg: parseFloat((50 + (progress * 0.5)).toFixed(1)),
            visceral_fat_rating: 10,
            basal_metabolic_rate: Math.floor(1600 + (Math.random() * 20)),
            metabolic_age: 30,
            lean_body_mass_kg: parseFloat((55 + (progress * 0.5)).toFixed(1)),
            body_water_percentage: parseFloat((60 + (Math.random() * 1)).toFixed(1)),
            bone_mass_kg: parseFloat((3.0 + (Math.random() * 0.1)).toFixed(1)),
            protein_percentage: parseFloat((18 + (Math.random() * 0.5)).toFixed(1)),
            metric_source: 'manual'
        });

        // 2. Meal Logs (3 meals a day)
        // Breakfast
        logs.push({
            user_id: userId,
            recorded_at: new Date(date.setHours(8, 0)).toISOString(),
            food_name: 'トーストとコーヒー',
            calories: 350 + Math.floor(Math.random() * 50),
            protein_g: 10,
            fat_g: 12,
            carbohydrates_g: 50,
            fiber_g: 3,
            salt_g: 1.2,
            input_type: 'text',
            ai_analysis_raw: { status: 'completed', emoji: '🍞' }
        });

        // Lunch
        logs.push({
            user_id: userId,
            recorded_at: new Date(date.setHours(12, 30)).toISOString(),
            food_name: '唐揚げ定食',
            calories: 800 + Math.floor(Math.random() * 100),
            protein_g: 30,
            fat_g: 40,
            carbohydrates_g: 90,
            fiber_g: 5,
            salt_g: 3.5,
            input_type: 'text',
            ai_analysis_raw: { status: 'completed', emoji: '🍱' }
        });

        // Dinner
        logs.push({
            user_id: userId,
            recorded_at: new Date(date.setHours(19, 0)).toISOString(),
            food_name: 'サラダチキンと野菜',
            calories: 400 + Math.floor(Math.random() * 100),
            protein_g: 40,
            fat_g: 10,
            carbohydrates_g: 20,
            fiber_g: 6,
            salt_g: 2.0,
            input_type: 'text',
            ai_analysis_raw: { status: 'completed', emoji: '🥗' }
        });

        // 3. Exercise Logs (Random days)
        if (Math.random() > 0.4) {
            exercises.push({
                user_id: userId,
                recorded_at: new Date(date.setHours(20, 0)).toISOString(),
                exercise_name: 'ランニング',
                calories_burned: 300 + Math.floor(Math.random() * 100),
                duration_minutes: 30,
                input_type: 'text',
                ai_analysis_raw: { status: 'completed', emoji: '🏃' }
            });
        }
    }

    // Insert
    if (healthLogs.length) await supabase.from('health_logs').insert(healthLogs);
    if (logs.length) await supabase.from('meal_logs').insert(logs);
    if (exercises.length) await supabase.from('exercise_logs').insert(exercises);
}
