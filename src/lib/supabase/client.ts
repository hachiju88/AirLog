import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase Setup Error: Environment variables are missing.');
        // Return a dummy client or throw to prevent crash loop depending on preference.
        // Throwing provides clear error boundary feedback.
        if (typeof window !== 'undefined') {
            alert('Supabaseの環境設定が見つかりません。.env.localを確認してサーバーを再起動してください。');
        }
        throw new Error('Supabase environment variables are missing.');
    }

    return createBrowserClient(supabaseUrl, supabaseKey)
}
