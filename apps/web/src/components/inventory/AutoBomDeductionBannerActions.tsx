import { Check, Settings2, X } from "lucide-react";
import type React from "react";

export interface AutoBomDeductionBannerActionsProps {
	readonly onConfirmOneClick?: (() => void) | undefined;
	readonly onConfirmShiftDeduction?: (() => void) | undefined;
	readonly onOpenDetails?: (() => void) | undefined;
	readonly onDismiss?: (() => void) | undefined;
}

export const AutoBomDeductionBannerActions: React.FC<
	AutoBomDeductionBannerActionsProps
> = ({
	onConfirmOneClick,
	onConfirmShiftDeduction,
	onOpenDetails,
	onDismiss,
}) => (
	<div className="flex items-center gap-1.5 shrink-0">
		{onOpenDetails && (
			<button
				type="button"
				onClick={onOpenDetails}
				className="secondary-button h-7 px-2 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
				title="Настроить количество списываемых расходников"
				data-testid="btn-banner-customize"
			>
				<Settings2 size={12} />
				<span>Настроить</span>
			</button>
		)}
		{onConfirmShiftDeduction && (
			<button
				type="button"
				onClick={onConfirmShiftDeduction}
				className="secondary-button h-7 px-2.5 text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
				title="Пакетное списание материалов за смену"
				data-testid="btn-banner-confirm-shift"
			>
				<Check size={13} />
				<span>Списать за смену</span>
			</button>
		)}
		{onConfirmOneClick && (
			<button
				type="button"
				onClick={onConfirmOneClick}
				className="primary-button h-7 px-3 text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
				title="Подтвердить списание комплекта материалов за приём"
				data-testid="btn-banner-confirm-quick"
			>
				<Check size={13} />
				<span>Списать расходники за приём</span>
			</button>
		)}
		{onDismiss && (
			<button
				type="button"
				onClick={onDismiss}
				className="icon-button h-7 w-7 min-w-[28px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer transition-colors"
				aria-label="Скрыть плашку"
				data-testid="btn-banner-dismiss"
			>
				<X size={14} />
			</button>
		)}
	</div>
);
