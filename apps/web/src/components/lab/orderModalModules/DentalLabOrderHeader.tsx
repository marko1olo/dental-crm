import React from "react";
import { FlaskConical, Sparkles, X, Printer, Calendar } from "lucide-react";

export interface DentalLabOrderHeaderProps {
	readonly isEdit?: boolean | undefined;
	readonly orderNumber?: string | undefined;
	readonly gostOrderNumber?: string | undefined;
	readonly patientName: string;
	readonly patientChartNumber?: string | undefined;
	readonly doctorName: string;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | null | undefined;
	readonly stageTitle?: string | null | undefined;
	readonly dueDate?: string | undefined;
	readonly selectedLabName?: string | undefined;
	readonly selectedTeeth?: readonly number[] | undefined;
	readonly jawScope?: string | null | undefined;
	readonly onApplyDefaults?: (() => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onClose: () => void;
}

/**
 * DentalLabOrderHeader — шапка заказ-наряда в зуботехническую лабораторию (Мандат 8b: 120–160 строк).
 * Соответствует Mandates 8e (Автономия врача), 8x (Живой клинический язык), 8am (Единый дизайн-код).
 */
export function DentalLabOrderHeader({
	isEdit = false,
	orderNumber,
	gostOrderNumber,
	patientName,
	patientChartNumber,
	doctorName,
	treatmentPlanId,
	stageNumber,
	stageTitle,
	dueDate,
	selectedLabName,
	selectedTeeth,
	jawScope,
	onApplyDefaults,
	onPrint,
	onClose,
}: DentalLabOrderHeaderProps): React.JSX.Element {
	const displayOrderNumber = orderNumber || gostOrderNumber || "Новый";

	return (
		<header className="px-4 sm:px-6 py-3 border-b border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 flex flex-col gap-2 shrink-0">
			{/* Строка 1: Заголовок слева и кнопка закрытия [X] справа */}
			<div className="flex items-center justify-between gap-2 w-full">
				<div className="flex items-center gap-2 min-w-0 flex-1">
					<FlaskConical className="w-5 h-5 text-[#0d9488] shrink-0" />
					<h2
						id="dental-lab-modal-title"
						data-testid="lab-order-modal-title"
						className="text-sm sm:text-base font-extrabold text-[var(--ink,#0f172a)] dark:text-slate-100 truncate m-0"
					>
						{isEdit
							? `Заказ в лабораторию (ЗТЛ) #${displayOrderNumber}`
							: "Заказ в лабораторию (ЗТЛ)"}
					</h2>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Десктопные кнопки в первой строке */}
					{onApplyDefaults && (
						<button
							type="button"
							onClick={onApplyDefaults}
							data-testid="lab-order-apply-defaults-btn"
							className="max-sm:!hidden hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f1f5f9)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold text-xs shadow-2xs transition cursor-pointer"
							title="Заполнить физиологическую норму (Мандат 8e: 1 клик)"
						>
							<Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
							<span>Норма в 1 клик</span>
						</button>
					)}
					{onPrint && (
						<button
							type="button"
							onClick={onPrint}
							className="max-sm:!hidden hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f1f5f9)] dark:hover:bg-slate-700 text-[var(--ink-secondary,#334155)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-100 text-xs font-semibold shadow-2xs transition cursor-pointer"
							title="Печать заказ-наряда"
						>
							<Printer className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
							<span>Печать</span>
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-100 hover:bg-[var(--line,#e2e8f0)] dark:hover:bg-slate-800 cursor-pointer transition-colors"
						aria-label="Закрыть"
						data-testid="lab-order-modal-close-btn"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* Строка 2: Чипы «CAD/CAM Pro», «Этап 3» и мобильные быстрые действия */}
			<div className="flex items-center justify-between gap-2 flex-wrap text-xs">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
						CAD/CAM Pro
					</span>
					{(treatmentPlanId || stageNumber != null) && (
						<span
							data-testid="lab-order-treatment-stage-chip"
							className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30"
						>
							Этап {stageNumber ?? 1} {stageTitle ? `(${stageTitle})` : ""}
						</span>
					)}
					{selectedLabName && (
						<span className="hidden md:inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink-secondary,#334155)] dark:text-slate-300">
							{selectedLabName}
						</span>
					)}
					{dueDate && (
						<span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-[var(--muted,#64748b)]">
							<Calendar className="w-3 h-3 text-[#0d9488]" />
							<span>Срок: <strong>{dueDate}</strong></span>
						</span>
					)}
				</div>

				{/* Мобильные действия: Норма + Печать иконкой */}
				<div className="flex sm:hidden items-center gap-1.5">
					{onApplyDefaults && (
						<button
							type="button"
							onClick={onApplyDefaults}
							className="inline-flex sm:hidden items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 font-bold text-xs shadow-2xs transition cursor-pointer"
							title="Заполнить физиологическую норму (Мандат 8e: 1 клик)"
						>
							<Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
							<span>Норма</span>
						</button>
					)}
					{onPrint && (
						<button
							type="button"
							onClick={onPrint}
							className="inline-flex sm:hidden items-center justify-center w-8 h-8 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink-secondary,#334155)] dark:text-slate-300 shadow-2xs transition cursor-pointer"
							title="Печать"
							aria-label="Печать"
						>
							<Printer className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
						</button>
					)}
				</div>
			</div>

			{/* Строка 3: Пациент, Врач, Зубы */}
			<div className="text-xs text-[var(--muted,#64748b)] flex items-center gap-2 flex-wrap">
				<span>
					Пациент: <strong className="text-[var(--ink,#0f172a)] dark:text-slate-100">{patientName || "Пациент"}</strong>
				</span>
				{patientChartNumber && <span>· Карта №{patientChartNumber}</span>}
				<span>
					· Врач: <strong className="text-[var(--ink,#0f172a)] dark:text-slate-100">{doctorName || "Лечащий врач"}</strong>
				</span>
				{jawScope ? (
					<span className="text-[var(--ink-secondary,#334155)] dark:text-slate-300 font-medium">
						· Челюсть: {jawScope === "upper" ? "Верхняя" : jawScope === "lower" ? "Нижняя" : "Обе"}
					</span>
				) : selectedTeeth && selectedTeeth.length > 0 ? (
					<span className="text-[var(--ink-secondary,#334155)] dark:text-slate-300 font-medium">
						· Зубы FDI: {selectedTeeth.join(", ")}
					</span>
				) : null}
			</div>
		</header>
	);
}

export { DentalLabOrderHeader as DentalLabOrderModalHeader };
