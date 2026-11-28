/**
 * useDoctorWalletLogic.ts — Хук загрузки данных, периодов и печати сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
	calculateProgressiveNdflTax,
	generateDoctorEarningsPayslipHtml,
	kopecksToRubles,
	rublesToKopecks,
	type CashAdvanceAllocationPolicy,
	type IdentSalaryModel,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { useDocumentBrandingStore } from "../../../store/documentBrandingStore";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { closeSettlementPeriodApi } from "../../payroll/closeSettlementPeriodApi.js";
import type { EarningsDataState } from "./types.js";

function toLocalYmd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function useDoctorWalletLogic(
	doctorId: string,
	initialDateIso: string,
	onPrintPayslipProp?: (() => void) | undefined,
) {
	const initialTargetDate = initialDateIso.split("T")[0] ?? initialDateIso;
	const [selectedDate, setSelectedDate] = useState<string>(initialTargetDate);
	const [activePeriodFilter, setActivePeriodFilter] = useState<"today" | "yesterday" | "custom">("today");
	const [identSalaryModel, setIdentSalaryModel] = useState<IdentSalaryModel>("net_proportional_discount");
	const [cashAdvancePolicy, setCashAdvancePolicy] = useState<CashAdvanceAllocationPolicy>("proportional");
	const [data, setData] = useState<EarningsDataState | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState<boolean>(false);
	const [isReconciledConfirmed, setIsReconciledConfirmed] = useState<boolean>(false);
	const fetchAbortRef = useRef<AbortController | null>(null);

	const fetchEarnings = useCallback(async (
		targetDate: string,
		salaryModel: IdentSalaryModel = identSalaryModel,
		advancePolicy: CashAdvanceAllocationPolicy = cashAdvancePolicy,
	) => {
		if (!doctorId) {
			setIsLoading(false);
			return;
		}
		fetchAbortRef.current?.abort();
		const controller = new AbortController();
		fetchAbortRef.current = controller;
		setIsLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({
				doctorId,
				date: targetDate,
				identSalaryModel: salaryModel,
				cashAdvancePolicy: advancePolicy,
			});
			let lastRes: Response | null = null;
			for (let attempt = 1; attempt <= 3; attempt++) {
				if (controller.signal.aborted) return;
				const res = await fetch(`/api/doctor/my-earnings?${params.toString()}`, {
					headers: getDenteAuthHeaders(),
					signal: controller.signal,
				});
				lastRes = res;
				if (res.ok || res.status === 401 || res.status === 403 || res.status === 404) break;
				if (attempt < 3) await new Promise((r) => setTimeout(r, 300 * attempt));
			}

			if (controller.signal.aborted) return;
			if (!lastRes || !lastRes.ok) {
				let errJson: { message?: string } | null = null;
				if (lastRes) {
					try {
						errJson = (await lastRes.json()) as { message?: string } | null;
					} catch (parseErr) {
						clientLogger.warn("[DoctorWalletLogic] Error JSON parse failed", {
							status: lastRes.status,
							error: String(parseErr),
						});
					}
				}
				throw new Error(errJson?.message || `Ошибка сервера (${lastRes?.status || 500})`);
			}
			const json = (await lastRes.json()) as unknown;
			const payload = (json != null && typeof json === "object" && "data" in json && json.data
				? (json as { data: EarningsDataState }).data
				: json) as EarningsDataState;
			if (!controller.signal.aborted) {
				setData(payload);
			}
		} catch (err: unknown) {
			if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
				return;
			}
			clientLogger.error("[DoctorWalletLogic] Fetch error:", err);
			const message = err instanceof Error ? err.message : "Не удалось загрузить начисления врача";
			setError(message);
		} finally {
			if (!controller.signal.aborted) {
				setIsLoading(false);
			}
		}
	}, [doctorId, identSalaryModel, cashAdvancePolicy]);

	useEffect(() => {
		void fetchEarnings(selectedDate, identSalaryModel, cashAdvancePolicy);
		return () => {
			fetchAbortRef.current?.abort();
		};
	}, [selectedDate, identSalaryModel, cashAdvancePolicy, fetchEarnings]);

	const handleSelectToday = () => {
		const today = toLocalYmd(new Date());
		setSelectedDate(today);
		setActivePeriodFilter("today");
	};

	const handleSelectYesterday = () => {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		setSelectedDate(toLocalYmd(d));
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
			const isSelfEmployedOrRental = data.summary.taxRegime === "self_employed" || data.summary.payoutModel === "chair_rental";
			const ndflKop = isSelfEmployedOrRental ? 0 : calculateProgressiveNdflTax(earnedKop).ndflTaxKop;
			const priorDebtDeductedKop = data.summary.priorDebtDeductedKop ?? 0;
			const netPayoutKop = data.summary.netPayoutToDoctorKop ?? Math.max(0, earnedKop - ndflKop - priorDebtDeductedKop);

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
			clientLogger.error("Print error:", e);
			showToast("Ошибка формирования ведомости зарплаты", "error");
		}
	};

	const handleConfirmReconciliation = async () => {
		if (!data) return;
		try {
			const earnedKop = data.summary.totalDoctorEarnedKop ?? rublesToKopecks(data.summary.totalDoctorEarnedRub);
			const isSelfEmployedOrRental = data.summary.taxRegime === "self_employed" || data.summary.payoutModel === "chair_rental";
			const ndflKop = isSelfEmployedOrRental ? 0 : calculateProgressiveNdflTax(earnedKop).ndflTaxKop;
			const priorDebtDeductedKop = data.summary.priorDebtDeductedKop ?? 0;
			const netPayoutKop = data.summary.netPayoutToDoctorKop ?? Math.max(0, earnedKop - ndflKop - priorDebtDeductedKop);

			await closeSettlementPeriodApi({
				doctorId: data.doctorId || doctorId,
				periodStart: data.period.from || selectedDate,
				periodEnd: data.period.to || selectedDate,
				payoutModel: data.summary.payoutModel === "chair_rental" ? "chair_rental" : "percentage",
				identSalaryModel,
				cashAdvancePolicy,
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
			await fetchEarnings(selectedDate, identSalaryModel, cashAdvancePolicy);
		} catch (err: unknown) {
			clientLogger.error("[DoctorWalletLogic] Settle period error:", err);
			const message = err instanceof Error ? err.message : "Не удалось зафиксировать акт сверки";
			showToast(message, "error");
		}
	};

	return {
		selectedDate,
		setSelectedDate,
		activePeriodFilter,
		setActivePeriodFilter,
		identSalaryModel,
		setIdentSalaryModel,
		cashAdvancePolicy,
		setCashAdvancePolicy,
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
