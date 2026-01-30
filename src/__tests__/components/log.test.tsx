import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NutrientBadges } from '@/components/log/NutrientBadges';
import { DeleteConfirmDialog } from '@/components/log/DeleteConfirmDialog';

// useRouterのモック
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        back: vi.fn(),
        push: vi.fn(),
    }),
}));

describe('NutrientBadges', () => {
    it('P/F/Cの値を正しく表示する', () => {
        render(<NutrientBadges protein={25.5} fat={15.3} carbs={80.2} />);

        expect(screen.getByText('P 25.5')).toBeInTheDocument();
        expect(screen.getByText('F 15.3')).toBeInTheDocument();
        expect(screen.getByText('C 80.2')).toBeInTheDocument();
    });

    it('小数点以下を1桁に丸める', () => {
        render(<NutrientBadges protein={10.123} fat={20.456} carbs={30.789} />);

        expect(screen.getByText('P 10.1')).toBeInTheDocument();
        expect(screen.getByText('F 20.5')).toBeInTheDocument();
        expect(screen.getByText('C 30.8')).toBeInTheDocument();
    });

    it('カスタムclassNameを適用できる', () => {
        const { container } = render(
            <NutrientBadges protein={10} fat={10} carbs={10} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });
});

describe('DeleteConfirmDialog', () => {
    it('閉じた状態では表示されない', () => {
        render(
            <DeleteConfirmDialog
                isOpen={false}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />
        );

        expect(screen.queryByText('下書きを削除')).not.toBeInTheDocument();
    });

    it('開いた状態でタイトルと説明が表示される', () => {
        render(
            <DeleteConfirmDialog
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />
        );

        expect(screen.getByText('下書きを削除')).toBeInTheDocument();
        expect(screen.getByText('この下書きを削除してもよろしいですか？')).toBeInTheDocument();
    });

    it('カスタムタイトルと説明を表示できる', () => {
        render(
            <DeleteConfirmDialog
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                title="カスタムタイトル"
                description="カスタム説明文"
            />
        );

        expect(screen.getByText('カスタムタイトル')).toBeInTheDocument();
        expect(screen.getByText('カスタム説明文')).toBeInTheDocument();
    });

    it('キャンセルボタンと削除ボタンが表示される', () => {
        render(
            <DeleteConfirmDialog
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
            />
        );

        expect(screen.getByText('キャンセル')).toBeInTheDocument();
        expect(screen.getByText('削除する')).toBeInTheDocument();
    });

    it('削除ボタンをクリックするとonConfirmが呼ばれる', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        render(
            <DeleteConfirmDialog
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={onConfirm}
            />
        );

        await user.click(screen.getByText('削除する'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
