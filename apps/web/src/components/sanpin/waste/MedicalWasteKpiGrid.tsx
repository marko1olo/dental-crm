import React from "react";

export interface WasteSummaryStats {
	totalKg: string;
	classAKg: string;
	classBKg: string;
	classGKg: string;
	totalRecords: number;
}

export function MedicalWasteKpiGrid({ stats }: { stats: WasteSummaryStats }) {
	return (
		<div className="sanpin-kpi-grid">
			<div className="sanpin-kpi-card">
				<span className="sanpin-kpi-label">Всего отходов</span>
				<span className="sanpin-kpi-value">{stats.totalKg} кг</span>
				<span className="sanpin-kpi-subtext">{stats.totalRecords} операций учета</span>
			</div>
			<div className="sanpin-kpi-card" style={{ borderLeft: "4px solid #f59e0b" }}>
				<span className="sanpin-kpi-label">Класс Б (Опасные)</span>
				<span className="sanpin-kpi-value" style={{ color: "#d97706" }}>{stats.classBKg} кг</span>
				<span className="sanpin-kpi-subtext">Желтые пакеты / контейнеры игл</span>
			</div>
			<div className="sanpin-kpi-card" style={{ borderLeft: "4px solid #64748b" }}>
				<span className="sanpin-kpi-label">Класс А (Безопасные)</span>
				<span className="sanpin-kpi-value">{stats.classAKg} кг</span>
				<span className="sanpin-kpi-subtext">Белые пакеты / бытовой мусор</span>
			</div>
			<div className="sanpin-kpi-card" style={{ borderLeft: "4px solid #dc2626" }}>
				<span className="sanpin-kpi-label">Класс Г (Токсичные)</span>
				<span className="sanpin-kpi-value" style={{ color: "#dc2626" }}>{stats.classGKg} кг</span>
				<span className="sanpin-kpi-subtext">Ртутные лампы / дезсредства</span>
			</div>
		</div>
	);
}
