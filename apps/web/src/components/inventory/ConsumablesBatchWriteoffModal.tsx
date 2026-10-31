/**
 * apps/web/src/components/inventory/ConsumablesBatchWriteoffModal.tsx
 *
 * Каноническая SSOT-модалка пакетного списания расходных материалов за смену/день в 1 клик.
 * Декомпозированный фасад в соответствии с:
 * - Мандат 8e (Автономия врача: кнопка списания активна ВСЕГДА, ноль блокировок),
 * - Мандат 8n (Суверенитет соло-практики: пакетное списание, фоновый Soft Negative Stock при дефиците),
 * - Мандат 8am (Ровно 1 Primary CTA кнопка var(--teal), второстепенные — secondary),
 * - Мандат 8ze (Apple HIG: на смартфонах нативный Bottom Sheet, drag handle 36x5px, touch target >= 44px),
 * - Мандат 8x (Никакого птичьего языка и канцелярита, только живая клиническая терминология),
 * - Мандат 8b/8zi (Sweet Spot 140–180 строк, модульная архитектура writeoff/).
 */

import React from "react";
import { createPortal } from "react-dom";
import { PackageCheck, X } from "lucide-react";
import { ClinicalWriteoffQuickStrip } from "./writeoff/ClinicalWriteoffQuickStrip.js";
import {
	type ShiftConsumableItem,
	type ShiftBatchWriteoffData,
	useConsumablesBatchWriteoff,
} from "./writeoff/useConsumablesBatchWriteoff.js";
import { BatchWriteoffShiftStats } from "./writeoff/BatchWriteoffShiftStats.js";
import { BatchWriteoffConsumablesTable } from "./writeoff/BatchWriteoffConsumablesTable.js";
import { BatchWriteoffFooterActions } from "./writeoff/BatchWriteoffFooterActions.js";

export type { ShiftConsumableItem, ShiftBatchWriteoffData };

export interface ConsumablesBatchWriteoffModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly onWriteoffCompleted?: (() => void | Promise<void>) | undefined;
	readonly onDeductionComplete?: (() => void | Promise<void>) | undefined;
	readonly onConfirmWriteoff?: ((doc?: any) => void | Promise<void>) | undefined;
	readonly warehouseItems?: readonly unknown[] | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly getHeaders?: ((extra?: Record<string, string> | undefined) => Record<string, string>) | undefined;
	readonly activeTab?: string | undefined;
	readonly onTabChange?: ((tab: string) => void) | undefined;
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly visitId?: string | undefined;
	readonly isDeducting?: boolean | undefined;
	readonly initialServices?: readonly unknown[] | undefined;
	readonly stockBatches?: readonly unknown[] | undefined;
	readonly doctorFullName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly assistantFullName?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly defaultFormType?: string | undefined;
}

export const ConsumablesBatchWriteoffModal: React.FC<ConsumablesBatchWriteoffModalProps> = ({
	isOpen,
	onClose,
	organizationId = "",
	onWriteoffCompleted,
	onDeductionComplete,
	onConfirmWriteoff,
	patientName,
	initialServices,
	stockBatches,
	getHeaders,
}) => {
	const {
		data,
		isSubmitting,
		hasOverdraft,
		handleConfirmWriteoff,
		handlePrintAct,
		handleQuickCarpules,
		handleQuickAnesthesiaPackage,
		handleQuickTherapy,
		handleQuickSurgery,
	} = useConsumablesBatchWriteoff({
		isOpen,
		organizationId,
		getHeaders,
		stockBatches,
		onWriteoffCompleted,
		onDeductionComplete,
		onConfirmWriteoff,
		onClose,
	});

	if (!isOpen) return null;

	const isClinicalMode = Boolean(patientName || initialServices);
	const isEmptyServices = Boolean(initialServices && initialServices.length === 0);

	const content = (
		<div
			style={{ zIndex: 100000 }}
			className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			data-testid="consumables-batch-writeoff-modal"
			data-cy="clinical-writeoff-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isSubmitting) onClose();
			}}
		>
			<div
				className="relative w-full max-w-3xl rounded-t-[24px] sm:rounded-2xl bg-[var(--paper,#ffffff)] border-t sm:border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden text-[var(--ink,#0f172a)] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
				data-testid="clinical-writeoff-modal"
			>
				{/* Apple HIG: тактильный Drag Handle 36x5px для смартфонов */}
				<div className="w-9 h-1.5 rounded-full bg-slate-400/40 dark:bg-slate-500/60 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" aria-hidden="true" />

				{/* Шапка модалки */}
				<div className="p-3.5 sm:p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between shrink-0 bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<PackageCheck size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
									{isClinicalMode ? "Клиническое списание материалов" : "Списание расходников за смену"}
								</h3>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
									1 клик по техкартам
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{patientName ? `Пациент: ${patientName}` : `Автоматический расчет по ${data.shiftStats.completedVisitsCount} завершенным приёмам`}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="secondary-button p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] rounded-lg"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Тело модалки */}
				<div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 overflow-x-clip">
					{isEmptyServices ? (
						<div data-testid="cw-empty-services" className="p-8 text-center text-sm text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)]">
							В текущем приёме нет выполненных клинических услуг
						</div>
					) : (
						<>
							{/* Экспресс-списание по техкартам и процедурам */}
							<ClinicalWriteoffQuickStrip
								onQuickCarpuleWriteoff={handleQuickCarpules}
								onQuickAnesthesiaPackageWriteoff={handleQuickAnesthesiaPackage}
								onQuickTherapyWriteoff={handleQuickTherapy}
								onQuickSurgeryWriteoff={handleQuickSurgery}
							/>

							{/* Сводные показатели смены и предупреждение о мягком овердрафте */}
							<BatchWriteoffShiftStats
								date={data.date}
								shiftStats={data.shiftStats}
								hasOverdraft={hasOverdraft}
							/>

							{/* Таблица списываемых материалов */}
							<BatchWriteoffConsumablesTable
								consumables={data.consumablesSummary}
							/>
						</>
					)}
				</div>

				{/* Футер: Ровно 1 Primary CTA кнопка var(--teal), второстепенные — secondary (Мандаты 8e, 8am, 8ze) */}
				<BatchWriteoffFooterActions
					isSubmitting={isSubmitting}
					onPrintAct={handlePrintAct}
					onCancel={onClose}
					onConfirm={handleConfirmWriteoff}
				/>
			</div>
		</div>
	);

	return typeof document === "undefined" ? content : createPortal(content, document.body);
};

// Канонические SSOT алиасы (Мандаты 8b, 8e, 8n, 8s: ликвидация дублирующих файлов-пустышек)
export { ConsumablesBatchWriteoffModal as BatchWriteoffModal };
export { ConsumablesBatchWriteoffModal as WarehouseBatchWriteoffModal };
export { ConsumablesBatchWriteoffModal as ShiftBatchWriteoffModal };
export { ConsumablesBatchWriteoffModal as ShiftBatchDeductionModal };
export type BatchWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export type WarehouseBatchWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export type ShiftBatchWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export type ShiftBatchDeductionModalProps = ConsumablesBatchWriteoffModalProps;
export type ShiftBatchSummaryData = ShiftBatchWriteoffData;
export type ShiftBatchSummaryItem = ShiftConsumableItem;

export default ConsumablesBatchWriteoffModal;
