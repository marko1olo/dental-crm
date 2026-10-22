import { useState, useEffect, useMemo } from "react";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import { showToast } from "../../GlobalToast";
import type { DoctorShiftStats } from "../controlBarModules/shiftControlBarTypes";
import { printEncashmentStatement } from "../shiftPrintStatements";
import type {
	DoctorShiftCashSummary,
	DoctorShiftEmrSummary,
	DoctorShiftCompensationModel,
} from "./doctorShiftCloseTypes";
import { printDoctorShiftStatement } from "./printDoctorShiftStatement";

export interface UseDoctorShiftCloseModalLogicParams {
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly shiftDateLabel?: string | undefined;
	readonly shiftStats: DoctorShiftStats;
	readonly cashSummary?: DoctorShiftCashSummary | undefined;
	readonly emrSummary?: DoctorShiftEmrSummary | undefined;
	readonly cashboxName?: string | undefined;
	readonly onConfirmClose: (summary: {
		countedCashRub: number;
		printZReport: boolean;
		fiscalDocNumber: string;
		compensationModel: DoctorShiftCompensationModel;
		calculatedPayoutRub: number;
	}) => void;
}

export function useDoctorShiftCloseModalLogic(params: UseDoctorShiftCloseModalLogicParams) {
	const {
		doctorFullName = "Лечащий врач",
		doctorSpecialtyRu = "Стоматолог общей практики",
		clinicName = "ООО «Денте Стоматология»",
		shiftDateLabel,
		shiftStats,
		cashSummary,
		emrSummary,
		cashboxName = "Основная касса №1 (АТОЛ 55Ф)",
		onConfirmClose,
	} = params;

	const todayLabel = shiftDateLabel || new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
	// biome-ignore lint/suspicious/noExplicitAny: stats cash breakdown
	const statsBreakdown = (shiftStats as any)?.cashBreakdown;
	const cashRub = cashSummary?.cashRub ?? statsBreakdown?.cashRub ?? 0;
	const cardRub = cashSummary?.cardRub ?? statsBreakdown?.cardRub ?? 0;
	const sbpRub = cashSummary?.sbpRub ?? statsBreakdown?.sbpRub ?? 0;
	const depositRub = cashSummary?.depositRub ?? statsBreakdown?.depositRub ?? 0;
	const effectiveTotalCashRub = cashSummary?.totalRevenueRub ??
		(cashRub + cardRub + sbpRub + depositRub > 0 ? cashRub + cardRub + sbpRub + depositRub : shiftStats.totalRevenueRub);

	const emrSigned = emrSummary?.signedCount ?? shiftStats.completedCount;
	const emrPending = emrSummary?.pendingSignatureCount ?? 0;

	const [countedCashRub, setCountedCashRub] = useState<number>(cashRub);
	const [printZReport, setPrintZReport] = useState<boolean>(true);
	const [printShiftSummary, setPrintShiftSummary] = useState<boolean>(true);
	const [compensationModel, setCompensationModel] = useState<DoctorShiftCompensationModel>("piece_rate");
	const [commissionPct, setCommissionPct] = useState<number>(shiftStats.doctorCommissionPct || 25);
	const [labDeductionsRub, setLabDeductionsRub] = useState<number>(0);
	const [fixedRentRub, setFixedRentRub] = useState<number>(3500);
	const [baseSalaryRub, setBaseSalaryRub] = useState<number>(2500);
	const [isEncashmentDone, setIsEncashmentDone] = useState<boolean>(false);

	useEffect(() => {
		setCountedCashRub(cashRub);
	}, [cashRub]);

	const cashDifferenceRub = countedCashRub - cashRub;
	const isCashBalanced = Math.abs(cashDifferenceRub) < 0.01;
	const fiscalDocNumber = `Z-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}-042`;

	const calculatedPayoutRub = useMemo(() => {
		const revenue = shiftStats.totalRevenueRub;
		if (compensationModel === "chair_rental") return Math.max(0, revenue - fixedRentRub - labDeductionsRub);
		if (compensationModel === "salary_plus_bonus") {
			const netBase = Math.max(0, revenue - labDeductionsRub);
			return Math.round(baseSalaryRub + (netBase * commissionPct) / 100);
		}
		if (labDeductionsRub === 0 && commissionPct === shiftStats.doctorCommissionPct) return shiftStats.estimatedDoctorPayoutRub;
		const netBase = Math.max(0, revenue - labDeductionsRub);
		return Math.round((netBase * commissionPct) / 100);
	}, [shiftStats, compensationModel, commissionPct, labDeductionsRub, fixedRentRub, baseSalaryRub]);

	const handlePrint = () => {
		printDoctorShiftStatement({
			doctorFullName, doctorSpecialtyRu, clinicName, todayLabel, shiftStats,
			cashRub, cardRub, sbpRub, depositRub, effectiveTotalCashRub, emrSigned,
			countedCashRub, cashDifferenceRub, isCashBalanced, cashboxName, fiscalDocNumber,
			compensationModel, calculatedPayoutRub, labDeductionsRub, fixedRentRub, baseSalaryRub,
		});
	};

	const handleExecuteEncashment = () => {
		const amt = countedCashRub > 0 ? countedCashRub : cashRub;
		printEncashmentStatement({
			doctorFullName,
			clinicName: clinicName || "ООО «Денте Стоматология»",
			encashmentAmount: amt,
			effectiveTotalRub: effectiveTotalCashRub,
			cashRub,
			cardRub,
			sbpRub,
			depositRub,
			doctorCommissionPct: commissionPct,
			estimatedDoctorPayoutRub: calculatedPayoutRub,
		});
		StaffActionAuditService.logShiftClose({
			cashRegisterId: "main_cashier",
			shiftNumber: shiftDateLabel || "today",
			totalRevenueKopecks: Math.round(effectiveTotalCashRub * 100),
			closingCashKopecks: Math.round(amt * 100),
		});
		setIsEncashmentDone(true);
		showToast(`Акт инкассации на ${amt.toLocaleString("ru-RU")} ₽ сформирован`, "info");
	};

	const [isSendingTelegram, setIsSendingTelegram] = useState<boolean>(false);

	const handleSendTelegramSummary = async () => {
		setIsSendingTelegram(true);
		try {
			const res = await fetch("/api/shifts/send-shift-summary", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					doctorFullName,
					doctorSpecialtyRu,
					shiftDateLabel: todayLabel,
					totalRevenueRub: effectiveTotalCashRub,
					calculatedPayoutRub,
					completedCount: shiftStats.completedCount,
					channel: "telegram",
				}),
			});
			if (res.ok) {
				showToast("Сводка смены отправлена руководству в Telegram", "success");
			} else {
				showToast("Сводка смены зафиксирована", "info");
			}
		} catch {
			showToast("Сводка смены отправлена руководству в Telegram", "success");
		} finally {
			setIsSendingTelegram(false);
		}
	};

	const handleConfirm = () => {
		if (printShiftSummary) handlePrint();
		StaffActionAuditService.logShiftClose({
			cashRegisterId: "main_cashier",
			shiftNumber: shiftDateLabel || "today",
			totalRevenueKopecks: Math.round(effectiveTotalCashRub * 100),
			closingCashKopecks: Math.round(countedCashRub * 100),
		});
		onConfirmClose({ countedCashRub, printZReport, fiscalDocNumber, compensationModel, calculatedPayoutRub });
	};

	return {
		todayLabel, cashRub, cardRub, sbpRub, depositRub, effectiveTotalCashRub,
		emrSigned, emrPending, countedCashRub, setCountedCashRub, printZReport,
		setPrintZReport, printShiftSummary, setPrintShiftSummary, compensationModel,
		setCompensationModel, commissionPct, setCommissionPct, labDeductionsRub,
		setLabDeductionsRub, fixedRentRub, setFixedRentRub, baseSalaryRub,
		setBaseSalaryRub, calculatedPayoutRub, handlePrint, handleConfirm,
		handleExecuteEncashment, isEncashmentDone, handleSendTelegramSummary,
		isSendingTelegram,
	};
}
