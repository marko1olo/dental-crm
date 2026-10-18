import React from "react";
import type { ExecutiveKpisSummary, ExecutivePeriod } from "@dental/shared";
import { AlertTriangle, Calendar, CalendarPlus, CreditCard } from "lucide-react";
import { computeChairEconomicsSummary } from "./executiveAnalyticsTypes";

export interface DesktopExecutiveEmptyStateBannerProps {
	readonly isEmpty: boolean;
	readonly period: ExecutivePeriod;
	readonly kpis: ExecutiveKpisSummary;
	readonly onSelectPeriod: (p: ExecutivePeriod) => void;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export function DesktopExecutiveEmptyStateBanner({
	isEmpty,
	period,
	kpis,
	onSelectPeriod,
	onNavigateToSection,
}: DesktopExecutiveEmptyStateBannerProps) {
	const econ = computeChairEconomicsSummary(kpis);

	if (!isEmpty) return null;

	return (
		<div
			className="executive-panel"
			role="status"
			style={{
				padding: "1rem 1.25rem",
				marginBottom: "1rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "1rem",
				borderLeft: "4px solid var(--teal, #0d9488)",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
				<AlertTriangle size={20} style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }} aria-hidden="true" />
				<div>
					<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
						За выбранный период записей и оплат пока нет
					</div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Выберите другой период или оформите приём в расписании (ставка: {econ.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч)
					</div>
				</div>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
				<button
					type="button"
					className="executive-primary-action-btn"
					onClick={() => {
						if (onNavigateToSection) {
							onNavigateToSection("schedule");
						} else if (typeof window !== "undefined") {
							window.location.hash = "#schedule";
						}
					}}
					title="Записать пациента на приём"
				>
					<CalendarPlus size={14} aria-hidden="true" />
					<span>Записать пациента</span>
				</button>
				<button
					type="button"
					className="executive-refresh-btn"
					onClick={() => {
						if (onNavigateToSection) {
							onNavigateToSection("shift");
						} else if (typeof window !== "undefined") {
							window.location.hash = "#shift";
						}
					}}
					title="Открыть смену или перейти в кассу"
				>
					<CreditCard size={14} aria-hidden="true" />
					<span>Перейти в кассу</span>
				</button>
				{period !== "month" && (
					<button
						type="button"
						className="executive-refresh-btn"
						onClick={() => onSelectPeriod("month")}
					>
						<Calendar size={14} aria-hidden="true" />
						<span>Показать за месяц</span>
					</button>
				)}
			</div>
		</div>
	);
}
