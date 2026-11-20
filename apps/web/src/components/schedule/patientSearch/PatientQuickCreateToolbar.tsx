import React from "react";
import { UserPlus } from "lucide-react";

interface Props {
	onQuickCreate: () => void;
}

export const PatientQuickCreateToolbar: React.FC<Props> = ({ onQuickCreate }) => {
	return (
		<div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--primary-soft)] flex items-center justify-between gap-3 flex-wrap">
			<div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] min-w-0">
				<UserPlus className="w-4 h-4 text-[var(--primary)] shrink-0" />
				<span className="truncate">Пациента нет в базе или новый визит?</span>
			</div>
			<button
				type="button"
				data-testid="search-modal-quick-create-btn"
				onClick={onQuickCreate}
				className="h-9 min-h-[36px] min-w-[44px] px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
				title="+ Быстрый пациент за 5 сек: ФИО + Телефон"
			>
				<span>+ Быстрый пациент за 5 сек: ФИО + Телефон</span>
			</button>
		</div>
	);
};
