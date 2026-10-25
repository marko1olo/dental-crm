import React from "react";
import { UserPlus } from "lucide-react";

interface Props {
	onQuickCreate: () => void;
}

export const PatientQuickCreateToolbar: React.FC<Props> = ({ onQuickCreate }) => {
	return (
		<div className="px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-teal-500/10 dark:bg-teal-950/30 flex items-center justify-between gap-3 flex-wrap">
			<div className="flex items-center gap-2 text-xs font-semibold text-teal-950 dark:text-teal-200 min-w-0">
				<UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
				<span className="truncate">Пациента нет в базе или новый визит?</span>
			</div>
			<button
				type="button"
				data-testid="search-modal-quick-create-btn"
				onClick={onQuickCreate}
				className="h-9 min-h-[36px] min-w-[44px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
				title="+ Быстрый пациент за 5 сек: ФИО + Телефон"
			>
				<span>+ Быстрый пациент за 5 сек: ФИО + Телефон</span>
			</button>
		</div>
	);
};
