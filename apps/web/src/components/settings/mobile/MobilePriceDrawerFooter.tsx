import React from "react";
import { Trash2 } from "lucide-react";

interface MobilePriceDrawerFooterProps {
	isSaving: boolean;
	isNew: boolean;
	isDeleting: boolean;
	onDelete?: () => void;
}

export const MobilePriceDrawerFooter: React.FC<MobilePriceDrawerFooterProps> = ({
	isSaving,
	isNew,
	isDeleting,
	onDelete,
}) => {
	return (
		<div className="p-4 border-t border-[var(--line)] bg-[var(--paper)] space-y-2 shrink-0 pb-[max(16px,env(safe-area-inset-bottom))]">
			<button
				form="mobile-price-form"
				type="submit"
				disabled={isSaving}
				className="w-full min-h-[50px] h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
				data-testid="btn-save-mobile-price"
			>
				<span>{isSaving ? "Сохранение..." : isNew ? "Добавить услугу" : "Сохранить изменения"}</span>
			</button>

			{!isNew && onDelete && (
				<button
					type="button"
					onClick={onDelete}
					disabled={isDeleting}
					className="w-full min-h-[44px] h-11 rounded-xl text-[14px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
					data-testid="btn-delete-mobile-price"
				>
					<Trash2 size={15} />
					<span>{isDeleting ? "Удаление..." : "Удалить услугу из прейскуранта"}</span>
				</button>
			)}
		</div>
	);
};
