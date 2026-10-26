/**
 * DicomAiFindingsList.tsx — Список находок ИИ с чекбоксами для зубной формулы
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Check } from "lucide-react";
import { TOOTH_STATE_LABELS } from "../../odontogram/ToothChart";
import type { planVisiographFindings } from "../visiographFindings.js";

interface Props {
	plan: ReturnType<typeof planVisiographFindings> | null;
	selectedFindingCodes: Set<string>;
	setSelectedFindingCodes: React.Dispatch<React.SetStateAction<Set<string>>>;
	appliedToothCodes: readonly string[];
}

export const DicomAiFindingsList: React.FC<Props> = ({
	plan,
	selectedFindingCodes,
	setSelectedFindingCodes,
	appliedToothCodes,
}) => {
	if (!plan || plan.groups.length === 0) {
		return (
			<div style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
				Патологических изменений, требующих изменения формулы, не обнаружено.
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			<div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
				Предлагаемые изменения в формулу:
			</div>
			{plan.groups.map((group) => {
				const stateLabel = TOOTH_STATE_LABELS[group.state] || group.state;
				return (
					<div
						key={group.state}
						style={{ backgroundColor: "#1e293b", borderRadius: "8px", padding: "10px", border: "1px solid #334155" }}
					>
						<div style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
							{stateLabel}:
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
							{group.teeth.map((t) => {
								const isChecked = selectedFindingCodes.has(t.code);
								const isApplied = appliedToothCodes.includes(t.code);
								return (
									<label
										key={t.code}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "10px",
											cursor: isApplied ? "default" : "pointer",
											fontSize: "13px",
											color: isApplied ? "#4ade80" : "#e2e8f0",
											userSelect: "none",
										}}
									>
										<input
											type="checkbox"
											checked={isChecked}
											disabled={isApplied}
											onChange={(e) => {
												const next = new Set(selectedFindingCodes);
												if (e.target.checked) next.add(t.code);
												else next.delete(t.code);
												setSelectedFindingCodes(next);
											}}
											style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0d9488" }}
										/>
										<span className="flex items-center gap-1">
											<span>Зуб #{t.code} — {stateLabel}</span>
											{isApplied && (
												<span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold ml-1">
													<Check size={12} /> внесено
												</span>
											)}
										</span>
									</label>
								);
							})}
						</div>
					</div>
				);
			})}
		</div>
	);
};
