/**
 * useDoctorWalletLogic.ts — Хук загрузки данных, периодов и печати сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { useState, useEffect, useCallback } from "react";
import { calculateProgressiveNdflTax, generateDoctorEarningsPayslipHtml, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { useDocumentBrandingStore } from "../../../store/documentBrandingStore";
import { closeSettlementPeriodApi } from "../../payroll/closeSettlementPeriodApi.js";
import type { EarningsDataState } from "./types.js";

export function useDoctorWalletLogic(
	doctorId: string,
	initialDateIso: string,
	onPrintPayslipProp?: (() => void) | undefined,
) {
	const initialTargetDate = initialDateIso.split("T")[0] ?? initialDateIso;
	const [selectedDate, setSelectedDate] = useState<string>(initialTargetDate);
	const [activePeriodFilter, setActivePeriodFilter] = useState<"today" | "yesterday" | "custom">("today");
	const [data, setData] = useState<EarningsDataState | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);
	const [isReconciledConfirmed, setIsReconciledConfirmed] = useState<boolean>(false);

	const fetchEarnings = useCallback(async (targetDate: string) => {
		if (!doctorId) {
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		setError(null);
		try {
			let lastRes: Response | null = null;
			for (let attempt = 1; attempt <= 3; attempt++) {
				const res = await fetch(`/api/doctor/my-earnings?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(targetDate)}`);
				lastRes = res;
				if (res.ok || res.status === 401 || res.status === 403 || res.status === 404) break;
				if (attempt < 3) await new Promise((r) => setTimeout(r, 300 * attempt));
			}

			if (!lastRes || !lastRes.ok) {
				const errJson = await lastRes?.json().catch(() => null);
				throw new Error(errJson?.message || `Ошибка сервера (${lastRes?.status || 500})`);
			}
			const json = await lastRes.json();
			setData(json);
		} catch (err: unknown) {
			console.error("[DoctorWalletLogic] Fetch error:", err);
			const message = err instanceof Error ? err.message : "Не удалось загрузить начисления врача";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, [doctorId]);

	useEffect(() => {
		fetchEarnings(selectedDate);
	}, [selectedDate, fetchEarnings]);

	const handleSelectToday = () => {
		const today = new Date().toISOString().split("T")[0] ?? "";
		setSelectedDate(today);
		setActivePeriodFilter("today");
	};

	const handleSelectYesterday = () => {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		setSelectedDate(d.toISOString().split("T")[0] ?? "");
		setActivePeriodFilter("yesterday");
	};

	const handlePrintSlip = () => {
		if (onPrintPayslipProp) {
			onPrintPayslipProp();
			return;
		}
		if (!data) return;

		try {
			const earnedKop = data.summary.totalDoctorEarnedKop ?? rublesToKopecks(data.summary.totalDoctorEarnedRub);
			const ndflKop = calculateProgressiveNdflTax(earnedKop).ndflTaxKop;
			const netPayoutKop = Math.max(0, earnedKop - ndflKop);

			const clinicName = useDocumentBrandingStore.getState().clinicName || "Стоматологическая клиника";
			const html = generateDoctorEarningsPayslipHtml({
				organizationName: clinicName,
				doctorName: data.doctorName,
				specialtyTitle: data.doctorSpecialty,
				periodFromIso: `${data.period.date || selectedDate}T08:00:00.000Z`,
				periodToIso: `${data.period.date || selectedDate}T20:00:00.000Z`,
				grossRevenueRub: data.summary.totalGrossRevenueRub,
				netBaseRevenueRub: data.summary.netBaseRevenueRub,
				pieceworkAccruedRub: data.summary.totalDoctorEarnedRub,
				totalAccruedRub: data.summary.totalDoctorEarnedRub,
				ndflTaxRub: kopecksToRubles(ndflKop),
				withheldLabRub: data.summary.totalLabDeductionsRub,
				withheldMaterialRub: data.summary.totalMaterialDeductionsRub,
				netPayoutRub: kopecksToRubles(netPayoutKop),
			});

			const printWindow = window.open("", "_blank");
			if (printWindow) {
				printWindow.document.write(html);
				printWindow.document.close();
				printWindow.focus();
				setTimeout(() => printWindow.print(), 250);
			} else {
				showToast("Всплывающее окно заблокировано браузером", "error");
			}
		} catch (e: unknown) {
			console.error("Print error:", e);
			showToast("Ошибка формирования ведомости зарплаты", "error");
		}
	};

	const handleConfirmReconciliation = async () => {
		if (!data) return;
		try {
			const earnedKop = data.summary.totalDoctorEarnedKop ?? rublesToKopecks(data.summary.totalDoctorEarnedRub);
			const ndflKop = calculateProgressiveNdflTax(earnedKop).ndflTaxKop;
			const netPayoutKop = Math.max(0, earnedKop - ndflKop);

			await closeSettlementPeriodApi({
				doctorId: data.doctorId || doctorId,
				periodStart: data.period.from || selectedDate,
				periodEnd: data.period.to || selectedDate,
				payoutModel: "percentage",
				grossRevenueKop: data.summary.totalGrossRevenueKop ?? rublesToKopecks(data.summary.totalGrossRevenueRub),
				labCostKop: data.summary.totalLabDeductionsKop ?? rublesToKopecks(data.summary.totalLabDeductionsRub),
				materialCostKop: data.summary.totalMaterialDeductionsKop ?? rublesToKopecks(data.summary.totalMaterialDeductionsRub),
				netBaseKop: data.summary.netBaseRevenueKop ?? rublesToKopecks(data.summary.netBaseRevenueRub),
				categoryPercent: data.summary.averageCommissionPercent || 25,
				totalAccruedKop: earnedKop,
				ndflKop,
				netPayoutKop,
				markPaid: false,
				doctorReconciled: true,
			});

			setIsReconciledConfirmed(true);
			setIsReconciliationModalOpen(false);
			showToast("Акт сверки зафиксирован и направлен в финансовый отдел.", "success");
			await fetchEarnings(selectedDate);
		} catch (err: unknown) {
			console.error("[DoctorWalletLogic] Settle period error:", err);
			const message = err instanceof Error ? err.message : "Не удалось зафиксировать акт сверки";
			showToast(message, "error");
		}
	};

	return {
		selectedDate,
		setSelectedDate,
		activePeriodFilter,
		setActivePeriodFilter,
		data,
		isLoading,
		error,
		isReconciliationModalOpen,
		setIsReconciliationModalOpen,
		isReconciledConfirmed,
		fetchEarnings,
		handleSelectToday,
		handleSelectYesterday,
		handlePrintSlip,
		handleConfirmReconciliation,
	};
}
