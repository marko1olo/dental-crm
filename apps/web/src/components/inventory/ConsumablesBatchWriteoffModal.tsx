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
	readonly onConfirmDeduction?: ((items?: any) => void | Promise<void>) | undefined;
	readonly onConfirmWriteoff?: ((doc?: any) => void | Promise<void>) | undefined;
	readonly warehouseItems?: readonly unknown[] | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly getHeaders?: ((extra?: Record<string, string> | undefined) => Record<string, string>) | undefined;
	readonly activeTab?: string | undefined;
	readonly onTabChange?: ((tab: string) => void) | undefined;
	readonly procedureTitle?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly initialTechMapCodes?: readonly string[] | undefined;
	readonly serviceCode?: string | undefined;
	readonly statutoryCode?: string | undefined;
	/** @deprecated use serviceCode or statutoryCode (Мандат 8x) */
	readonly service804nCode?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly toothNumber?: number | string | null | undefined;
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
	readonly confirmTestId?: string | undefined;
	readonly confirmLabel?: string | undefined;
}

export const ConsumablesBatchWriteoffModal: React.FC<ConsumablesBatchWriteoffModalProps> = ({
	isOpen,
	onClose,
	organizationId = "",
	onWriteoffCompleted,
	onDeductionComplete,
	onConfirmDeduction,
	onConfirmWriteoff,
	patientName,
	initialServices,
	procedureTitle,
	serviceName,
	initialTechMapCodes,
	serviceCode,
	statutoryCode,
	service804nCode,
	doctorName,
	doctorFullName,
	toothNumber,
	stockBatches,
	getHeaders,
	confirmTestId,
	confirmLabel,
}) => {
	const effectiveDoctor = doctorFullName || doctorName;
	const firstService = Array.isArray(initialServices) && initialServices.length > 0 ? (initialServices[0] as any) : null;
	const effectiveTooth = toothNumber ?? firstService?.toothNumber;
	const effectiveTitle = procedureTitle || serviceName || firstService?.serviceTitle || firstService?.serviceName;
	const effectiveConfirm = onConfirmWriteoff || onConfirmDeduction;
	const effectiveDeductionComplete = onDeductionComplete || onConfirmDeduction;

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
		handleQuickHygiene,
	} = useConsumablesBatchWriteoff({
		isOpen,
		organizationId,
		getHeaders,
		stockBatches,
		onWriteoffCompleted,
		onDeductionComplete: effectiveDeductionComplete,
		onConfirmWriteoff: effectiveConfirm,
		onClose,
	});

	if (!isOpen) return null;

	const effectiveServiceCode = serviceCode || statutoryCode || service804nCode;
	const isClinicalMode = Boolean(patientName || initialServices || effectiveTitle || effectiveServiceCode);
	const isEmptyServices = Boolean(initialServices && initialServices.length === 0);

	const content = (
		<div
			style={{ zIndex: 100000 }}
			className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			data-testid={isClinicalMode ? "clinical-writeoff-modal" : "consumables-batch-writeoff-modal"}
			data-cy="clinical-writeoff-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isSubmitting) onClose();
			}}
		>
			<div
				className="relative w-full max-w-3xl rounded-t-[24px] sm:rounded-2xl bg-[var(--paper,#ffffff)] border-t sm:border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden text-[var(--ink,#0f172a)] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
				data-testid="consumables-deduction-modal"
				data-cy="clinical-writeoff-dialog"
			>
				{/* Apple HIG: тактильный Drag Handle 36x5px для смартфонов */}
				<div className="w-9 h-1.5 rounded-full bg-neutral-400/50 dark:bg-neutral-500/50 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" aria-hidden="true" />

				{/* Шапка модалки */}
				<div className="p-3.5 sm:p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between shrink-0 bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] flex items-center justify-center shrink-0">
							<PackageCheck size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
									{isClinicalMode ? "Клиническое списание материалов (Расходные материалы приёма)" : "Списание расходников за смену"}
								</h3>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--primary,#0d9488)]/15 text-[var(--primary,#0d9488)] border border-[var(--primary,#0d9488)]/30">
									{isClinicalMode ? "Норма расхода (1 клик по техкартам)" : "1 клик по техкартам"}
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{effectiveTitle
									? `${effectiveTitle} • Расходные материалы приёма${patientName ? ` • ${patientName}` : ""}${effectiveTooth ? ` • Зуб №${effectiveTooth}` : ""}${effectiveDoctor ? ` • Врач: ${effectiveDoctor}` : ""}`
									: patientName
									? `Пациент: ${patientName}${effectiveDoctor ? ` • Врач: ${effectiveDoctor}` : ""}${effectiveTooth ? ` • Зуб №${effectiveTooth}` : ""}`
									: effectiveDoctor
									? `Врач: ${effectiveDoctor}${effectiveTooth ? ` • Зуб №${effectiveTooth}` : ""}`
									: `Автоматический расчет по ${data.shiftStats.completedVisitsCount} завершенным приёмам`}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
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
							{/* Выполненные клинические услуги приёма при наличии */}
							{Array.isArray(initialServices) && initialServices.length > 0 && (
								<div className="p-3 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)] space-y-1.5 text-xs">
									<div className="font-semibold text-[var(--ink,#0f172a)] flex items-center justify-between">
										<span>Выполненные клинические услуги</span>
										{effectiveDoctor && <span className="text-[var(--muted,#64748b)]">{effectiveDoctor}</span>}
									</div>
									{initialServices.map((srv: any, idx) => (
										<div key={srv.id || idx} className="flex items-center justify-between text-[var(--ink,#0f172a)]">
											<div className="flex items-center gap-1.5">
												{srv.serviceCode && <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--line,#e2e8f0)]/50">{srv.serviceCode}</span>}
												<span>{srv.serviceTitle || srv.serviceName || "Стоматологическая услуга"}</span>
											</div>
											{srv.toothNumber && <span className="font-semibold text-[var(--primary,#0d9488)]">Зуб №{srv.toothNumber}</span>}
										</div>
									))}
								</div>
							)}

							{/* Экспресс-списание по техкартам и процедурам */}
							<ClinicalWriteoffQuickStrip
								onQuickCarpuleWriteoff={handleQuickCarpules}
								onQuickAnesthesiaPackageWriteoff={handleQuickAnesthesiaPackage}
								onQuickTherapyWriteoff={handleQuickTherapy}
								onQuickSurgeryWriteoff={handleQuickSurgery}
								onQuickHygieneWriteoff={handleQuickHygiene}
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
					confirmTestId={confirmTestId || (isClinicalMode ? "btn-confirm-deduction" : "batch-writeoff-submit-button")}
					confirmLabel={confirmLabel || (isClinicalMode ? "Списать материалы в наряд" : "✓ Списать расходники смены")}
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
export { ConsumablesBatchWriteoffModal as ConsumablesDeductionModal };
export { ConsumablesBatchWriteoffModal as ProcedureMaterialDeductionModal };
export type BatchWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export type WarehouseBatchWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export type ShiftBatchWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export type ShiftBatchDeductionModalProps = ConsumablesBatchWriteoffModalProps;
export type ConsumablesDeductionModalProps = ConsumablesBatchWriteoffModalProps;
export type ProcedureMaterialDeductionModalProps = ConsumablesBatchWriteoffModalProps;
export type ShiftBatchSummaryData = ShiftBatchWriteoffData;
export type ShiftBatchSummaryItem = ShiftConsumableItem;

export interface ConsumablesDeductionModalItem {
	readonly id: string;
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly category: string;
	readonly unit: string;
	readonly standardQty: number;
	readonly deductedQty: number;
	readonly currentStock: number;
	readonly unitCostRub: number;
	readonly isOverdraft: boolean;
	readonly isMandatory: boolean;
}

export const formatCategoryRu = (cat?: string): string => cat || "Расходный";
export const formatUnitRu = (unit?: string): string => unit || "шт.";

export type ClinicalWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export const ClinicalWriteoffModal = ConsumablesBatchWriteoffModal;

export const DEFAULT_CLINICAL_SERVICES = [
	{ id: "srv-01", serviceCode: "A16.07.002", serviceName: "Лечение кариеса", toothNumber: "16" },
	{ id: "srv-02", serviceCode: "B01.003.004", serviceName: "Местная анестезия", toothNumber: "16" },
];

export default ConsumablesBatchWriteoffModal;
