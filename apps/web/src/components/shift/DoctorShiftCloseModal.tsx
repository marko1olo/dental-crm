import React, { useState, useEffect } from "react";
import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";
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
	printDoctorShiftStatement,
} from "./doctorShiftClose";

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

	const todayLabel =
		shiftDateLabel ||
		new Date().toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});

	// Честный расчет кассовых поступлений: из переданной сводки либо из реального среза платежей
	// biome-ignore lint/suspicious/noExplicitAny: stats cash breakdown
	const statsBreakdown = (shiftStats as any)?.cashBreakdown;
	const cashRub = cashSummary?.cashRub ?? statsBreakdown?.cashRub ?? 0;
	const cardRub = cashSummary?.cardRub ?? statsBreakdown?.cardRub ?? 0;
	const sbpRub = cashSummary?.sbpRub ?? statsBreakdown?.sbpRub ?? 0;
	const depositRub = cashSummary?.depositRub ?? statsBreakdown?.depositRub ?? 0;
	const effectiveTotalCashRub =
		cashSummary?.totalRevenueRub ??
		(cashRub + cardRub + sbpRub + depositRub > 0
			? cashRub + cardRub + sbpRub + depositRub
			: shiftStats.totalRevenueRub);

	const emrSigned = emrSummary?.signedCount ?? shiftStats.completedCount;
	const emrPending = emrSummary?.pendingSignatureCount ?? 0;

	// Сверка фактической наличности 54-ФЗ (0 ₽ расхождений по умолчанию)
	const [countedCashRub, setCountedCashRub] = useState<number>(cashRub);
	const [printZReport, setPrintZReport] = useState<boolean>(true);
	const [printShiftSummary, setPrintShiftSummary] = useState<boolean>(true);

	// Модель начисления смены: [ Сдельщина (% от услуг) | Аренда кресла (фикс) | Оклад + % ] (Мандаты 8e & 8n)
	const [compensationModel, setCompensationModel] = useState<DoctorShiftCompensationModel>("piece_rate");
	const [commissionPct, setCommissionPct] = useState<number>(shiftStats.doctorCommissionPct || 25);
	const [labDeductionsRub, setLabDeductionsRub] = useState<number>(0);
	const [fixedRentRub, setFixedRentRub] = useState<number>(3500);
	const [baseSalaryRub, setBaseSalaryRub] = useState<number>(2500);

	useEffect(() => {
		setCountedCashRub(cashRub);
	}, [cashRub]);

	const cashDifferenceRub = countedCashRub - cashRub;
	const isCashBalanced = Math.abs(cashDifferenceRub) < 0.01;
	const fiscalDocNumber = `Z-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}-042`;

	// Расчет заработка в зависимости от выбранной модели
	const calculatedPayoutRub = React.useMemo(() => {
		const revenue = shiftStats.totalRevenueRub;
		if (compensationModel === "chair_rental") {
			return Math.max(0, revenue - fixedRentRub - labDeductionsRub);
		}
		if (compensationModel === "salary_plus_bonus") {
			const netBase = Math.max(0, revenue - labDeductionsRub);
			return Math.round(baseSalaryRub + (netBase * commissionPct) / 100);
		}
		// piece_rate
		if (labDeductionsRub === 0 && commissionPct === shiftStats.doctorCommissionPct) {
			return shiftStats.estimatedDoctorPayoutRub;
		}
		const netBase = Math.max(0, revenue - labDeductionsRub);
		return Math.round((netBase * commissionPct) / 100);
	}, [shiftStats, compensationModel, commissionPct, labDeductionsRub, fixedRentRub, baseSalaryRub]);

	const handlePrint = () => {
		printDoctorShiftStatement({
			doctorFullName,
			doctorSpecialtyRu,
			clinicName,
			todayLabel,
			shiftStats,
			cashRub,
			cardRub,
			sbpRub,
			depositRub,
			effectiveTotalCashRub,
			emrSigned,
			countedCashRub,
			cashDifferenceRub,
			isCashBalanced,
			cashboxName,
			fiscalDocNumber,
			compensationModel,
			calculatedPayoutRub,
			labDeductionsRub,
			fixedRentRub,
			baseSalaryRub,
		});
	};

	const handleConfirm = () => {
		if (printShiftSummary) {
			handlePrint();
		}
		StaffActionAuditService.logShiftClose({
			cashRegisterId: "main_cashier",
			shiftNumber: shiftDateLabel || "today",
			totalRevenueKopecks: Math.round(effectiveTotalCashRub * 100),
			closingCashKopecks: Math.round(countedCashRub * 100),
		});
		onConfirmClose({
			countedCashRub,
			printZReport,
			fiscalDocNumber,
			compensationModel,
			calculatedPayoutRub,
		});
	};

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
				{/* Header with drag handle for mobile */}
				<DoctorShiftCloseHeader
					doctorFullName={doctorFullName}
					doctorSpecialtyRu={doctorSpecialtyRu}
					todayLabel={todayLabel}
					onClose={onClose}
				/>

				{/* Scrollable Body */}
				<div className="p-4 sm:p-5 overflow-y-auto space-y-4">
					<DoctorShiftCloseVisitsSection
						shiftStats={shiftStats}
						emrSigned={emrSigned}
						emrPending={emrPending}
					/>

					<DoctorShiftCloseCashSection
						cashRub={cashRub}
						cardRub={cardRub}
						sbpRub={sbpRub}
						depositRub={depositRub}
						effectiveTotalCashRub={effectiveTotalCashRub}
						countedCashRub={countedCashRub}
						onSetCountedCashRub={setCountedCashRub}
						cashboxName={cashboxName}
						printZReport={printZReport}
						onSetPrintZReport={setPrintZReport}
						printShiftSummary={printShiftSummary}
						onSetPrintShiftSummary={setPrintShiftSummary}
					/>

					<ShiftCompensationSection
						shiftStats={shiftStats}
						compensationModel={compensationModel}
						onSetCompensationModel={setCompensationModel}
						commissionPct={commissionPct}
						onSetCommissionPct={setCommissionPct}
						labDeductionsRub={labDeductionsRub}
						onSetLabDeductionsRub={setLabDeductionsRub}
						fixedRentRub={fixedRentRub}
						onSetFixedRentRub={setFixedRentRub}
						baseSalaryRub={baseSalaryRub}
						onSetBaseSalaryRub={setBaseSalaryRub}
						calculatedPayoutRub={calculatedPayoutRub}
					/>
				</div>

				{/* Footer with canonical buttons and Apple HIG thumb zone */}
				<DoctorShiftCloseFooter
					onPrintShiftStatement={handlePrint}
					onClose={onClose}
					onConfirmClose={handleConfirm}
				/>
			</div>
		</div>
	);
};

export default DoctorShiftCloseModal;
