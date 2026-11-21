/**
 * DoctorWalletLaunchers — Мобильный кошелек и выплаты врача (Мандат 8b, <= 180 строк).
 * Живая гидратация из PostgreSQL (Мандат 8wy), ноль мертвого initialReport = null (Мандат 8d).
 * Единый канонический SSOT автономного лончера и модального кошелька (Мандат 8bf).
 */

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { kopecksToRubles } from "@dental/shared";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode";
import { DoctorPayrollStudioModal } from "../../../../payroll/DoctorPayrollStudioModal";
import {
	type DoctorPayoutReport,
	DEMO_SHOWCASE_REPORT,
} from "../../../../finance/doctorPayoutWallet/types";
import {
	canonicalPayrollToWalletReport,
	type CanonicalPayrollApiResponse,
} from "../../../../finance/doctorPayoutWallet/canonicalPayrollAdapter";
import { showToast } from "../../../../GlobalToast";

const DoctorPayoutMobileWallet = lazyWithRetry(() =>
	import("../../../../finance/doctorPayoutWallet/DoctorPayoutMobileWallet").then((m) => ({
		default: m.DoctorPayoutMobileWallet,
	})),
);

function getMonthBounds(monthStr: string): { from: string; to: string } {
	const [year, month] = monthStr.split("-").map(Number);
	const y = year || new Date().getFullYear();
	const m = (month || 1) - 1;
	const firstDay = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
	const lastDay = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
	return { from: firstDay.toISOString(), to: lastDay.toISOString() };
}

function checkWalletUrlActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("wallet") ||
		h.includes("wallet") ||
		h.includes("doctor-wallet") ||
		s.includes("doctor_wallet") ||
		s.includes("payout") ||
		h.includes("payout")
	);
}

export const DoctorWalletStandaloneWorkspace: React.FC<{ readonly onClose?: () => void }> = ({ onClose }) => {
	const isDemo = isDemoShowcaseMode();
	const [month, setMonth] = useState<string>(() => (isDemo ? "2026-10" : new Date().toISOString().slice(0, 7)));
	const [report, setReport] = useState<DoctorPayoutReport | null>(() => (isDemo ? DEMO_SHOWCASE_REPORT : null));
	const [isLoading, setIsLoading] = useState<boolean>(!isDemo);
	const [isPayrollStudioOpen, setIsPayrollStudioOpen] = useState<boolean>(false);
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(undefined);

	const fetchReport = useCallback(async (selectedMonth: string) => {
		if (isDemo) {
			setReport(DEMO_SHOWCASE_REPORT);
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		try {
			const { from, to } = getMonthBounds(selectedMonth);
			const startDate = from.slice(0, 10);
			const endDate = to.slice(0, 10);
			const res = await fetch(`/api/v1/payroll/calculations?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
			if (!res.ok) throw new Error("Payroll calculations api error");
			const rawData = (await res.json()) as CanonicalPayrollApiResponse;
			const data = canonicalPayrollToWalletReport(rawData, { from: startDate, to: endDate });
			setReport(data);
		} catch {
			// Честный пустой отчет при отсутствии данных за месяц (Мандаты 8k, 8wy)
			setReport({
				scope: "all",
				period: { from: `${selectedMonth}-01`, to: `${selectedMonth}-28` },
				rows: [],
				totals: {
					revenueRub: 0,
					paymentCount: 0,
					attributableRevenueRub: 0,
					unattributedRevenueRub: 0,
					materialCostRub: 0,
					accruedRub: 0,
					withheldMaterialRub: 0,
					payoutRub: 0,
					doctorsCounted: 0,
					doctorsWithoutRate: 0,
				},
				methodNote: "Фактические начисления по базе данных",
				limitations: [],
				isEmpty: true,
			});
		} finally {
			setIsLoading(false);
		}
	}, [isDemo]);

	useEffect(() => {
		void fetchReport(month);
	}, [fetchReport, month]);

	const handleClose = () => {
		if (onClose) {
			onClose();
			return;
		}
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("wallet");
			url.searchParams.delete("doctor_wallet");
			url.searchParams.delete("payout");
			const cleanHash = window.location.hash.replace(/#wallet|#doctor-wallet|#payout/g, "");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
			window.dispatchEvent(new Event("hashchange"));
		}
	};

	return (
		<div
			id="direct-doctor-wallet-overlay"
			data-testid="doctor-wallet-standalone-workspace"
			className="fixed inset-0 z-[9999] bg-[var(--canvas,#ffffff)]/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 flex flex-col"
			role="dialog"
			aria-modal="true"
			aria-label="Мобильный расчётный кошелёк врача"
		>
			<div className="max-w-md w-full mx-auto flex-1 flex flex-col">
				<div className="flex items-center justify-between pb-2 border-b border-[var(--line)] mb-3">
					<div className="flex items-center gap-2">
						<span className="w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)]" />
						<span className="text-xs font-semibold tracking-wide text-[var(--muted)]">
							Кошелёк начислений врача
						</span>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
						aria-label="Закрыть кошелёк"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<div className="flex-1">
					<Suspense fallback={<AppLoadingState message="Загрузка кошелька врача..." />}>
						<DoctorPayoutMobileWallet
							report={report}
							month={month}
							onMonthChange={(newMonth) => setMonth(newMonth)}
							onRefresh={() => void fetchReport(month)}
							onOpenPayrollModal={(doc) => {
								setSelectedDoctorId(doc.doctorUserId);
								setIsPayrollStudioOpen(true);
							}}
							canEditRates={false}
							isLoading={isLoading}
							onRequestPayout={(doc, amountKop) => {
								setSelectedDoctorId(doc.doctorUserId);
								setIsPayrollStudioOpen(true);
								showToast(`Открыта ведомость выплаты: ${doc.doctorName} (${kopecksToRubles(amountKop).toLocaleString("ru-RU")} ₽)`, "success");
							}}
						/>
					</Suspense>
				</div>
				{isPayrollStudioOpen && (
					<DoctorPayrollStudioModal
						isOpen={isPayrollStudioOpen}
						onClose={() => setIsPayrollStudioOpen(false)}
						initialDoctorId={selectedDoctorId}
					/>
				)}
			</div>
		</div>
	);
};

export const DirectDoctorWalletLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkWalletUrlActive());

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-doctor-wallet", handleOpen);
		window.addEventListener("dente:open-doctor-wallet", handleOpen);

		const handleHashChange = () => {
			setIsOpen(checkWalletUrlActive());
		};
		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);

		return () => {
			window.removeEventListener("dente-open-doctor-wallet", handleOpen);
			window.removeEventListener("dente:open-doctor-wallet", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	return <DoctorWalletStandaloneWorkspace onClose={() => setIsOpen(false)} />;
};

export function renderDoctorWalletLaunchers(): React.ReactElement | null {
	if (!checkWalletUrlActive()) return null;
	return <DoctorWalletStandaloneWorkspace />;
}
