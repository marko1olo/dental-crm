/**
 * ShiftHudPayoutBanner.tsx — Баннер начисления к выплате за смену.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import type { ChairsideShiftEarningsSummary } from "../doctorShiftEarnings.js";

export interface ShiftHudPayoutBannerProps {
	readonly summary: ChairsideShiftEarningsSummary;
}

export const ShiftHudPayoutBanner: React.FC<ShiftHudPayoutBannerProps> = ({ summary }) => {
	return (
		<div className="doctor-shift-hud-payout-banner" data-testid="hud-payout-banner">
			<div className="flex flex-col">
				<span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-300">
					Начислено к выплате за смену
				</span>
				<span className="text-xl font-black font-mono text-emerald-900 dark:text-emerald-100">
					{summary.formattedEarnedPayout}
				</span>
			</div>
			<div className="text-right flex flex-col items-end">
				<span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400">
					Ставка врача: {summary.doctorCommissionPercent}%
				</span>
				<span className="text-[10px] text-[var(--muted)] font-mono">
					{summary.patientsCompletedCount} из {summary.patientsTotalCount} пац. завершено
				</span>
			</div>
		</div>
	);
};
