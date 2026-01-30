'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Additional fields for potentially auto-creating profile later? 
    // For now, stick to Email/Pass flow.

    const supabase = createClient();

    const checkProfileAndRedirect = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                router.push('/onboarding');
            } else {
                router.push('/dashboard');
            }
        }
        router.refresh();
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success('ログイン成功');
                await checkProfileAndRedirect();
            }
        } catch (err) {
            console.error('Login Error:', err);
            toast.error('予期せぬエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                }
            });

            if (error) {
                toast.error(error.message);
            } else {
                if (data.session) {
                    toast.success('登録完了 (ログインしました)');
                    await checkProfileAndRedirect();
                } else {
                    // Check if user is created but not session -> Email confirmation required
                    if (data.user && !data.user.confirmed_at) {
                        toast.success('確認メールを送信しました。メールを確認してください。', { duration: 6000 });
                    } else {
                        toast.success('登録を受け付けました。');
                    }
                }
            }
        } catch (err) {
            console.error('Signup Error:', err);
            toast.error('予期せぬエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = async (provider: 'google') => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
        if (error) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <Card className="w-full max-w-md bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-white/50 shadow-sm">
                <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="text-2xl font-bold text-center">AirLog</CardTitle>
                    <CardDescription className="text-center">
                        次世代セルフケア管理へようこそ
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 mb-6">
                        <Button variant="outline" onClick={() => handleOAuthLogin('google')} disabled={loading} className="w-full">
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Googleで続ける
                        </Button>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 border-t border-slate-300" />
                        <span className="text-xs text-muted-foreground uppercase">またはメールアドレスで</span>
                        <div className="flex-1 border-t border-slate-300" />
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="login">ログイン</TabsTrigger>
                            <TabsTrigger value="signup">新規登録</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">メールアドレス</Label>
                                    <Input
                                        id="email" type="email" placeholder="name@example.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)} required
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">パスワード</Label>
                                    <div className="relative">
                                        <Input
                                            id="password" type={showPassword ? "text" : "password"}
                                            value={password} onChange={(e) => setPassword(e.target.value)} required
                                            className="bg-white pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-slate-400" />
                                            )}
                                            <span className="sr-only">
                                                {showPassword ? "パスワードを隠す" : "パスワードを表示"}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? '処理中...' : 'ログイン'}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">メールアドレス</Label>
                                    <Input
                                        id="signup-email" type="email" placeholder="name@example.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)} required
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">パスワード</Label>
                                    <div className="relative">
                                        <Input
                                            id="signup-password" type={showSignupPassword ? "text" : "password"}
                                            value={password} onChange={(e) => setPassword(e.target.value)} required
                                            className="bg-white pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                                        >
                                            {showSignupPassword ? (
                                                <EyeOff className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-slate-400" />
                                            )}
                                            <span className="sr-only">
                                                {showSignupPassword ? "パスワードを隠す" : "パスワードを表示"}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white" disabled={loading}>
                                    {loading ? '処理中...' : 'アカウント作成'}
                                </Button>
                                <p className="text-xs text-center text-slate-500 mt-2">
                                    ※登録確認メールが送信されます
                                </p>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
