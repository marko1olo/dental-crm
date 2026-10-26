/**
 * ImagingSafetyDiagnostics.tsx — Блок контроля безопасности нижнечелюстного канала и HU
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Activity, ShieldAlert } from "lucide-react";

interface Props {
	nerveDistanceMm?: number | null | undefined;
	boneDensityHU?: number | null | undefined;
}

export const ImagingSafetyDiagnostics: React.FC<Props> = ({
	nerveDistanceMm,
	boneDensityHU,
}) => {
	if (typeof nerveDistanceMm !== "number" && typeof boneDensityHU !== "number") {
		return null;
	}

	const hasNerveWarning = typeof nerveDistanceMm === "number" && nerveDistanceMm < 2.0;

	return (
		<div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--line)]">
			{typeof nerveDistanceMm === "number" && (
				<div
					className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] font-medium ${
						hasNerveWarning
							? "bg-red-500/10 text-red-600 border border-red-500/20"
							: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
					}`}
				>
					<div className="flex items-center gap-1.5">
						{hasNerveWarning ? (
							<ShieldAlert size={13} className="shrink-0 text-red-500" />
						) : (
							<Activity size={13} className="shrink-0" />
						)}
						<span>Нижнечелюстной канал:</span>
					</div>
					<strong className="font-mono">
						{nerveDistanceMm.toFixed(1)} мм {hasNerveWarning ? "(Опасно!)" : "(Безопасно)"}
					</strong>
				</div>
			)}

			{typeof boneDensityHU === "number" && (
				<div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[var(--paper)] border border-[var(--line)] text-[11px]">
					<span className="text-[var(--muted)]">Плотность кости (Хаунсфилд):</span>
					<strong className="font-mono text-[var(--ink)]">{boneDensityHU} HU</strong>
				</div>
			)}
		</div>
	);
};
