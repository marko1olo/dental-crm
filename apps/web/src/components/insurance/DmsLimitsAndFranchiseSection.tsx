/**
 * DmsLimitsAndFranchiseSection.tsx — Секция лимитов покрытия, франшизы и статуса гарантийного письма ДМС.
 */

import { Calculator } from "lucide-react";
import React, { useId } from "react";
import { formatRubKopecks } from "./insuranceMath";

export interface DmsLimitsAndFranchiseSectionProps {
	readonly maxCoverageRub: number;
	readonly usedAmountRub: number;
	readonly remainingLimitRub: number;
	readonly franchiseType: "percent" | "fixed_rub";
	readonly franchisePct: number;
	readonly franchiseFixedRub: number;
	readonly status: "active" | "expired" | "exhausted" | "cancelled";
	readonly onMaxCoverageChange: (val: number) => void;
	readonly onUsedAmountChange: (val: number) => void;
	readonly onFranchiseTypeChange: (val: "percent" | "fixed_rub") => void;
	readonly onFranchisePctChange: (val: number) => void;
	readonly onFranchiseFixedRubChange: (val: number) => void;
	readonly onStatusChange: (val: "active" | "expired" | "exhausted" | "cancelled") => void;
}

export function DmsLimitsAndFranchiseSection({
	maxCoverageRub,
	usedAmountRub,
	remainingLimitRub,
	franchiseType,
	franchisePct,
	franchiseFixedRub,
	status,
	onMaxCoverageChange,
	onUsedAmountChange,
	onFranchiseTypeChange,
	onFranchisePctChange,
	onFranchiseFixedRubChange,
	onStatusChange,
}: DmsLimitsAndFranchiseSectionProps) {
	const maxCoverageInputId = useId();
	const usedAmountInputId = useId();
	const franchiseTypeSelectId = useId();
	const franchiseValueInputId = useId();
	const statusSelectId = useId();

	return (
		<div className="dms-card">
			<h3 className="dms-card-title">
				<Calculator size={18} className="text-emerald-600" />
				2. Лимиты страхового покрытия и франшиза (Copay)
			</h3>

			<div className="dms-grid-3">
				<div className="dms-field-group">
					<label htmlFor={maxCoverageInputId} className="dms-label">Согласованный лимит ГП (₽) *</label>
					<input
						id={maxCoverageInputId}
						type="number"
						min="0"
						step="500"
						value={maxCoverageRub}
						onChange={(e) => onMaxCoverageChange(Number(e.target.value) || 0)}
						className="dms-input font-mono font-bold"
					/>
				</div>

				<div className="dms-field-group">
					<label htmlFor={usedAmountInputId} className="dms-label">Израсходовано по ГП (₽)</label>
					<input
						id={usedAmountInputId}
						type="number"
						min="0"
						step="100"
						value={usedAmountRub}
						onChange={(e) => onUsedAmountChange(Number(e.target.value) || 0)}
						className="dms-input font-mono"
					/>
				</div>

				<div className="dms-field-group">
					<span className="dms-label">Остаток лимита</span>
					<div className="dms-input font-mono font-bold flex items-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
						{formatRubKopecks(remainingLimitRub)}
					</div>
				</div>
			</div>

			{/* Франшиза */}
			<div className="dms-grid-3" style={{ marginTop: "14px" }}>
				<div className="dms-field-group">
					<label htmlFor={franchiseTypeSelectId} className="dms-label">Тип франшизы / доплаты</label>
					<select
						id={franchiseTypeSelectId}
						value={franchiseType}
						onChange={(e) => onFranchiseTypeChange(e.target.value as "percent" | "fixed_rub")}
						className="dms-select"
					>
						<option value="percent">Процентная франшиза (% доплаты пациента)</option>
						<option value="fixed_rub">Фиксированная франшиза (₽ за визит)</option>
					</select>
				</div>

				{franchiseType === "percent" ? (
					<div className="dms-field-group">
						<label htmlFor={franchiseValueInputId} className="dms-label">Размер франшизы (%)</label>
						<input
							id={franchiseValueInputId}
							type="number"
							min="0"
							max="100"
							value={franchisePct}
							onChange={(e) => onFranchisePctChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
							className="dms-input font-mono"
							placeholder="0 — 100%"
						/>
					</div>
				) : (
					<div className="dms-field-group">
						<label htmlFor={franchiseValueInputId} className="dms-label">Сумма франшизы (₽)</label>
						<input
							id={franchiseValueInputId}
							type="number"
							min="0"
							step="100"
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
						onChange={(e) => onStatusChange(e.target.value as "active" | "expired" | "exhausted" | "cancelled")}
						className="dms-select"
					>
						<option value="active">Активно (в работе)</option>
						<option value="exhausted">Исчерпан лимит</option>
						<option value="expired">Истек срок действия</option>
						<option value="cancelled">Отозвано / Аннулировано</option>
					</select>
				</div>
			</div>
		</div>
	);
}
