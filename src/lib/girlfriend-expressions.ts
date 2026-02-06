/**
 * 禁煙ガールフレンドの表情定義
 * AIの応答に合わせた表情を表示するためのデータ
 */

export type ExpressionKey =
    | 'happy'         // 01: 幸せ（目閉じ笑顔）
    | 'serious'       // 02: 真剣（凝視）
    | 'smug'          // 03: 見下し（斜め視線）
    | 'worried'       // 04: 心配（赤面困惑）
    | 'sad'           // 05: 悲しみ（涙目）
    | 'exasperated'   // 06: 呆れ（ため息）
    | 'surprised'     // 07: 驚き
    | 'neutral'       // 08: 微笑み（デフォルト）
    | 'confident'     // 09: 自信微笑み
    | 'cold'          // 10: 無表情（冷たい）
    | 'embarrassed'   // 11: 照れ笑い（口元隠す）
    | 'disappointed'  // 12: 残念（眉下がり）
    | 'concerned'     // 13: 心配（口開き）
    | 'angry'         // 14: 怒り（睨み）
    | 'pouting'       // 15: 拗ねる（赤面むっ）
    | 'gentle';       // 16: 穏やか（優しい微笑み）

export interface Expression {
    key: ExpressionKey;
    image: string;
    name: string;
    situations: string[];
    keywords: string[];
}

export const EXPRESSIONS: Record<ExpressionKey, Expression> = {
    happy: {
        key: 'happy',
        image: '/girlfriend/sheet01.png',
        name: '幸せ',
        situations: ['禁煙成功を褒める', '完全禁煙達成'],
        keywords: ['よく頑張った', '偉い', '認めてあげる', '成功'],
    },
    serious: {
        key: 'serious',
        image: '/girlfriend/sheet02.png',
        name: '真剣',
        situations: ['初回挨拶', '真面目なアドバイス'],
        keywords: ['よく聞いて', '大事なこと', '本気'],
    },
    smug: {
        key: 'smug',
        image: '/girlfriend/sheet03.png',
        name: '見下し',
        situations: ['挑発的コメント', 'どうせまた吸う'],
        keywords: ['どうせ', 'ふーん', '無理でしょ', '弱い'],
    },
    worried: {
        key: 'worried',
        image: '/girlfriend/sheet04.png',
        name: '心配（赤面）',
        situations: ['遠回しに心配', '本当は気にしている'],
        keywords: ['別に心配してない', '大丈夫...?', '気になる'],
    },
    sad: {
        key: 'sad',
        image: '/girlfriend/sheet05.png',
        name: '悲しみ',
        situations: ['また吸った', '期待を裏切られた'],
        keywords: ['また...', '信じてたのに', 'がっかり'],
    },
    exasperated: {
        key: 'exasperated',
        image: '/girlfriend/sheet06.png',
        name: '呆れ',
        situations: ['言い訳を聞いた', '何度も同じ失敗'],
        keywords: ['はぁ...', '言い訳', 'また同じ', '呆れた'],
    },
    surprised: {
        key: 'surprised',
        image: '/girlfriend/sheet07.png',
        name: '驚き',
        situations: ['意外な発言', '予想外の成功'],
        keywords: ['え...', '本当?', 'まさか', '信じられない'],
    },
    neutral: {
        key: 'neutral',
        image: '/girlfriend/sheet08.png',
        name: '微笑み',
        situations: ['普通の会話', 'デフォルト'],
        keywords: [],
    },
    confident: {
        key: 'confident',
        image: '/girlfriend/sheet09.png',
        name: '自信',
        situations: ['余裕を見せる', '上から目線'],
        keywords: ['当然', '私を見習いなさい', 'ドヤ'],
    },
    cold: {
        key: 'cold',
        image: '/girlfriend/sheet10.png',
        name: '無表情',
        situations: ['興味ないふり', '冷たい返事'],
        keywords: ['知らない', '勝手にすれば', 'どうでもいい'],
    },
    embarrassed: {
        key: 'embarrassed',
        image: '/girlfriend/sheet11.png',
        name: '照れ',
        situations: ['褒められた時', 'ツンデレ反応'],
        keywords: ['別に嬉しくない', 'うるさい', '照れてない'],
    },
    disappointed: {
        key: 'disappointed',
        image: '/girlfriend/sheet12.png',
        name: '残念',
        situations: ['がっかり', '静かな失望'],
        keywords: ['...そう', '期待はずれ', '残念'],
    },
    concerned: {
        key: 'concerned',
        image: '/girlfriend/sheet13.png',
        name: '心配',
        situations: ['大丈夫?', '驚きと心配'],
        keywords: ['大丈夫', '無理しないで', '体は'],
    },
    angry: {
        key: 'angry',
        image: '/girlfriend/sheet14.png',
        name: '怒り',
        situations: ['吸いたいと言った', '禁煙諦め'],
        keywords: ['吸いたい', 'やめる', '諦め', '許さない'],
    },
    pouting: {
        key: 'pouting',
        image: '/girlfriend/sheet15.png',
        name: '拗ねる',
        situations: ['素直になれない', 'からかわれた'],
        keywords: ['うるさい', '知らない', 'もういい'],
    },
    gentle: {
        key: 'gentle',
        image: '/girlfriend/sheet16.png',
        name: '穏やか',
        situations: ['本当に落ち込んでいる時', '諦めそうな時の最後の引き止め', 'ふとした瞬間の優しさ'],
        keywords: ['無理しないで', '信じてるから', '一緒に頑張ろう', '傍にいる'],
    },
};

// デフォルト表情
export const DEFAULT_EXPRESSION: ExpressionKey = 'neutral';

// 表情キーの配列
export const EXPRESSION_KEYS = Object.keys(EXPRESSIONS) as ExpressionKey[];
