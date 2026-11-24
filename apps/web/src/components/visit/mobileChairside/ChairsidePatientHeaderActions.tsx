import React from "react";
import { FileText, FlaskConical, Pill, Printer, ShieldCheck, X } from "lucide-react";

export interface ChairsidePatientHeaderActionsProps {
	handlePrintMedicalCardFast?: (() => void) | undefined;
	/** @deprecated Канонический вызов: handlePrintMedicalCardFast («Медицинская карта приёма», Мандаты 8x/8ap) */
	handlePrintForm043uFast?: (() => void) | undefined;
	handleOpenPrescription?: (() => void) | undefined;
	handleOpenLabOrder?: (() => void) | undefined;
	onOpenWarrantyModal?: (() => void) | undefined;
	onOpenDiarySheet?: (() => void) | undefined;
	onClose?: (() => void) | undefined;
	testId?: string;
}

export const ChairsidePatientHeaderActions: React.FC<
	ChairsidePatientHeaderActionsProps
> = ({
	handlePrintMedicalCardFast,
	handlePrintForm043uFast,
	handleOpenPrescription,
	handleOpenLabOrder,
	onOpenWarrantyModal,
	onOpenDiarySheet,
	onClose,
	testId = "mobile-chairside-workspace",
}) => {
	const onPrintCard = handlePrintMedicalCardFast ?? handlePrintForm043uFast;

	return (
		<div className="mobile-chairside-hud-actions">
			{onOpenDiarySheet && (
				<button
					type="button"
					onClick={onOpenDiarySheet}
					className="mobile-chairside-icon-btn text-[var(--ink-muted)] hover:text-[var(--ink)]"
					aria-label="Дневник приёма"
					title="Дневник приёма (SOAP)"
					data-testid={`${testId}-diary-drawer-btn`}
				>
					<FileText size={18} />
				</button>
			)}

			{handleOpenPrescription && (
				<button
					type="button"
					onClick={handleOpenPrescription}
					className="mobile-chairside-icon-btn text-[var(--ink-muted)] hover:text-[var(--ink)]"
					aria-label="Рецептурный бланк на лекарства"
					title="Рецепты на лекарства"
					data-testid={`${testId}-prescription-btn`}
				>
					<Pill size={18} />
				</button>
			)}

			{onPrintCard && (
				<button
					type="button"
					onClick={onPrintCard}
					className="mobile-chairside-icon-btn text-[var(--ink-muted)] hover:text-[var(--ink)]"
					aria-label="Печать медицинской карты приёма"
					title="Медицинская карта приёма (печать со штампом)"
					data-testid={`${testId}-print-btn`}
				>
					<Printer size={18} />
				</button>
			)}

			{handleOpenLabOrder && (
				<button
					type="button"
					onClick={handleOpenLabOrder}
					className="mobile-chairside-icon-btn mobile-chairside-icon-btn-secondary text-[var(--ink-muted)] hover:text-[var(--ink)]"
					aria-label="Наряд ЗТЛ"
					title="Наряд в лабораторию"
					data-testid={`${testId}-lab-btn`}
				>
					<FlaskConical size={18} />
				</button>
			)}

			{onOpenWarrantyModal && (
				<button
					type="button"
					onClick={onOpenWarrantyModal}
					className="mobile-chairside-icon-btn mobile-chairside-icon-btn-secondary text-[var(--ink-muted)] hover:text-[var(--ink)]"
					aria-label="Гарантийный паспорт"
					title="Гарантийный паспорт"
					data-testid={`${testId}-warranty-btn`}
				>
					<ShieldCheck size={18} />
				</button>
			)}

			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="mobile-chairside-icon-btn text-[var(--ink-muted)] hover:text-[var(--ink)]"
					aria-label="Свернуть приём"
					data-testid={`${testId}-close-btn`}
				>
					<X size={20} />
				</button>
			)}
		</div>
	);
};
