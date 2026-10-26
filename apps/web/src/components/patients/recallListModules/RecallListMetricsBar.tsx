/**
 * RecallListMetricsBar.tsx
 * Top metric filter pills and active filter banner for recall groups.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import React from "react";
import type { RecallBand, RecallReport } from "@dental/shared";
import { BAND_TITLES } from "./recallListTypes";

export interface RecallListMetricsBarProps {
	readonly report: RecallReport;
	readonly activeBand: RecallBand | null;
	readonly onSelectBand: (band: RecallBand | null) => void;
	readonly onResetLimit: () => void;
}

export function RecallListMetricsBar({ report, activeBand, onSelectBand, onResetLimit }: RecallListMetricsBarProps) {
	return (
		<>
			<ul className="ops-metrics">
				{(Object.keys(BAND_TITLES) as RecallBand[])
					.filter((band) => (report.byBand?.[band] ?? 0) > 0)
					.map((band) => (
						<li key={band}>
							<button
								type="button"
								className={`ops-metric ops-metric--button ${band === "due" ? "ops-metric--primary" : ""} ${activeBand === band ? "ops-metric--selected" : ""}`}
								aria-pressed={activeBand === band}
								onClick={() => {
									onSelectBand(activeBand === band ? null : band);
									onResetLimit();
								}}
							>
								<span className="ops-metric__value">{report.byBand?.[band] ?? 0}</span>
								<span className="ops-metric__label">{BAND_TITLES[band]}</span>
							</button>
						</li>
					))}
			</ul>

			{activeBand && (
				<p className="ops-hint">
					Показана одна группа: «{BAND_TITLES[activeBand]}».{" "}
					<button
						className="link-button"
						type="button"
						onClick={() => {
							onSelectBand(null);
							onResetLimit();
						}}
					>
						Показать всех
					</button>
				</p>
			)}
		</>
	);
}
