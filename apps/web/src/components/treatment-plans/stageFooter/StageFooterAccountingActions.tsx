import React from "react";
import { CalendarPlus, CreditCard, Package, Printer } from "lucide-react";
import type { TreatmentPlanStage } from "../types";
import type { StageFooterActionFlags } from "./stageFooterHelpers";

export interface StageFooterAccountingActionsProps {
	readonly stage: TreatmentPlanStage;
	readonly flags: StageFooterActionFlags;
	readonly onClose: () => void;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const StageFooterAccountingActions: React.FC<StageFooterAccountingActionsProps> = ({
	stage,
	flags,
	onClose,
	onExecuteWriteOffStage,
	onPayStage,
	onExportStageEstimate,
}) => {
	return (
		<>
			<button
				type="button"
				onClick={() => {
					onClose();
					if (typeof window !== "undefined") {
						window.location.hash = "#schedule";
					}
				}}
				className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
				title="Перейти в расписание для записи пациента на этот этап"
				data-testid={`stage-${stage.stageNumber}-book-slot-btn`}
				role="menuitem"
			>
				<CalendarPlus size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Записать на этот этап</span>
			</button>

			{flags.showWriteOffInMenu && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onExecuteWriteOffStage!(stage);
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
					title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
					data-testid={`stage-${stage.stageNumber}-writeoff-menu-btn`}
					role="menuitem"
				>
					<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Акт и списание</span>
				</button>
			)}

			{flags.showPayInMenu && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onPayStage!(stage);
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
					title={`Принять оплату за этап №${stage.stageNumber} (${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽)`}
					data-testid={`stage-${stage.stageNumber}-pay-menu-btn`}
					role="menuitem"
				>
					<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Создать счёт из этапа</span>
				</button>
			)}

			{flags.showEstimateInMenu && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onExportStageEstimate!(stage);
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
					title="Печать или экспорт сметы по данному этапу"
					data-testid={`stage-${stage.stageNumber}-export-btn`}
					role="menuitem"
				>
					<Printer size={14} className="text-[var(--muted,#64748b)] shrink-0" />
					<span>Печать сметы этапа</span>
				</button>
			)}
		</>
	);
};
