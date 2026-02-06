import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * タバコ銘柄情報を取得するAPI
 * 
 * Gemini APIを使用して銘柄名から正式名称、本数/箱、価格を取得する。
 */
export async function POST(req: NextRequest) {
    if (process.env.AI_REQUEST_MODE === 'false') {
        return NextResponse.json({
            brand_name: "メビウス・オリジナル (AI無効モード)",
            cigarettes_per_pack: 20,
            price_per_pack: 580,
            price_per_cigarette: 29
        });
    }

    try {
        const { brand } = await req.json();

        if (!brand) {
            return NextResponse.json({ error: '銘柄名が入力されていません' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        あなたは日本のタバコ製品（紙巻き、加熱式、電子タバコ含む）に詳しい専門家です。
        以下のユーザー入力から、該当する銘柄の情報を特定し、JSON形式で出力してください。

        ユーザー入力: "${brand}"

        出力フォーマット(JSON):
        {
          "brand_name": "メビウス・オリジナル",
          "cigarettes_per_pack": 20,
          "price_per_pack": 580,
          "price_per_cigarette": 29
        }

        ルール:
        - brand_name は正式な商品名を出力してください（例: "メビウス・オリジナル", "テリア・メンソール", "キャメル・クラフト"）
        - 加熱式タバコ（iQOS, glo, Ploom Xなど）やリトルシガーも対象です
        - "iQOS" や "glo" などデバイス名のみの場合は、そのデバイスの代表的な銘柄（テリア、ネオなど）を推測してください
        - price_per_pack は2024年時点の日本での販売価格（円）としてください
        - cigarettes_per_pack は1箱あたりの本数です（通常20本）
        - price_per_cigarette は price_per_pack / cigarettes_per_pack で計算してください
        - 入力が曖昧な場合は、最も一般的な製品を選んでください
        - 該当する銘柄が見つからない場合は、最も近い銘柄を推測してください
        - 余計な解説は不要、JSONのみ返してください
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        // JSON抽出
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        let json;

        if (jsonMatch) {
            try {
                json = JSON.parse(jsonMatch[0]);
            } catch (e) {
                // パースエラーの場合はフォールスルー
            }
        }

        if (!json || !json.brand_name) {
            return NextResponse.json({
                brand_name: brand,
                cigarettes_per_pack: 20,
                price_per_pack: 580,
                price_per_cigarette: 29,
                error: "銘柄情報の取得に失敗しました。デフォルト値を使用します。"
            });
        }

        // price_per_cigarette が無い場合は計算
        if (!json.price_per_cigarette && json.price_per_pack && json.cigarettes_per_pack) {
            json.price_per_cigarette = Math.round(json.price_per_pack / json.cigarettes_per_pack * 10) / 10;
        }

        return NextResponse.json(json);

    } catch (error: any) {
        console.error('Gemini API Error:', error);

        // レート制限チェック
        if (error.message?.includes('429') || error.message?.includes('Quota') || error.status === 429) {
            return NextResponse.json(
                { error: 'AIの利用制限に達しました。しばらく待ってから再試行してください。' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: '銘柄情報の取得中にエラーが発生しました' },
            { status: 500 }
        );
    }
}
