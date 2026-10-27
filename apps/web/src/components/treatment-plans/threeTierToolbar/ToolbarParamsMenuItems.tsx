import React from "react";
import { Coins, FileCheck, ShieldCheck, Sparkles } from "lucide-react";

export interface ToolbarParamsMenuItemsProps {
	readonly showNdflBreakdown: boolean;
	readonly onToggleNdflBreakdown: () => void;
	readonly onOpenComparatorStudio?: (() => void) | undefined;
	readonly onOpenStagePaymentStudio?: (() => void) | undefined;
	readonly onOpenPriceValidatorStudio?: (() => void) | undefined;
	readonly onClose: () => void;
}

export const ToolbarParamsMenuItems: React.FC<ToolbarParamsMenuItemsProps> = ({
	showNdflBreakdown,
	onToggleNdflBreakdown,
	onOpenComparatorStudio,
	onOpenStagePaymentStudio,
	onOpenPriceValidatorStudio,
	onClose,
}) => {
	return (
		<>
			<button
				type="button"
				onClick={() => onToggleNdflBreakdown()}
				className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[36px] h-9 transition-colors ${
					showNdflBreakdown
						? "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/20"
						: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
				}`}
				role="menuitem"
				title="Показать расчет налогового вычета 13% по НК РФ"
			>
				<div className="flex items-center gap-2">
					<ShieldCheck
						size={14}
						className={showNdflBreakdown ? "text-[var(--teal,var(--brand-primary))]" : "text-[var(--muted)]"}
					/>
					<span>Вычет 13% (НДФЛ)</span>
				</div>
				<span
					className={`text-[11.5px] font-bold px-1.5 py-0.5 rounded ${
						showNdflBreakdown
							? "bg-[var(--teal,var(--brand-primary))] text-[var(--paper-strong,#ffffff)]"
							: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
					}`}
				>
					{showNdflBreakdown ? "ВКЛ" : "ВЫКЛ"}
				</span>
			</button>

			{onOpenComparatorStudio && (
				<button
					type="button"
					onClick={() => {
						onOpenComparatorStudio();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[36px] h-9"
					role="menuitem"
					title="Открыть полноэкранную презентационную студию сравнения"
				>
					<Sparkles size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Студия сравнения планов</span>
				</button>
			)}

			{onOpenStagePaymentStudio && (
				<button
					type="button"
					onClick={() => {
						onOpenStagePaymentStudio();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[36px] h-9"
					role="menuitem"
					title="Открыть студию поэтапной оплаты и эскроу-депозитов"
				>
					<Coins size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Поэтапная оплата & Эскроу</span>
				</button>
			)}

			{onOpenPriceValidatorStudio && (
				<button
					type="button"
					onClick={() => {
						onOpenPriceValidatorStudio();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[36px] h-9"
					role="menuitem"
					title="Проверить цены по прайсу и протоколам СтАР"
				>
					<FileCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Валидация цен (Прайс СтАР)</span>
				</button>
			)}
		</>
	);
};
