/**
 * DmsFranchiseAndStatusGrid.tsx — Сетка франшизы, статуса и 1-клик кнопок сооплаты
 */

import React from "react";
import type { DmsLetterLifecycleStatus } from "../dmsGuaranteeLetter/types.js";

export interface DmsFranchiseAndStatusGridProps {
	readonly franchiseType: "percent" | "fixed_rub";
	readonly franchisePct: number;
	readonly franchiseFixedRub: number;
	readonly status: DmsLetterLifecycleStatus;
	readonly onFranchiseTypeChange: (val: "percent" | "fixed_rub") => void;
	readonly onFranchisePctChange: (val: number) => void;
	readonly onFranchiseFixedRubChange: (val: number) => void;
	readonly onStatusChange: (val: DmsLetterLifecycleStatus) => void;
	readonly franchiseTypeSelectId: string;
	readonly franchiseValueInputId: string;
	readonly statusSelectId: string;
}

export function DmsFranchiseAndStatusGrid({
	franchiseType, franchisePct, franchiseFixedRub, status,
	onFranchiseTypeChange, onFranchisePctChange, onFranchiseFixedRubChange, onStatusChange,
	franchiseTypeSelectId, franchiseValueInputId, statusSelectId,
}: DmsFranchiseAndStatusGridProps) {
	return (
		<>
			<div className="dms-grid-3" style={{ marginTop: "14px" }}>
				<div className="dms-field-group">
					<label htmlFor={franchiseTypeSelectId} className="dms-label">Тип франшизы / доплаты</label>
					<select
						id={franchiseTypeSelectId}
						value={franchiseType}
						onChange={(e) => onFranchiseTypeChange(e.target.value as "percent" | "fixed_rub")}
						className="dms-select"
					>
						<option value="percent">Процентная франшиза (% доплаты)</option>
						<option value="fixed_rub">Фиксированная франшиза (₽ за визит)</option>
					</select>
				</div>
				{franchiseType === "percent" ? (
					<div className="dms-field-group">
						<label htmlFor={franchiseValueInputId} className="dms-label">Размер франшизы (%)</label>
						<input
							id={franchiseValueInputId}
							type="number" min="0" max="100"
							value={franchisePct}
							onChange={(e) => onFranchisePctChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
							className="dms-input font-mono" placeholder="0 — 100%"
						/>
					</div>
				) : (
					<div className="dms-field-group">
						<label htmlFor={franchiseValueInputId} className="dms-label">Сумма франшизы (₽)</label>
						<input
							id={franchiseValueInputId}
							type="number" min="0" step="100"
							value={franchiseFixedRub}
							onChange={(e) => onFranchiseFixedRubChange(Number(e.target.value) || 0)}
							className="dms-input font-mono"
						/>
					</div>
				)}
				<div className="dms-field-group">
					<label htmlFor={statusSelectId} className="dms-label">Статус гарантийного письма</label>
					<select
						id={statusSelectId}
						value={status}
						onChange={(e) => onStatusChange(e.target.value as DmsLetterLifecycleStatus)}
						className="dms-select"
						data-testid="select-guarantee-letter-status"
					>
						<option value="draft">Черновик (подготовка)</option>
						<option value="pending_approval">На согласовании</option>
						<option value="approved">Согласовано куратором</option>
						<option value="active">Активно (в работе)</option>
						<option value="billed">Счёт выставлен в СК</option>
						<option value="paid">Оплачено страховой</option>
						<option value="exhausted">Исчерпан лимит</option>
						<option value="expired">Истёк срок действия</option>
						<option value="cancelled">Отозвано / Аннулировано</option>
					</select>
				</div>
			</div>
			<div className="mt-3.5 flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--line,#e2e8f0)]">
				<span className="text-xs font-semibold text-[var(--muted,#64748b)] shrink-0">1-Клик франшиза:</span>
				<div className="dente-filter-chips flex-wrap">
					{[0, 10, 20, 30, 50, 80].map((pct) => {
						const isSelected = franchiseType === "percent" && franchisePct === pct;
						return (
							<button
								key={pct}
								type="button"
								className={`dente-filter-chip ${isSelected ? "active" : ""}`}
								data-active={isSelected}
								onClick={() => { onFranchiseTypeChange("percent"); onFranchisePctChange(pct); }}
								title={`Установить франшизу ${pct}%`}
							>
								{pct === 0 ? "0% (100% ДМС)" : `${pct}%`}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}
