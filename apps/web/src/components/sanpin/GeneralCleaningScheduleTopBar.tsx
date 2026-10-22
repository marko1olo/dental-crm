import { Calendar, Sparkles } from "lucide-react";
import type React from "react";
import { MONTH_NAMES_RU } from "./cleaningScheduleTypes";

export interface GeneralCleaningScheduleTopBarProps {
	readonly selectedMonth: number;
	readonly setSelectedMonth: (m: number) => void;
	readonly selectedYear: number;
	readonly setSelectedYear: (y: number) => void;
	readonly roomFilter: string;
	readonly setRoomFilter: (r: string) => void;
	readonly isAutopilotLoading: boolean;
	readonly onGenerateMonthlySchedule: () => void;
}

export const GeneralCleaningScheduleTopBar: React.FC<GeneralCleaningScheduleTopBarProps> = ({
	selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
	roomFilter, setRoomFilter, isAutopilotLoading, onGenerateMonthlySchedule,
}) => {
	return (
		<div
			style={{
				display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap",
				gap: "0.75rem", padding: "1rem", background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)", borderRadius: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Calendar size={18} color="var(--teal, #0d9488)" />
					<span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--ink, #0f172a)" }}>
						График генеральных уборок:
					</span>
				</div>

				<select
					value={selectedMonth}
					onChange={(e) => setSelectedMonth(Number(e.target.value))}
					style={{
						padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "0.85rem", fontWeight: 600,
					}}
				>
					{MONTH_NAMES_RU.map((name, idx) => (
						<option key={name} value={idx}>{name}</option>
					))}
				</select>

				<select
					value={selectedYear}
					onChange={(e) => setSelectedYear(Number(e.target.value))}
					style={{
						padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "0.85rem", fontWeight: 600,
					}}
				>
					{[2025, 2026, 2027].map((yr) => (
						<option key={yr} value={yr}>{yr} г.</option>
					))}
				</select>

				<select
					value={roomFilter}
					onChange={(e) => setRoomFilter(e.target.value)}
					style={{
						padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", fontSize: "0.85rem",
					}}
				>
					<option value="all">Все кабинеты клиники</option>
					<option value="Кабинет № 1">Кабинет № 1 (Терапия)</option>
					<option value="Кабинет № 2">Кабинет № 2 (Ортопедия)</option>
					<option value="Хирургический">Операционная / Хирургия</option>
					<option value="Стерилизационная">Стерилизационная (ЦСО)</option>
				</select>
			</div>

			<button
				type="button"
				onClick={onGenerateMonthlySchedule}
				aria-busy={isAutopilotLoading}
				className="touch-manipulation"
				style={{
					minHeight: "44px", padding: "0.5rem 1.25rem", fontSize: "0.9rem", fontWeight: 800,
					borderRadius: "8px", background: "var(--teal, #0d9488)", color: "#ffffff", border: "none",
					cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem",
					boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)", whiteSpace: "nowrap",
				}}
				title="Автоматически заполнить график генеральных уборок на текущий месяц с интервалом 7 дней"
				data-testid="generate-monthly-cleanings-btn"
			>
				<Sparkles size={16} />
				<span>
					{isAutopilotLoading ? "Формирование графика..." : "Заполнить график генеральных уборок на месяц (по СанПиН каждые 7 дней)"}
				</span>
			</button>
		</div>
	);
};
