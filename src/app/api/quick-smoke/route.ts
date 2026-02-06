import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * クイック喫煙記録API
 * 
 * 1本の喫煙をワンタップで記録する。
 * PWAショートカットからの呼び出しを想定。
 */
export async function GET(req: NextRequest) {
    // ヘルパー: 正しいリダイレクトURLを構築
    const getRedirectUrl = (path: string) => {
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        return `${protocol}://${host}${path}`;
    };

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // 未ログインの場合はログインページへリダイレクト
            return NextResponse.redirect(getRedirectUrl('/login'));
        }

        // プロフィールを取得
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_smoker, price_per_pack, cigarettes_per_pack')
            .eq('id', user.id)
            .single();

        if (!profile?.is_smoker) {
            // 喫煙者でない場合は設定ページへ
            return NextResponse.redirect(getRedirectUrl('/settings'));
        }

        // 1本あたりの価格を計算
        const pricePerCigarette = profile.price_per_pack && profile.cigarettes_per_pack
            ? profile.price_per_pack / profile.cigarettes_per_pack
            : 29;

        // 喫煙ログを挿入
        const { error } = await supabase
            .from('smoking_logs')
            .insert([{
                user_id: user.id,
                cigarette_count: 1,
                price_per_cigarette: pricePerCigarette,
                is_different_brand: false,
                ai_analysis_raw: { status: 'completed' }
            }]);

        if (error) {
            console.error('Quick smoke error:', error);
            return NextResponse.redirect(getRedirectUrl('/dashboard?error=quick-smoke'));
        }

        // リダイレクトパラメータがあればダッシュボードへ
        const redirect = req.nextUrl.searchParams.get('redirect');
        if (redirect) {
            return NextResponse.redirect(getRedirectUrl('/dashboard?refresh=1'));
        }

        // API応答として返す
        return NextResponse.json({
            success: true,
            message: '1本記録しました',
            cigarette_count: 1,
            price: pricePerCigarette
        });

    } catch (error) {
        console.error('Quick smoke API error:', error);
        return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
    }
}
