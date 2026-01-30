import { describe, it, expect } from 'vitest';
import type { MealItem, MealLog } from '@/types/meal';
import type { HealthLog } from '@/types/health';
import type { FavoriteItem, FavoriteType } from '@/types/favorite';
import type { Profile } from '@/types/profile';

describe('types - 型定義', () => {
    describe('MealItem', () => {
        it('正しい型で定義できる', () => {
            const item: MealItem = {
                name: 'サラダ',
                emoji: '🥗',
                calories: 150,
                protein: 5,
                fat: 8,
                carbs: 12,
                fiber: 4,
                salt: 0.5,
                portion: 1,
            };

            expect(item.name).toBe('サラダ');
            expect(item.calories).toBe(150);
            expect(item.portion).toBe(1);
        });

        it('emojiはオプショナル', () => {
            const item: MealItem = {
                name: 'ライス',
                calories: 250,
                protein: 5,
                fat: 0.5,
                carbs: 55,
                fiber: 0.5,
                salt: 0,
                portion: 1,
            };

            expect(item.emoji).toBeUndefined();
        });
    });

    describe('MealLog', () => {
        it('正しい型で定義できる', () => {
            const log: MealLog = {
                id: 'uuid-123',
                user_id: 'user-456',
                food_name: 'ハンバーグ定食',
                calories: 800,
                protein_g: 30,
                fat_g: 35,
                carbohydrates_g: 80,
                fiber_g: 5,
                salt_g: 2.5,
                input_type: 'photo',
                ai_analysis_raw: { status: 'completed' },
                recorded_at: '2024-01-15T12:00:00Z',
            };

            expect(log.food_name).toBe('ハンバーグ定食');
            expect(log.input_type).toBe('photo');
        });
    });

    describe('HealthLog', () => {
        it('正しい型で定義できる', () => {
            const log: HealthLog = {
                id: 'uuid-789',
                user_id: 'user-456',
                weight_kg: 65.5,
                body_fat_percentage: 18.5,
                muscle_mass_kg: 28.0,
                basal_metabolic_rate: 1450,
                recorded_at: '2024-01-15T08:00:00Z',
                source: 'bluetooth',
            };

            expect(log.weight_kg).toBe(65.5);
            expect(log.source).toBe('bluetooth');
        });

        it('オプショナルフィールドは省略可能', () => {
            const log: HealthLog = {
                id: 'uuid-abc',
                user_id: 'user-456',
                weight_kg: 70.0,
                recorded_at: '2024-01-15T08:00:00Z',
                source: 'manual',
            };

            expect(log.body_fat_percentage).toBeUndefined();
            expect(log.muscle_mass_kg).toBeUndefined();
        });
    });

    describe('FavoriteItem', () => {
        it('正しい型で定義できる', () => {
            const type: FavoriteType = 'meal';
            const item: FavoriteItem = {
                id: 'fav-123',
                user_id: 'user-456',
                type: type,
                name: 'お気に入りサラダ',
                content: { calories: 150 },
                created_at: '2024-01-10T10:00:00Z',
            };

            expect(item.type).toBe('meal');
            expect(item.name).toBe('お気に入りサラダ');
        });
    });

    describe('Profile', () => {
        it('正しい型で定義できる', () => {
            const profile: Profile = {
                id: 'user-456',
                full_name: '田中太郎',
                height_cm: 175,
                gender: 'male',
                target_weight_kg: 70,
                target_calories_intake: 2200,
            };

            expect(profile.full_name).toBe('田中太郎');
            expect(profile.gender).toBe('male');
        });

        it('全フィールドオプショナルでも定義可能', () => {
            const profile: Profile = {
                id: 'user-789',
            };

            expect(profile.full_name).toBeUndefined();
            expect(profile.height_cm).toBeUndefined();
        });
    });
});
