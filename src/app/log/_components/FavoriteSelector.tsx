'use client';

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2, Star, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type FavoriteItem = {
    id: string;
    type: 'meal' | 'exercise';
    name: string;
    content: any;
    created_at: string;
};

type FavoriteSelectorProps = {
    type: 'meal' | 'exercise';
    onSelect: (item: FavoriteItem) => void;
    trigger?: React.ReactNode;
};

export function FavoriteSelector({ type, onSelect, trigger }: FavoriteSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchFavorites = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', type)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            toast.error("My Menuの取得に失敗しました");
        } else {
            setFavorites(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchFavorites();
        }
    }, [isOpen, type]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const supabase = createClient();
        const { error } = await supabase.from('favorites').delete().eq('id', id);

        if (error) {
            toast.error("削除に失敗しました");
        } else {
            toast.success("削除しました");
            setFavorites(prev => prev.filter(item => item.id !== id));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2 bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
                        <Star className="h-4 w-4" />
                        My Menuから選択
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        My Menu ({type === 'meal' ? '食事' : '運動'})
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px]">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : favorites.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm p-4 text-center">
                            <Star className="h-8 w-8 mb-2 opacity-50" />
                            <p>My Menuはまだありません</p>
                            <p className="text-xs mt-1">記録画面の「My Menuに保存」チェックONで追加できます</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[50vh]">
                            <div className="space-y-2 pr-4">
                                {favorites.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            onSelect(item);
                                            setIsOpen(false);
                                        }}
                                        className="group p-3 rounded-lg border border-slate-100 bg-white hover:border-yellow-200 hover:bg-yellow-50 transition-colors cursor-pointer flex items-center justify-between shadow-sm"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-700 truncate">{item.name}</div>
                                            <div className="text-xs text-slate-400 truncate">
                                                {type === 'exercise' ? (
                                                    // Exercise Details
                                                    <span className="flex gap-2">
                                                        {item.content.duration_minutes > 0 && <span>{item.content.duration_minutes}分</span>}
                                                        {item.content.calories > 0 && <span>{item.content.calories}kcal</span>}
                                                    </span>
                                                ) : (
                                                    // Meal Details
                                                    <span>{Math.round(item.content.calories || 0)} kcal</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-white"
                                                onClick={(e) => handleDelete(e, item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
