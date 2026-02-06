import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { EXPRESSIONS } from '@/lib/girlfriend-expressions';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type Message = {
    role: 'user' | 'girlfriend';
    content: string;
};

/**
 * 禁煙ガールフレンドチャットAPI
 * 毒舌キャラクターとの会話を通じて禁煙をサポート
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: '未認証' }, { status: 401 });
        }

        const { messages, systemPrompt } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
        }

        // 喫煙データを取得して文脈を追加
        const { data: profile } = await supabase
            .from('profiles')
            .select('cigarette_brand, target_cigarettes_per_day')
            .eq('id', user.id)
            .single();

        // 今日の喫煙本数を取得
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayLogs } = await supabase
            .from('smoking_logs')
            .select('cigarette_count')
            .eq('user_id', user.id)
            .gte('recorded_at', today.toISOString());

        const todayCigarettes = todayLogs?.reduce((sum, log) => sum + (log.cigarette_count || 0), 0) || 0;
        const target = profile?.target_cigarettes_per_day || 10;

        // 文脈を追加
        const contextMessage = `
[システム情報 - ユーザーに見せない]
- ユーザーの銘柄: ${profile?.cigarette_brand || '不明'}
- 今日の喫煙本数: ${todayCigarettes}本
- 1日の目標: ${target}本以内
- 目標達成状況: ${todayCigarettes <= target ? '達成中' : '超過'}
この情報を参考に、適切に会話してください。`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // 会話履歴を構築（userロールで始まる必要がある）
        // 最初のgirlfriendメッセージとユーザーの最新メッセージを除外
        const userMessages = messages.filter((msg: Message) => msg.role === 'user');

        // 履歴なしでシンプルに送信（会話が短い場合は履歴不要）
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (!lastUserMessage) {
            return NextResponse.json({ error: 'ユーザーメッセージが必要です' }, { status: 400 });
        }

        // 表情リストのテキスト生成
        const expressionList = Object.values(EXPRESSIONS)
            .map(e => `- ${e.key}: ${e.name} (${e.situations.join(', ')})`)
            .join('\n');

        const expressionPrompt = `
[出力形式]
JSON形式で出力してください。
{
  "content": "メッセージ本文（毒舌な返答）",
  "expression": "表情キー（以下のリストから最適なものを1つ選択）"
}

[表情キーリスト]
${expressionList}

[ルール]
- 文脈に合わせて最適な表情を選んでください。デフォルトは\`neutral\`です。
- 基本的に毒舌ですが、常に怒っているわけではありません。
- ユーザーが言い訳をしたり、弱音を吐いた時は「exasperated（呆れ）」や「smug（見下し）」
- ユーザーが本当にダメそうな時や、体を壊しそうな時は「worried（心配）」や「concerned（気遣い）」
- ユーザーが禁煙を頑張っている時は「embarrassed（照れ）」や「happy（素直な笑顔）」
- 厳しいことを言う時だけ「angry（怒り）」や「cold（冷淡）」を使ってください。
- 「angry」は本当に許せない時だけ使うレアな表情にしてください。
- 出力する「content」には、「（呆れ）」「（怒り）」のようなト書きや動作描写を含めないでください。セリフのみを出力してください。
`;

        const fullPrompt = `${systemPrompt}\n\n${expressionPrompt}\n\n${contextMessage}\n\n[ユーザーの発言]\n${lastUserMessage.content}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
            }
        });

        const response = result.response;
        const text = response.text();

        // JSONパースして検証
        try {
            const json = JSON.parse(text);
            return NextResponse.json(json);
        } catch (e) {
            console.error('JSON Parse Error:', text);
            // パース失敗時のフォールバック
            return NextResponse.json({
                content: text,
                expression: 'neutral'
            });
        }

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'チャットに失敗しました' },
            { status: 500 }
        );
    }
}
