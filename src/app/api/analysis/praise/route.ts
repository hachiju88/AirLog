import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    if (process.env.AI_REQUEST_MODE === 'false') {
        return NextResponse.json({});
    }

    try {
        const { logs, profile, period } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construct a summary string from the logs
        const { weight, meals, exercises, totalCalories, totalBurned } = logs;

        // Detailed logs
        const mealDetails = meals?.map((m: any) => `- ${m.food_name} (${m.calories}kcal)`).join('\n        ') || 'なし';
        const exerciseDetails = exercises?.map((e: any) => `- ${e.exercise_name} (${e.duration_minutes}分, ${e.calories_burned}kcal)`).join('\n        ') || 'なし';

        // Basic context
        const context = `
        User Profile:
        - Target Weight: ${profile?.target_weight_kg || 'Not set'} kg
        - Target Intake: ${profile?.target_calories_intake || 2200} kcal
        - Target Burn: ${profile?.target_calories_burned || 300} kcal

        Today's Data:
        - Latest Weight: ${weight?.weight_kg || 'Not recorded'} kg
        - Total Intake: ${totalCalories} kcal
        - Total Burned: ${totalBurned} kcal
        
        Meal Logs:
        ${mealDetails}

        Exercise Logs:
        ${exerciseDetails}
        `;

        const prompt = `
        あなたはユーザーの健康管理を応援する親しみやすいAIパートナーです。
        今日のユーザーの記録データとプロフィールを元に、以下の2つのメッセージをJSON形式で作成してください。

        1. **greeting**: 20文字以内の短い挨拶。ユーザー名「${profile?.full_name || 'ユーザー'}」を含めてください。絵文字を1つだけ使ってください。
           (例: "おはよう、〇〇さん☀️", "お疲れ様、〇〇さん🌙")
        
        2. **feedback**: 100文字以内の、明るく前向きな「褒め言葉」や「応援メッセージ」。
           - **具体的な記録内容（「サラダチキン」「ランニング」など）を必ず引用して褒めてください。**
           - 目標達成していれば、そこを強調してください。
           - データが不十分でも、「記録してえらい！」や「今日も意識していて素晴らしい！」など、ポジティブに捉えてください。
           - P,F,Cバランスなどの栄養面で良い点があれば言及してください。
           - 説教やネガティブな指摘は絶対にしないでください。

        Context:
        ${context}

        Output Format (JSON):
        {
            "greeting": "...",
            "feedback": "..."
        }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = await result.response;
        const text = response.text();
        const json = JSON.parse(text);

        return NextResponse.json(json);

    } catch (error: any) {
        console.error("AI Praise API Error:", error);
        return NextResponse.json(
            { error: "AIの生成に失敗しました。" },
            { status: 500 }
        );
    }
}
