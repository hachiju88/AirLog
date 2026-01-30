'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Camera, Loader2, Upload } from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ProfileAvatarUploadProps = {
    userId: string;
    currentAvatarUrl?: string | null;
    onUploadComplete: (url: string) => void;
    className?: string;
};

export function ProfileAvatarUpload({ userId, currentAvatarUrl, onUploadComplete, className }: ProfileAvatarUploadProps) {
    const supabase = createClient();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fallback URL (DiceBear)
    const fallbackUrl = `https://api.dicebear.com/7.x/open-peeps/svg?seed=${userId}`;
    const displayUrl = currentAvatarUrl || fallbackUrl;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation (Client side)
        if (!file.type.startsWith('image/')) {
            toast.error('画像ファイルを選択してください');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB
            toast.error('ファイルサイズは5MB以下にしてください');
            return;
        }

        if (!userId) {
            toast.error('ユーザーIDが見つかりません。再読み込みしてください。');
            return;
        }

        setIsUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            toast.success('プロフィール画像を更新しました');
            onUploadComplete(publicUrl);

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error('画像のアップロードに失敗しました');
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className={cn("relative group cursor-pointer inline-block", className)} onClick={() => fileInputRef.current?.click()}>
            <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 relative">
                <img
                    src={displayUrl}
                    alt="Profile"
                    className={cn(
                        "h-full w-full object-cover transition-opacity duration-300",
                        isUploading ? "opacity-50" : "group-hover:opacity-75"
                    )}
                />

                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    </div>
                )}

                {!isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <Camera className="h-8 w-8 text-white drop-shadow-md" />
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-slate-100 group-hover:bg-slate-50 transition-colors">
                <Upload className="h-4 w-4 text-slate-600" />
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
            />
        </div>
    );
}
