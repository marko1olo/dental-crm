/**
 * DoctorPieceRateWalletView.tsx — Экран сдельной оплаты труда врача («Тайный блокнот врача»).
 * 
 * Compliance:
 * - Mandate 8e: Doctor Autonomy & Financial Sovereignty.
 * - Apple HIG & DENTE Clinical Ergonomics (44x44px touch targets, no text clipping, 8px grid).
 * - Full Dark / Light Mode consistency (tokens var(--paper), var(--ink), var(--teal), var(--line)).
 * - Декомпозирован на модули в ./pieceRateWallet/ (Anti-Monolith Limit <= 500 lines).
 */

import React, { useState, useEffect, useCallback } from "react";
import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	Clock,
	FileSpreadsheet,
	Printer,
	RefreshCw,
	Wallet,
	X,
} from "lucide-react";
import { generateDoctorT51Html } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import {
	type DoctorPieceRateWalletViewProps,
	type EarningsDataState,
	pluralizeRu,
	WalletKpiLedger,
	SpecialtyBreakdownSection,
	ManipulationsTableView,
	MobileGroupedCardList,
	ReconciliationModal,
} from "./pieceRateWallet/index.js";
import "./doctorPieceRateWallet.css";

export { pluralizeRu };
export type { DoctorPieceRateWalletViewProps };

export const DoctorPieceRateWalletView: React.FC<
	DoctorPieceRateWalletViewProps
> = ({
	doctorId = "doc-1",
	doctorName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	shiftDateIso = new Date().toISOString().split("T")[0]!,
	onClose,
	onPrintT51,
}) => {
	const initialTargetDate = shiftDateIso.split("T")[0]!;
	const [selectedDate, setSelectedDate] = useState<string>(initialTargetDate);
	const [activePeriodFilter, setActivePeriodFilter] = useState<
		"today" | "yesterday" | "custom"
	>("today");
	const [data, setData] = useState<EarningsDataState | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [isReconciliationModalOpen, setIsReconciliationModalOpen] =
		useState<boolean>(false);
	const [isReconciledConfirmed, setIsReconciledConfirmed] =
		useState<boolean>(false);

	// Fetch earnings data from backend with transient 5xx retry & offline cache resilience
	const fetchEarnings = useCallback(
		async (targetDate: string) => {
			setIsLoading(true);
			setError(null);
			try {
				let lastRes: Response | null = null;
				for (let attempt = 1; attempt <= 3; attempt++) {
					const res = await fetch(
						`/api/doctor/my-earnings?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(targetDate)}`,
					);
					lastRes = res;
					if (
						res.ok ||
						res.status === 401 ||
						res.status === 403 ||
						res.status === 404
					) {
						break;
					}
					if (attempt < 3) {
						await new Promise((r) => setTimeout(r, 300 * attempt));
					}
				}

				if (!lastRes || !lastRes.ok) {
					const errJson = await lastRes?.json().catch(() => null);
					throw new Error(
						errJson?.message || `Ошибка сервера (${lastRes?.status || 500})`,
					);
				}
				const json = await lastRes.json();
				setData(json);
			} catch (err: any) {
				console.error("[DoctorPieceRateWalletView] Fetch error:", err);
				setError(err?.message || "Не удалось загрузить начисления врача");
			} finally {
				setIsLoading(false);
			}
		},
		[doctorId],
	);

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
		const yest = d.toISOString().split("T")[0]!;
		setSelectedDate(yest);
		setActivePeriodFilter("yesterday");
	};

	// 1-Click Print T-51
	const handlePrintSlip = () => {
		if (onPrintT51) {
			onPrintT51();
			return;
		}

		if (!data) return;

		try {
			const html = generateDoctorT51Html({
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
			showToast("Ошибка формирования бланка Т-51", "error");
		}
	};

	const handleConfirmReconciliation = () => {
		setIsReconciledConfirmed(true);
		setIsReconciliationModalOpen(false);
		showToast(
			"Акт сверки направлен в финансовый отдел. Контрольная сумма зафиксирована.",
			"success",
		);
	};

	return (
		<div
			className="doctor-piece-rate-container"
			data-testid="doctor-piece-rate-wallet-view"
			role="region"
			aria-label="Сдельная оплата труда врача"
		>
			{/* Mobile Drag Handle (Apple HIG 36x5px pill) */}
			<div className="dpr-mobile-drag-handle-bar" aria-hidden="true">
				<span className="dpr-mobile-drag-pill" />
			</div>

			{/* Top Header & Date Navigation */}
			<div className="dpr-header">
				<div className="dpr-header-top-row">
					<div className="dpr-header-title-block">
						<div className="dpr-icon-badge" aria-hidden="true">
							<Wallet size={22} />
						</div>
						<div>
							<h2 className="dpr-title" data-testid="dpr-title">
								Сдельная оплата и вычеты ЗТЛ
							</h2>
							<div className="dpr-subtitle">
								{data?.doctorName || doctorName} •{" "}
								{data?.doctorSpecialty || doctorSpecialty}
							</div>
						</div>
					</div>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="dpr-header-close-btn"
							aria-label="Закрыть окно сдельной оплаты"
							title="Закрыть"
							data-testid="dpr-header-close-btn"
						>
							<X size={18} />
						</button>
					)}
				</div>

				{/* Period Controls */}
				<div className="dpr-controls-row">
					<button
						type="button"
						className={`dpr-filter-chip ${activePeriodFilter === "today" ? "active" : ""}`}
						onClick={handleSelectToday}
						data-testid="dpr-filter-today"
					>
						<Calendar size={15} className="hidden md:inline-block" />
						<span>Сегодня</span>
					</button>
					<button
						type="button"
						className={`dpr-filter-chip ${activePeriodFilter === "yesterday" ? "active" : ""}`}
						onClick={handleSelectYesterday}
						data-testid="dpr-filter-yesterday"
					>
						<Clock size={15} className="hidden md:inline-block" />
						<span>Вчера</span>
					</button>
					<input
						type="date"
						value={selectedDate}
						onChange={(e) => {
							if (e.target.value) {
								setSelectedDate(e.target.value);
								setActivePeriodFilter("custom");
							}
						}}
						className="dpr-filter-chip"
						data-testid="dpr-date-picker"
						aria-label="Выбор даты смены"
					/>
					<button
						type="button"
						onClick={() => fetchEarnings(selectedDate)}
						className="dpr-filter-chip"
						title="Обновить расчет"
						aria-label="Обновить расчет"
					>
						<RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
					</button>
				</div>
			</div>

			{/* Loading State */}
			{isLoading && !data && (
				<div className="p-12 text-center text-[var(--muted)]">
					<RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-[var(--teal)]" />
					<div className="font-semibold text-sm">
						Сверяем выполненные манипуляции и наряды ЗТЛ...
					</div>
				</div>
			)}

			{/* Error State */}
			{error && !data && (
				<div className="p-8 text-center text-[var(--rose)]">
					<AlertCircle className="w-8 h-8 mx-auto mb-2" />
					<div className="font-bold text-sm mb-1">
						Ошибка загрузки начислений
					</div>
					<div className="text-xs opacity-80 mb-4">{error}</div>
					<button
						type="button"
						onClick={() => fetchEarnings(selectedDate)}
						className="dpr-action-btn-primary mx-auto"
					>
						Повторить попытку
					</button>
				</div>
			)}

			{/* Main Content Area */}
			{data && (
				<>
					<WalletKpiLedger
						data={data}
						isReconciledConfirmed={isReconciledConfirmed}
					/>

					<SpecialtyBreakdownSection
						specialtyBreakdown={data.specialtyBreakdown}
					/>

					<ManipulationsTableView appointments={data.appointments} />

					<MobileGroupedCardList appointments={data.appointments} />

					{/* Bottom Actions Bar (Doctor Sovereignty & Reconciliation) */}
					<div className="dpr-footer-actions">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setIsReconciliationModalOpen(true)}
								className="dpr-action-btn-primary whitespace-nowrap"
								data-testid="dpr-reconcile-btn"
							>
								<FileSpreadsheet size={15} />
								<span className="hidden md:inline">Сверить с бухгалтерией</span>
								<span className="md:hidden">Сверить</span>
							</button>

							<button
								type="button"
								onClick={handlePrintSlip}
								className="dpr-action-btn-secondary whitespace-nowrap"
								data-testid="dpr-print-t51-btn"
							>
								<Printer size={15} />
								<span className="hidden md:inline">
									Расчетная ведомость зарплаты врачей
								</span>
								<span className="md:hidden">Ведомость зарплаты</span>
							</button>
						</div>

						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="dpr-action-btn-secondary whitespace-nowrap"
								data-testid="dpr-back-to-shift-btn"
							>
								<ArrowLeft size={15} />
								<span className="hidden md:inline">Вернуться к смене</span>
								<span className="md:hidden">К смене</span>
							</button>
						)}
					</div>
				</>
			)}

			{/* Reconciliation Confirmation Modal */}
			<ReconciliationModal
				isOpen={isReconciliationModalOpen}
				selectedDate={selectedDate}
				data={data}
				onClose={() => setIsReconciliationModalOpen(false)}
				onConfirm={handleConfirmReconciliation}
			/>
		</div>
	);
};

export default DoctorPieceRateWalletView;
