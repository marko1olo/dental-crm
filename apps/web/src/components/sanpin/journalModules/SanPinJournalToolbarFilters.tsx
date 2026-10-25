import React from "react";
import { Search } from "lucide-react";
import type { SanPinJournalPeriod } from "./sanpinJournalTypes";

export interface SanPinJournalToolbarFiltersProps {
	readonly selectedAutoclave: string;
	readonly onSelectAutoclave: (val: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
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
					Журнал автоклавирования
				</span>

				{onPeriodChange && (
					<div style={{ display: "inline-flex", background: "var(--paper, #fff)", border: "1px solid var(--line, #cbd5e1)", borderRadius: 8, padding: 2, gap: 2 }}>
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
										height: 28,
										padding: "0 10px",
										borderRadius: 6,
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
					className="secondary-button"
					style={{
						height: 34,
						minHeight: 34,
						padding: "0 10px",
						borderRadius: 8,
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #fff)",
						fontSize: "0.8125rem",
						color: "var(--ink, #1e293b)",
						maxWidth: "100%",
						cursor: "pointer",
					}}
				>
					<option value="all">Все автоклавы</option>
					<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
					<option value="АК-02">АК-02 (W&H Lina 17)</option>
				</select>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
				<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
					<Search size={14} style={{ position: "absolute", left: 10, color: "var(--muted, #64748b)" }} />
					<input
						type="text"
						placeholder="Поиск по набору или партии..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						style={{ height: 32, paddingLeft: 30, paddingRight: 10, borderRadius: 8, border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", fontSize: "0.8125rem", color: "var(--ink, #1e293b)", width: 230 }}
					/>
				</div>
			</div>
		</div>
	);
};
