import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  if (process.env.AI_REQUEST_MODE === 'false') {
    return NextResponse.json({
      items: [{
        name: "AI無効モード (開発中)",
        emoji: "🛑",
        calories: 0,
        duration_min: 0,
        weight_kg: 0,
        sets: 0,
        reps: 0
      }]
    });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'テキストが入力されていません' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
        あなたはプロのフィットネストレーナーです。
        以下のテキストはユーザーが話した運動記録です。
        ここから運動内容を抽出し、JSON形式で出力してください。

        テキスト: "${text}"

        出力フォーマット(JSON):
        {
          "items": [
            {
              "name": "ベンチプレス",
              "calories": 50,
              "duration_min": 10,
              "weight_kg": 60,
              "sets": 3,
              "reps": 10,
              "emoji": "🏋️"
            }
          ]
        }

        ルール:
        - カロリーは、運動強度(METs)や負荷量(重量x回数xセット)から、体重60kgの男性と仮定して推定してください。
        - 時間が明示されていない場合:
            - ウエイトトレーニング系（回数・セットがある場合）は、1セットあたり2-3分と仮定して合計時間を算出してください。
            - 有酸素運動系は、文脈から推測するか、デフォルトで10分としてください。
        - 重量(kg)、セット数、回数が明示されている場合は抽出してください。なければnullまたは0で構いません。
        - 複数の運動が含まれる場合は、items配列に複数追加してください。
        - emojiは運動に適したものを1つ選択してください。
        - 余計な解説は不要、JSONのみ返してください。
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();

    // Simple JSON extraction
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    let json;

    if (jsonMatch) {
      try {
        json = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fallthrough to error handling
      }
    }

    if (!json || !json.items) {
      return NextResponse.json({
        items: [{
          name: "解析エラー",
          emoji: "❓",
          calories: 0,
          duration_min: 0
        }]
      });
    }

    return NextResponse.json(json);

  } catch (error: any) {
    console.error('Gemini API Error:', error);

    // Check for Rate Limit
    if (error.message?.includes('429') || error.message?.includes('Quota') || error.status === 429) {
      return NextResponse.json(
        { error: 'AIの利用制限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: '解析中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
