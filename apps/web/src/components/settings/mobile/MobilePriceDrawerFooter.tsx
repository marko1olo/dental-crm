import React from "react";
import { Loader2, Trash2 } from "lucide-react";

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
				className={`w-full min-h-[50px] h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
					isSaving ? "pointer-events-none opacity-70" : ""
				}`}
				data-testid="btn-save-mobile-price"
			>
				{isSaving && <Loader2 size={18} className="animate-spin" />}
				<span>{isSaving ? "Сохранение..." : isNew ? "Добавить услугу" : "Сохранить изменения"}</span>
			</button>

			{!isNew && onDelete && (
				<button
					type="button"
					onClick={() => {
						if (!isDeleting) onDelete();
					}}
					className={`w-full min-h-[44px] h-11 rounded-xl text-[14px] font-medium text-[var(--danger,#e11d48)] hover:bg-[var(--danger-soft,rgba(225,29,72,0.1))] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer transition-all ${
						isDeleting ? "pointer-events-none opacity-70" : ""
					}`}
					data-testid="btn-delete-mobile-price"
				>
					{isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
					<span>{isDeleting ? "Удаление..." : "Удалить услугу из прейскуранта"}</span>
				</button>
			)}
		</div>
	);
};
