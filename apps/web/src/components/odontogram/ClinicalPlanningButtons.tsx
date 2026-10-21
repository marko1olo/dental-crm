import { Calculator, FileText, FlaskConical } from "lucide-react";
import type React from "react";

export interface ClinicalPlanningButtonsProps {
	readonly onOneClickLabOrder?: ((teeth: number[]) => void) | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly setIsPlanWizardOpen: (open: boolean) => void;
	readonly onToggleEstimator?: (() => void) | undefined;
	readonly isEstimatorOpen?: boolean | undefined;
	readonly onCloseMenu: () => void;
}

export const ClinicalPlanningButtons: React.FC<
	ClinicalPlanningButtonsProps
> = ({
	onOneClickLabOrder,
	selectedTeeth,
	setIsPlanWizardOpen,
	onToggleEstimator,
	isEstimatorOpen,
	onCloseMenu,
}) => {
	const itemCls =
		"min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-800/60 border-[var(--line,#e2e8f0)] dark:border-zinc-700/60 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-zinc-800 hover:border-teal-500/40";

	return (
		<>
			{onOneClickLabOrder && (
				<button
					type="button"
					onClick={() => {
						onOneClickLabOrder(
							selectedTeeth && selectedTeeth.length > 0 ? selectedTeeth : [],
						);
						onCloseMenu();
					}}
					className={itemCls}
					title="Оформить наряд в ЗТЛ"
					data-testid="selected-teeth-lab-order-btn"
				>
					<FlaskConical
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
							Наряд в ЗТЛ{" "}
							{selectedTeeth && selectedTeeth.length > 0
								? `(${selectedTeeth.length})`
								: ""}
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							Ордер для зуботехнической лаборатории
						</span>
					</div>
				</button>
			)}

			<button
				type="button"
				onClick={() => {
					setIsPlanWizardOpen(true);
					onCloseMenu();
				}}
				className={itemCls}
				title="Сформировать черновой план лечения по МКБ-10"
				data-testid="more-menu-plan-from-pathologies"
			>
				<FileText
					size={16}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
						План лечения из патологий
					</span>
					<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
						Автогенерация сметы по МКБ-10
					</span>
				</div>
			</button>

			{onToggleEstimator && (
				<button
					type="button"
					onClick={() => {
						onToggleEstimator();
						onCloseMenu();
					}}
					className={`${itemCls} ${isEstimatorOpen ? "bg-teal-500/15 border-teal-500/40 shadow-xs" : ""}`}
					title="Смета плана лечения"
					data-testid="btn-toggle-treatment-estimator"
				>
					<Calculator
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
							Смета плана лечения
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							Калькулятор этапов с копеечной точностью
						</span>
					</div>
				</button>
			)}
		</>
	);
};
