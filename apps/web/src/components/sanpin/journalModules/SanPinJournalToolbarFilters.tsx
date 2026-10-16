import React from "react";
import { Search, QrCode } from "lucide-react";
import type { SanPinJournalPeriod } from "./sanpinJournalTypes";

export interface SanPinJournalToolbarFiltersProps {
	readonly selectedAutoclave: string;
	readonly onSelectAutoclave: (val: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly directScanCode: string;
	readonly onDirectScanChange: (code: string) => void;
	readonly onDirectScanSubmit: (code: string) => void;
	readonly period?: SanPinJournalPeriod | undefined;
	readonly onPeriodChange?: ((p: SanPinJournalPeriod) => void) | undefined;
}

export const SanPinJournalToolbarFilters: React.FC<SanPinJournalToolbarFiltersProps> = ({
	selectedAutoclave,
	onSelectAutoclave,
	searchQuery,
	onSearchChange,
	period = "day",
	onPeriodChange,
}) => {
	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
			<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
				<span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink, #1e293b)" }}>
					Журнал автоклавирования и стерилизации
				</span>

				{onPeriodChange && (
					<div style={{ display: "inline-flex", background: "var(--paper, #fff)", border: "1px solid var(--line, #cbd5e1)", borderRadius: 6, padding: 2, gap: 2 }}>
						{(["day", "week", "month"] as const).map((p) => {
							const label = p === "day" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц";
							const active = period === p;
							return (
								<button
									key={p}
									type="button"
									onClick={() => onPeriodChange(p)}
									className="secondary-button"
									style={{
										height: 26,
										padding: "0 8px",
										borderRadius: 4,
										border: "none",
										background: active ? "var(--teal, #0d9488)" : "transparent",
										color: active ? "#ffffff" : "var(--muted, #64748b)",
										fontSize: "0.75rem",
										fontWeight: active ? 600 : 500,
										cursor: "pointer",
									}}
								>
									{label}
								</button>
							);
						})}
					</div>
				)}

				<select
					value={selectedAutoclave}
					onChange={(e) => onSelectAutoclave(e.target.value)}
					style={{ height: 32, padding: "0 8px", borderRadius: 6, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", fontSize: "0.8125rem", color: "var(--ink, #1e293b)" }}
				>
					<option value="all">Все автоклавы</option>
					<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
					<option value="АК-02">АК-02 (W&H Lina 17)</option>
				</select>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
				<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
					<Search size={14} style={{ position: "absolute", left: 8, color: "var(--muted, #64748b)" }} />
					<input
						type="text"
						placeholder="Поиск по набору или партии..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						style={{ height: 32, paddingLeft: 28, paddingRight: 8, borderRadius: 6, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", fontSize: "0.8125rem", color: "var(--ink, #1e293b)", width: 220 }}
					/>
				</div>
			</div>
		</div>
	);
};
