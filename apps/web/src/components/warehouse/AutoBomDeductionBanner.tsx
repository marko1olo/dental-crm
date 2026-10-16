import { CheckCircle2, ShieldAlert } from "lucide-react";
import React from "react";
import { money } from "../../AppHelpers.js";
import { AutoBomDeductionBannerActions } from "./AutoBomDeductionBannerActions.js";

export interface AutoBomDeductionBannerProps {
	readonly procedureTitle?: string | undefined;
	readonly itemsCount?: number | undefined;
	readonly totalCostRub?: number | undefined;
	readonly previewMaterials?: readonly string[] | undefined;
	readonly hasOverdraft?: boolean | undefined;
	readonly overdraftCount?: number | undefined;
	readonly onConfirmOneClick?: () => void;
	readonly onConfirmShiftDeduction?: () => void;
	readonly onOpenDetails?: () => void;
	readonly onDismiss?: () => void;
}

/**
 * AutoBomDeductionBanner — Компактная клиническая плашка автосписания расходных материалов (Tier 1 Hot Path).
 *
 * Мандаты 8e (Врачебная автономия), 8n (Масштаб), 8s (Анти-блоат), СанПиН 3.3686-21.
 * - Информирует врача/ассистента в 1 строку о готовности списания по протоколу процедуры.
 * - Не съедает линию сгиба (Fold Line) экрана: компактная высота 36–40px.
 * - При дефиците на складе показывает мягкое предупреждение овердрафта, не прерывая приём.
 */
export const AutoBomDeductionBanner: React.FC<AutoBomDeductionBannerProps> = ({
	procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
	itemsCount = 4,
	totalCostRub = 549.5,
	previewMaterials = ["Filtek Z250 (0.2г)", "Адгезив (1 доза)", "Перчатки (1 пара)", "Слюноотсос (1 шт)"],
	hasOverdraft = false,
	overdraftCount = 0,
	onConfirmOneClick,
	onConfirmShiftDeduction,
	onOpenDetails,
	onDismiss,
}) => (
	<div
		className="auto-bom-deduction-banner min-h-[38px] py-1 px-3 rounded-xl border border-teal-500/30 bg-teal-500/10 text-[var(--ink,#0f172a)] flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs transition-all"
		data-testid="auto-bom-deduction-banner"
	>
		<div className="flex items-center gap-2 flex-wrap min-w-0">
			<div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-200 shrink-0">
				<CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Автоматическое списание материалов по приёму:</span>
			</div>
			<span className="text-[var(--ink,#0f172a)] font-medium truncate max-w-xs hidden sm:inline">
				«{procedureTitle}»
			</span>
			<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 shrink-0">
				{itemsCount} поз. • {money(totalCostRub)}
			</span>
			<div className="hidden md:flex items-center gap-1 flex-wrap">
				{previewMaterials.slice(0, 3).map((mat) => (
					<span
						key={mat}
						className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--paper,#ffffff)]/80 border border-[var(--line-subtle,#e2e8f0)] text-[var(--muted,#64748b)] font-mono"
					>
						{mat}
					</span>
				))}
				{previewMaterials.length > 3 && (
					<span className="text-[10px] text-[var(--muted,#64748b)]">
						+{previewMaterials.length - 3}
					</span>
				)}
			</div>
			{hasOverdraft && (
				<span
					className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 shrink-0"
					title="Позиции с нулевым остатком будут списаны с мягким овердрафтом (накладная в пути). Приём не блокируется."
					data-testid="banner-overdraft-pill"
				>
					<ShieldAlert size={12} className="text-amber-600 dark:text-amber-400" />
					<span>Ожидается поставка (мягкий овердрафт: {overdraftCount})</span>
				</span>
			)}
		</div>
		<AutoBomDeductionBannerActions
			onConfirmOneClick={onConfirmOneClick}
			onConfirmShiftDeduction={onConfirmShiftDeduction}
			onOpenDetails={onOpenDetails}
			onDismiss={onDismiss}
		/>
	</div>
);

export default AutoBomDeductionBanner;
