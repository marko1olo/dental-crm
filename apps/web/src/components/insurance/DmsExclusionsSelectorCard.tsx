/**
 * DmsExclusionsSelectorCard.tsx — Карточка исключений страховой программы ДМС (100% сооплата пациента).
 */

import { AlertTriangle } from "lucide-react";
import React from "react";
import { DMS_STANDARD_EXCLUSIONS } from "./insuranceMath";

export interface DmsExclusionsSelectorCardProps {
	readonly selectedExclusions: readonly string[];
	readonly onToggleExclusion: (exclusionKey: string) => void;
}

export function DmsExclusionsSelectorCard({
	selectedExclusions,
	onToggleExclusion,
}: DmsExclusionsSelectorCardProps) {
	return (
		<div className="dms-card">
			<h3 className="dms-card-title">
				<AlertTriangle size={18} className="text-[var(--warn-fg,#d97706)]" />
				3. Исключения из программы ДМС (100% доплата пациента)
			</h3>
			<p style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", margin: "0 0 12px 0" }}>
				Услуги из отмеченных категорий не покрываются страховщиком и автоматически выставляются в счет пациенту.
			</p>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
				{DMS_STANDARD_EXCLUSIONS.map((ex) => {
					const isChecked = selectedExclusions.includes(ex.key);
					return (
						<label
							key={ex.key}
							className={`dms-checkbox-pill ${isChecked ? "active" : ""}`}
							title={ex.description}
						>
							<input
								type="checkbox"
								checked={isChecked}
								onChange={() => onToggleExclusion(ex.key)}
							/>
							<span>{ex.title}</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}
