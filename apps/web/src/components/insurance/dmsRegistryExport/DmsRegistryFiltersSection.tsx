/**
 * DmsRegistryFiltersSection.tsx — Панель фильтров реестра услуг ДМС
 */

import { Loader2, Search, X } from "lucide-react";
import React, { useId } from "react";
import { RUSSIAN_DMS_INSURERS } from "../insuranceMath.js";
import { DmsRegistryInsurerChips } from "./DmsRegistryInsurerChips.js";

export interface DmsRegistryFiltersSectionProps {
	readonly selectedInsurer: string;
	readonly onSelectInsurer: (insurer: string) => void;
	readonly periodFilter: string;
	readonly onSelectPeriod: (period: string) => void;
	readonly searchFilter: string;
	readonly onSearchChange: (search: string) => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly scopePatientOnly: boolean;
	readonly onToggleScopePatientOnly: (val: boolean) => void;
	readonly isLoading: boolean;
	readonly currentMonthName: string;
	readonly prevMonthName: string;
	readonly prevMonthDate: Date;
	readonly currentQuarter: number;
	readonly now: Date;
}

export function DmsRegistryFiltersSection(props: DmsRegistryFiltersSectionProps) {
	const filterInsurerSelectId = useId();
	const filterPeriodSelectId = useId();
	const searchRecordInputId = useId();

	return (
		<div className="dms-card">
			<DmsRegistryInsurerChips selectedInsurer={props.selectedInsurer} onSelectInsurer={props.onSelectInsurer} />

			{props.patientId && (
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", padding: "8px 12px", background: "var(--paper-soft, #f8fafc)", borderRadius: "8px", border: "1px solid var(--line, #e2e8f0)" }}>
					<label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", cursor: "pointer", fontWeight: 600 }}>
						<input
							type="checkbox"
							checked={props.scopePatientOnly}
							onChange={(e) => props.onToggleScopePatientOnly(e.target.checked)}
							style={{ cursor: "pointer" }}
						/>
						<span>Только текущий пациент {props.patientName ? `(${props.patientName})` : ""}</span>
					</label>
					{props.isLoading && (
						<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--primary, #0284c7)" }}>
							<Loader2 size={14} className="animate-spin" />
							<span>Загрузка данных...</span>
						</div>
					)}
				</div>
			)}

			<div className="dms-grid-3">
				<div className="dms-field-group">
					<label htmlFor={filterInsurerSelectId} className="dms-label">Страховая компания (ДМС)</label>
					<select
						id={filterInsurerSelectId}
						value={props.selectedInsurer}
						onChange={(e) => props.onSelectInsurer(e.target.value)}
						className="dms-select"
					>
						<option value="all">Все страховые компании (Сводный отчет)</option>
						{RUSSIAN_DMS_INSURERS.map((ins) => (
							<option key={ins.key} value={ins.shortName}>{ins.shortName}</option>
						))}
					</select>
				</div>

				<div className="dms-field-group">
					<label htmlFor={filterPeriodSelectId} className="dms-label">Отчетный период</label>
					<select
						id={filterPeriodSelectId}
						value={props.periodFilter}
						onChange={(e) => props.onSelectPeriod(e.target.value)}
						className="dms-select"
					>
						<option value="current_month">Текущий месяц ({props.currentMonthName} {props.now.getFullYear()})</option>
						<option value="prev_month">Предыдущий месяц ({props.prevMonthName} {props.prevMonthDate.getFullYear()})</option>
						<option value="quarter">{props.currentQuarter} квартал {props.now.getFullYear()} года</option>
					</select>
				</div>

				<div className="dms-field-group">
					<label htmlFor={searchRecordInputId} className="dms-label">Поиск по пациенту, полису или услуге</label>
					<div className="dente-search-wrap flex-1">
						<Search size={14} className="dente-search-icon" />
						<input
							id={searchRecordInputId}
							type="text"
							placeholder="ФИО, полис, код услуги..."
							value={props.searchFilter}
							onChange={(e) => props.onSearchChange(e.target.value)}
							className="dente-search-input"
						/>
						{props.searchFilter && (
							<button
								type="button"
								onClick={() => props.onSearchChange("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={13} />
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
