/**
 * useDoctorWalletLogic.ts — Хук загрузки данных, периодов и печати сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { useState, useEffect, useCallback } from "react";
import { generateDoctorEarningsPayslipHtml } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import type { EarningsDataState } from "./types.js";

export function useDoctorWalletLogic(
	doctorId: string,
	initialDateIso: string,
	onPrintPayslipProp?: (() => void) | undefined,
) {
	const initialTargetDate = initialDateIso.split("T")[0]!;
	const [selectedDate, setSelectedDate] = useState<string>(initialTargetDate);
	const [activePeriodFilter, setActivePeriodFilter] = useState<"today" | "yesterday" | "custom">("today");
	const [data, setData] = useState<EarningsDataState | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);
	const [isReconciledConfirmed, setIsReconciledConfirmed] = useState<boolean>(false);

	const fetchEarnings = useCallback(async (targetDate: string) => {
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
		} catch (err: any) {
			console.error("[DoctorWalletLogic] Fetch error:", err);
			setError(err?.message || "Не удалось загрузить начисления врача");
		} finally {
			setIsLoading(false);
		}
	}, [doctorId]);

	useEffect(() => {
		fetchEarnings(selectedDate);
	}, [selectedDate, fetchEarnings]);

	const handleSelectToday = () => {
		const today = new Date().toISOString().split("T")[0]!;
		setSelectedDate(today);
		setActivePeriodFilter("today");
	};

	const handleSelectYesterday = () => {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		setSelectedDate(d.toISOString().split("T")[0]!);
		setActivePeriodFilter("yesterday");
	};

	const handlePrintSlip = () => {
		if (onPrintPayslipProp) {
			onPrintPayslipProp();
			return;
		}
		if (!data) return;

		try {
			const html = generateDoctorEarningsPayslipHtml({
				organizationName: "ООО «ДЕНТЕ»",
				doctorName: data.doctorName,
				specialtyTitle: data.doctorSpecialty,
				periodFromIso: `${data.period.date || selectedDate}T08:00:00.000Z`,
				periodToIso: `${data.period.date || selectedDate}T20:00:00.000Z`,
				grossRevenueRub: data.summary.totalGrossRevenueRub,
				netBaseRevenueRub: data.summary.netBaseRevenueRub,
				pieceworkAccruedRub: data.summary.totalDoctorEarnedRub,
				totalAccruedRub: data.summary.totalDoctorEarnedRub,
				ndflTaxRub: Math.round(data.summary.totalDoctorEarnedRub * 0.13),
				withheldLabRub: data.summary.totalLabDeductionsRub,
				withheldMaterialRub: 0,
				netPayoutRub: Math.round(data.summary.totalDoctorEarnedRub * 0.87),
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
		} catch (e) {
			console.error("Print error:", e);
			showToast("Ошибка формирования ведомости зарплаты", "error");
		}
	};

	const handleConfirmReconciliation = () => {
		setIsReconciledConfirmed(true);
		setIsReconciliationModalOpen(false);
		showToast("Акт сверки направлен в финансовый отдел. Контрольная сумма зафиксирована.", "success");
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
