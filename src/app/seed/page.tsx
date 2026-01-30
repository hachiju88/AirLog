import { createClient } from '@/lib/supabase/server';
import { seedData } from '@/lib/seed';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default async function SeedPage() {
    async function runSeed() {
        'use server';
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await seedData(supabase, user.id);
            redirect('/analytics');
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold mb-4">Test Data Generator</h1>
            <form action={runSeed}>
                <Button type="submit" size="lg">Generete 30 Days Data</Button>
            </form>
        </div>
    );
}
