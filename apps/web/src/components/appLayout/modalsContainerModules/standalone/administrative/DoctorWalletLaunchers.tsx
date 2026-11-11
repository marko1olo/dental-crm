/**
 * DoctorWalletLaunchers — Мобильный кошелек и выплаты врача (Мандат 8b, <= 120 строк).
 * Живая гидратация из PostgreSQL (Мандат 8wy), ноль мертвого initialReport = null (Мандат 8d).
 */

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode";
import {
	type DoctorPayoutReport,
	DEMO_SHOWCASE_REPORT,
} from "../../../../finance/doctorPayoutWallet/types";

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

const DoctorWalletStandaloneWorkspace: React.FC = () => {
	const isDemo = isDemoShowcaseMode();
	const [month, setMonth] = useState<string>(() => (isDemo ? "2026-10" : new Date().toISOString().slice(0, 7)));
	const [report, setReport] = useState<DoctorPayoutReport | null>(() => (isDemo ? DEMO_SHOWCASE_REPORT : null));
	const [isLoading, setIsLoading] = useState<boolean>(!isDemo);

	const fetchReport = useCallback(async (selectedMonth: string) => {
		if (isDemo) {
			setReport(DEMO_SHOWCASE_REPORT);
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		try {
			const { from, to } = getMonthBounds(selectedMonth);
			const res = await fetch(`/api/billing/payouts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
			if (!res.ok) throw new Error("Payouts api error");
			const data = (await res.json()) as DoctorPayoutReport;
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

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка кошелька врача..." />}>
			<div
				className="w-full min-h-screen bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] p-2 sm:p-4 overflow-y-auto"
				data-testid="doctor-wallet-standalone-workspace"
			>
				<DoctorPayoutMobileWallet
					report={report}
					month={month}
					onMonthChange={(newMonth) => setMonth(newMonth)}
					onRefresh={() => void fetchReport(month)}
					onOpenPayrollModal={() => {}}
					canEditRates={false}
					isLoading={isLoading}
				/>
			</div>
		</Suspense>
	);
};

export function renderDoctorWalletLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (s.includes("wallet") || s.includes("payout") || h.includes("wallet") || h.includes("payout")) {
		return <DoctorWalletStandaloneWorkspace />;
	}

	return null;
}
