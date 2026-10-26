import { Check } from "lucide-react";
import React from "react";

export interface SomaticNormButtonProps {
	readonly onApplyNorm: (e?: React.MouseEvent) => void;
	readonly className?: string;
	readonly triggerRef?: React.RefObject<HTMLButtonElement | null>;
	readonly isCompactSecondary?: boolean;
}

export const SomaticNormButton: React.FC<SomaticNormButtonProps> = ({
	onApplyNorm,
	className = "",
	triggerRef,
	isCompactSecondary = false,
}) => {
	if (isCompactSecondary) {
		return (
			<button
				type="button"
				onClick={onApplyNorm}
				data-testid="btn-somatic-norm-one-click"
				className="secondary-button h-7 min-h-[28px] sm:min-h-0 sm:h-7 px-1.5 sm:px-2 py-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 ml-1 items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg hidden md:inline-flex"
				title="Снять стоп-факторы и подтвердить норму"
				aria-label="Подтвердить норму"
			>
				<Check size={13} className="text-emerald-600 dark:text-emerald-400" />
				<span className="hidden xl:inline">Норма</span>
			</button>
		);
	}

	return (
		<button
			type="button"
			ref={triggerRef}
			onClick={onApplyNorm}
			data-testid="btn-somatic-norm-one-click"
			className={`secondary-button h-7 min-h-[28px] sm:min-h-0 sm:h-7 px-2 sm:px-2.5 py-0 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg select-none ${className}`}
			title="Соматически здоров / норма: зафиксировать норму во всех показателях и перенести в дневник"
			aria-label="Соматически здоров / норма"
		>
			<Check
				className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
				aria-hidden="true"
			/>
			<span className="hidden 2xl:inline">Соматически здоров / норма</span>
			<span className="hidden sm:inline 2xl:hidden">Соматически здоров / норма</span>
			<span className="sm:hidden">Норма</span>
		</button>
	);
};
