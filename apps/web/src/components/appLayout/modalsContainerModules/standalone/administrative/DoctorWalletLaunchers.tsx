/**
 * DoctorWalletLaunchers — Мобильный кошелек и выплаты врача (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { DEMO_SHOWCASE_DOCTOR } from "../../../../finance/doctorPayoutWallet/types";

const DoctorPayoutMobileWallet = lazyWithRetry(() =>
	import("../../../../finance/DoctorPayoutMobileWallet").then((m) => ({
		default: m.DoctorPayoutMobileWallet,
	})),
);

export function renderDoctorWalletLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (s.includes("wallet") || s.includes("payout") || h.includes("wallet") || h.includes("payout")) {
		const dummyReport = {
			period: { from: "2026-10-01", to: "2026-10-31" },
			rows: [DEMO_SHOWCASE_DOCTOR],
			totals: {
				totalRevenueRub: 184000,
				totalAccruedRub: 55200,
				totalWithheldMaterialRub: 0,
				totalWithheldLabRub: 0,
				totalPayoutRub: 55200,
				totalVisitsCount: 3,
				totalPaymentsCount: 3,
				totalDoctorsCount: 1,
			},
		};

		return (
			<Suspense fallback={<AppLoadingState message="Загрузка кошелька врача..." />}>
				<div
					className="w-full min-h-screen bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] p-2 sm:p-4 overflow-y-auto"
					data-testid="doctor-wallet-standalone-workspace"
				>
					<DoctorPayoutMobileWallet
						report={dummyReport as any}
						month="2026-10"
						onMonthChange={() => {}}
						onRefresh={() => {}}
						onOpenPayrollModal={() => {}}
						canEditRates={false}
						isLoading={false}
					/>
				</div>
			</Suspense>
		);
	}

	return null;
}
