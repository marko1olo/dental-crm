/**
 * @file CabinetReadinessActions.tsx
 * @description Layer 4: Verdict banner, operator sign-off and submit CTA for Cabinet Readiness.
 */

import { Award, Check } from "lucide-react";
import React from "react";
import { CabinetReadinessSignInputs } from "./CabinetReadinessSignInputs";
import { CabinetReadinessVerdictCard } from "./CabinetReadinessVerdictCard";
import type { CabinetReadinessActionsProps } from "./types";

export function CabinetReadinessActions({
	isFullyReady,
	statusMessageRu,
	missingItems,
	nurseName,
	setNurseName,
	notes,
	setNotes,
	onSaveChecklist,
	onStartAppointmentPaperLogNorm,
	onQuickFillAllReady,
}: CabinetReadinessActionsProps) {
	return (
		<div className="cabinet-readiness-actions-wrap" style={{ marginTop: "0.75rem" }}>
			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "1rem 1.15rem",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h3
						style={{
							fontSize: "0.95rem",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							marginBottom: "0.75rem",
							color: "var(--brand-primary, #2563eb)",
						}}
					>
						<Award size={18} /> Шаг 3: Статус готовности и фиксация
					</h3>

					<CabinetReadinessVerdictCard
						isFullyReady={isFullyReady}
						statusMessageRu={statusMessageRu}
						missingItems={missingItems}
						onStartAppointmentPaperLogNorm={onStartAppointmentPaperLogNorm}
						onQuickFillAllReady={onQuickFillAllReady}
					/>

					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
						<CabinetReadinessSignInputs
							nurseName={nurseName}
							setNurseName={setNurseName}
							notes={notes}
							setNotes={setNotes}
						/>

						<button
							type="button"
							onClick={onSaveChecklist}
							className="sanpin-btn sanpin-btn-primary"
							style={{
								flex: "0 0 auto",
								minHeight: "44px",
								padding: "0.55rem 1.35rem",
								fontSize: "0.9rem",
								fontWeight: 800,
								background: "var(--teal, #0d9488)",
								color: "var(--on-teal, #ffffff)",
								cursor: "pointer",
								boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.45rem",
								borderRadius: "0.5rem",
								whiteSpace: "nowrap",
							}}
							data-testid="submit-cabinet-readiness-btn"
						>
							<Check size={18} style={{ flexShrink: 0 }} />
							<span>{isFullyReady ? "Кабинет готов к приёму — зафиксировать" : "Сохранить статус проверки"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
