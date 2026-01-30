'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <Card className="w-full max-w-md border-red-200 shadow-md">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-red-100 p-3 rounded-full w-fit">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-xl text-red-700">認証エラー</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-slate-600">
                    <p>ログイン処理中にエラーが発生しました。</p>
                    <p className="text-sm mt-2">
                        リンクの有効期限が切れているか、無効なアクセストークンです。
                        もう一度ログインをお試しください。
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" variant="outline">
                        <Link href="/login">ログイン画面へ戻る</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
