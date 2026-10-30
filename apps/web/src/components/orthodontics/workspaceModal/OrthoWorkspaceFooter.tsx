/**
 * @dental/web/components/orthodontics/workspaceModal/OrthoWorkspaceFooter.tsx
 * Подвал ортодонтического рабочего стола (Apple HIG Natural Thumb Zone, Мандаты 8e, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488 на видимый контекст. Кнопка сохранения никогда не disabled.
 */

import React from "react";
import { Check, Printer, ChevronRight } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface OrthoWorkspaceFooterProps {
	totalCostRub: number;
	onSave: () => void;
	onPrintMemo?: () => void;
}

export const OrthoWorkspaceFooter: React.FC<OrthoWorkspaceFooterProps> = ({
	totalCostRub,
	onSave,
	onPrintMemo,
}) => {
	const handlePrint = () => {
		if (onPrintMemo) {
			onPrintMemo();
		} else {
			showToast("Памятка пациента по ношению дуг/эластиков отправлена на печать", "info");
		}
	};

	return (
		<footer className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2.5 sm:gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
			{/* Левая часть: стоимость приёма и печать памятки */}
			<div className="flex items-center justify-between w-full sm:w-auto gap-3">
				<div className="text-left">
					<span className="text-[11px] text-[var(--muted)] uppercase font-semibold block leading-tight">
						Стоимость приёма:
					</span>
					<span className="text-base sm:text-lg font-bold font-mono text-[var(--ink)] leading-tight">
						{`${totalCostRub} ₽`}
					</span>
				</div>
				<button
					type="button"
					onClick={handlePrint}
					className="secondary-button h-10 sm:h-11 px-3 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[44px] transition-colors"
					title="Печать памятки для пациента"
				>
					<Printer size={16} />
					<span>Печать памятки</span>
				</button>
			</div>

			{/* Ровно ОДНА Primary CTA кнопка #0d9488 (Teal) на видимый экран (Мандат 8am) */}
			<button
				type="button"
				onClick={onSave}
				className="primary-button w-full sm:w-auto min-h-[44px] h-11 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-md active:scale-[0.98] transition-transform cursor-pointer"
				data-testid="ortho-primary-save-cta"
			>
				<Check size={18} className="shrink-0" />
				<span className="hidden sm:inline">Зафиксировать орто-протокол и внести в карту приёма</span>
				<span className="sm:hidden">Зафиксировать орто-протокол</span>
				<ChevronRight size={16} className="hidden sm:inline shrink-0" />
			</button>
		</footer>
	);
};

export default OrthoWorkspaceFooter;
