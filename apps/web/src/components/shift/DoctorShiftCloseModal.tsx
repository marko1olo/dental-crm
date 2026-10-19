import React from "react";
import {
	type DoctorShiftCloseModalProps,
	type DoctorShiftCashSummary,
	type DoctorShiftEmrSummary,
	type DoctorShiftCompensationModel,
	DoctorShiftCloseHeader,
	DoctorShiftCloseVisitsSection,
	DoctorShiftCloseCashSection,
	DoctorShiftCloseCompensationModel as ShiftCompensationSection,
	DoctorShiftCloseFooter,
} from "./doctorShiftClose";
import { useDoctorShiftCloseModalLogic } from "./doctorShiftClose/useDoctorShiftCloseModalLogic";

export type {
	DoctorShiftCloseModalProps,
	DoctorShiftCashSummary,
	DoctorShiftEmrSummary,
	DoctorShiftCompensationModel,
};

export const DoctorShiftCloseModal: React.FC<DoctorShiftCloseModalProps> = ({
	isOpen,
	onClose,
	onConfirmClose,
	doctorFullName = "Лечащий врач",
	doctorSpecialtyRu = "Стоматолог общей практики",
	shiftDateLabel,
	shiftStats,
	cashSummary,
	emrSummary,
	clinicName = "ООО «Денте Стоматология»",
	cashboxName = "Основная касса №1 (АТОЛ 55Ф)",
}) => {
	if (!isOpen) return null;

	const l = useDoctorShiftCloseModalLogic({
		doctorFullName,
		doctorSpecialtyRu,
		clinicName,
		shiftDateLabel,
		shiftStats,
		cashSummary,
		emrSummary,
		cashboxName,
		onConfirmClose,
	});

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-close-modal-title"
			data-testid="doctor-shift-close-modal"
		>
			<div
				className="w-full max-w-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
				style={{ background: "var(--paper)", color: "var(--ink)" }}
			>
				{/* Apple HIG Tactile Drag Handle for Mobile Bottom Sheet */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1" aria-hidden="true">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				<DoctorShiftCloseHeader
					doctorFullName={doctorFullName}
					doctorSpecialtyRu={doctorSpecialtyRu}
					todayLabel={l.todayLabel}
					onClose={onClose}
				/>

				<div className="p-4 sm:p-5 overflow-y-auto space-y-4">
					<DoctorShiftCloseVisitsSection
						shiftStats={shiftStats}
						emrSigned={l.emrSigned}
						emrPending={l.emrPending}
					/>

					<DoctorShiftCloseCashSection
						cashRub={l.cashRub}
						cardRub={l.cardRub}
						sbpRub={l.sbpRub}
						depositRub={l.depositRub}
						effectiveTotalCashRub={l.effectiveTotalCashRub}
						countedCashRub={l.countedCashRub}
						onSetCountedCashRub={l.setCountedCashRub}
						cashboxName={cashboxName}
						printZReport={l.printZReport}
						onSetPrintZReport={l.setPrintZReport}
						printShiftSummary={l.printShiftSummary}
						onSetPrintShiftSummary={l.setPrintShiftSummary}
						onExecuteEncashment={l.handleExecuteEncashment}
						isEncashmentDone={l.isEncashmentDone}
					/>

					<ShiftCompensationSection
						shiftStats={shiftStats}
						compensationModel={l.compensationModel}
						onSetCompensationModel={l.setCompensationModel}
						commissionPct={l.commissionPct}
						onSetCommissionPct={l.setCommissionPct}
						labDeductionsRub={l.labDeductionsRub}
						onSetLabDeductionsRub={l.setLabDeductionsRub}
						fixedRentRub={l.fixedRentRub}
						onSetFixedRentRub={l.setFixedRentRub}
						baseSalaryRub={l.baseSalaryRub}
						onSetBaseSalaryRub={l.setBaseSalaryRub}
						calculatedPayoutRub={l.calculatedPayoutRub}
					/>
				</div>

				<DoctorShiftCloseFooter
					onPrintShiftStatement={l.handlePrint}
					onClose={onClose}
					onConfirmClose={l.handleConfirm}
				/>
			</div>
		</div>
	);
};

export default DoctorShiftCloseModal;
