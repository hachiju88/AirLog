import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    if (process.env.AI_REQUEST_MODE === 'false') {
        return NextResponse.json({
            items: [{
                name: "AI無効モード (開発中)",
                emoji: "🛑",
                calories: 0,
                protein: 0,
                fat: 0,
                carbs: 0,
                fiber: 0,
                salt: 0
            }]
        });
    }

    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "画像データが見つかりません" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        この料理の画像を解析し、写っている料理を個別に識別してください。
        それぞれの料理について、以下の情報をJSON形式で出力してください。

        Expected JSON Structure:
        {
          "items": [
            {
              "name": "料理名 (日本語)",
              "emoji": "料理を表す絵文字1文字 (例: 🍛, 🥗, 🥛)",
              "calories": 推定カロリー (数値Number, kcal),
              "protein": 推定タンパク質 (数値Number, グラム),
              "fat": 推定脂質 (数値Number, グラム),
              "carbs": 推定炭水化物 (数値Number, グラム),
              "fiber": 推定食物繊維 (数値Number, グラム),
              "salt": 推定食塩相当量 (数値Number, グラム)
            },
            ...
          ]
        }

        画像が料理でない場合や解析不能な場合は、itemsを空配列 [] にしてください。
        余計なマークダウン記法（\`\`\`json 等）は含めず、純粋なJSON文字列のみを返してください。
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: image,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();



        try {
            const json = JSON.parse(cleanedText);

            // Normalize response to always have items array
            let items = [];
            if (Array.isArray(json.items)) {
                items = json.items;
            } else if (json.name) {
                // Fallback if AI provides single object
                items = [json];
            }

            return NextResponse.json({ items });
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            return NextResponse.json({
                items: [{
                    name: "解析エラー",
                    emoji: "🍽️",
                    calories: 0,
                    protein: 0,
                    fat: 0,
                    carbs: 0,
                    fiber: 0,
                    salt: 0
                }]
            });
        }

    } catch (error: any) {
        console.error("API Error Details:", error);

        if (error.message?.includes('429') || error.message?.includes('Quota') || error.status === 429) {
            return NextResponse.json(
                { error: 'AIの利用制限に達しました。しばらく待ってから再試行してください。' },
                { status: 429 }
            );
        }

        const errorMessage = "画像の解析中にエラーが発生しました";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
