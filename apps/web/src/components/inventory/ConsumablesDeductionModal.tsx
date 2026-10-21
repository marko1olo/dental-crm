import React from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { DeductionModalContextBar } from "./deductionModalModules/DeductionModalContextBar.js";
import { DeductionModalFooter } from "./deductionModalModules/DeductionModalFooter.js";
import { DeductionModalHeader } from "./deductionModalModules/DeductionModalHeader.js";
import { DeductionModalItemRow } from "./deductionModalModules/DeductionModalItemRow.js";
import type {
	ConsumablesDeductionModalItem,
	ConsumablesDeductionModalProps,
} from "./deductionModalModules/deductionModalTypes.js";
import { useConsumablesDeductionLogic } from "./deductionModalModules/useConsumablesDeductionLogic.js";

export {
	type ConsumablesDeductionModalItem,
	type ConsumablesDeductionModalProps,
} from "./deductionModalModules/deductionModalTypes.js";

/**
 * ConsumablesDeductionModal — Клиническое модальное окно списания расходных материалов приёма (BOM).
 * SSOT расположен в: apps/web/src/components/inventory/ConsumablesDeductionModal.tsx
 *
 * Мандаты 8e (Врачебная автономия), 8n (Масштаб), 8s (Анти-блоат), СанПиН 2.1.3684-21 / 3.3686-21.
 * - Чистый клинический язык без бухгалтерского птичьего языка.
 * - Автоматический подбор комплекта материалов по номенклатуре услуги.
 * - Мягкий овердрафт: нулевой остаток предупреждает, но кнопка подтверждения НИКОГДА не блокируется.
 * - Все модули строго <= 120 строк.
 */
export const ConsumablesDeductionModal: React.FC<ConsumablesDeductionModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
		serviceCode,
		service804nCode = "A16.07.002.011",
		doctorName = "Кузнецов А.В.",
		patientName = "Смирнова Е.А.",
		toothNumber = 16,
	} = props;

	const effectiveServiceCode = serviceCode || service804nCode;

	const {
		deductionItems,
		totals,
		isSubmitting,
		handleUpdateQty,
		handleConfirm,
		handleApplyStandardTherapistKit,
	} = useConsumablesDeductionLogic({ ...props, serviceCode: effectiveServiceCode });

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
			style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
			data-testid="consumables-deduction-modal-overlay"
			onClick={onClose}
		>
			<div
				className="w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] rounded-2xl border border-[var(--line)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				data-testid="consumables-deduction-modal"
				onClick={(e) => e.stopPropagation()}
			>
				<DeductionModalHeader
					procedureTitle={procedureTitle}
					toothNumber={toothNumber}
					onClose={onClose}
				/>
				<DeductionModalContextBar
					doctorName={doctorName}
					patientName={patientName}
					serviceCode={effectiveServiceCode}
					overdraftCount={totals.overdraftCount}
				/>
				<div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
					<div className="text-xs font-semibold text-[var(--muted)] mb-1 flex items-center justify-between flex-wrap gap-2">
						<span>Материалы по клиническому протоколу ({deductionItems.length} поз.)</span>
						<button
							type="button"
							onClick={handleApplyStandardTherapistKit}
							className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-bold border border-teal-600/40 bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-500/20 flex items-center gap-1.5 cursor-pointer transition-colors active:scale-98"
							data-testid="btn-quick-standard-kit"
							title="Быстрое списание стандартного набора терапевта (СИЗ, слюноотсос, салфетка, валики)"
						>
							<Check size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>✓ Списать стандартный набор терапевта</span>
						</button>
					</div>
					{deductionItems.map((item) => (
						<DeductionModalItemRow
							key={item.id}
							item={item}
							onUpdateQty={handleUpdateQty}
						/>
					))}
				</div>
				<DeductionModalFooter
					totals={totals}
					isSubmitting={isSubmitting}
					onClose={onClose}
					onConfirm={handleConfirm}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default ConsumablesDeductionModal;
