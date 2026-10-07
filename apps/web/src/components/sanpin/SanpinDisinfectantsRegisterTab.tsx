import { Check, Droplets, Plus, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface DisinfectantSolutionRecord {
	id: string;
	tradeNameRu: string;
	purposeRu: string;
	concentrationPercent: number;
	preparationDate: string;
	expiryDate: string;
	testStripResultRu: string;
	responsibleNurseRu: string;
	volumeLiters: number;
}

function getRecentIsoDate(daysOffset = 0): string {
	const d = new Date(Date.now() + daysOffset * 86400000);
	return d.toISOString().slice(0, 10);
}

function getRecentDateTimeRu(daysOffset = 0, timeStr = "08:00"): string {
	return `${getRecentIsoDate(daysOffset)} ${timeStr}`;
}

export const DEFAULT_DISINFECTANT_RECORDS: DisinfectantSolutionRecord[] = [
	{
		id: "ds-01",
		tradeNameRu: "Аламинол (раствор 1.5%)",
		purposeRu: "Предстерилизационная очистка и дезинфекция инструментов (ЦСО)",
		concentrationPercent: 1.5,
		preparationDate: getRecentDateTimeRu(0, "08:00"),
		expiryDate: getRecentDateTimeRu(14, "08:00"),
		testStripResultRu: "Дезиконт-Аламинол: 1.5% норма (тест пройден)",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 10,
	},
	{
		id: "ds-02",
		tradeNameRu: "Бациллол АФ (экспресс-спрей)",
		purposeRu: "Экстренная дезинфекция поверхностей установки и наконечников",
		concentrationPercent: 100,
		preparationDate: `${getRecentIsoDate(0)} (заводской)`,
		expiryDate: getRecentIsoDate(365),
		testStripResultRu: "Готовый заводской раствор (активен)",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 1.0,
	},
	{
		id: "ds-03",
		tradeNameRu: "Оптимакс Про (раствор 1.0%)",
		purposeRu: "Дезинфекция слепков, зуботехнических оттисков и ложек",
		concentrationPercent: 1.0,
		preparationDate: getRecentDateTimeRu(-1, "09:00"),
		expiryDate: getRecentDateTimeRu(13, "09:00"),
		testStripResultRu: "Тест-полоска Оптимакс: 1.0% норма",
		responsibleNurseRu: "Старшая медсестра",
		volumeLiters: 5,
	},
	{
		id: "ds-04",
		tradeNameRu: "Дезискраб (раствор 2.0%)",
		purposeRu: "Хирургическая обработка поверхностей и генеральная уборка операционной",
		concentrationPercent: 2.0,
		preparationDate: getRecentDateTimeRu(0, "07:30"),
		expiryDate: getRecentDateTimeRu(14, "07:30"),
		testStripResultRu: "Дезиконт-Дезискраб: 2.0% норма",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 8,
	},
	{
		id: "ds-05",
		tradeNameRu: "Бриллиант Классик (раствор 2.0%)",
		purposeRu: "Обезвреживание медицинских отходов классов Б и В",
		concentrationPercent: 2.0,
		preparationDate: getRecentDateTimeRu(0, "08:15"),
		expiryDate: getRecentDateTimeRu(7, "08:15"),
		testStripResultRu: "Тест-полоска Бриллиант: 2.0% норма",
		responsibleNurseRu: "Медсестра ЦСО",
		volumeLiters: 15,
	},
];

export function SanpinDisinfectantsRegisterTab() {
	const [query, setQuery] = useState("");
	const [records, setRecords] = useState<DisinfectantSolutionRecord[]>(() =>
		isDemoShowcaseMode() ? DEFAULT_DISINFECTANT_RECORDS : []
	);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return records;
		return records.filter(
			(r) =>
				r.tradeNameRu.toLowerCase().includes(q) ||
				r.purposeRu.toLowerCase().includes(q)
		);
	}, [records, query]);

	const handleAddSolution = () => {
		const now = new Date();
		const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
		const prepDate = `${getRecentIsoDate(0)} ${timeStr}`;
		const expDate = getRecentDateTimeRu(14, timeStr);
		const newRecord: DisinfectantSolutionRecord = {
			id: `ds-${Date.now()}`,
			tradeNameRu: "Аламинол (раствор 1.5%)",
			purposeRu: "Текущая предстерилизационная очистка и дезинфекция инструментов (ЦСО)",
			concentrationPercent: 1.5,
			preparationDate: prepDate,
			expiryDate: expDate,
			testStripResultRu: "Дезиконт-Аламинол: 1.5% норма (тест пройден)",
			responsibleNurseRu: "Медсестра ЦСО",
			volumeLiters: 5,
		};
		setRecords((prev) => [newRecord, ...prev]);
		showToast("Рабочий раствор зарегистрирован в журнале!", "success");
	};

	const handleVerifyTestStrips = () => {
		const now = new Date();
		const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
		setRecords((prev) =>
			prev.map((r) => ({
				...r,
				testStripResultRu: `Тест-полоска экспресс: норма (${timeStr}, активен)`,
			}))
		);
		showToast(`Тест-полоски концентрации: все емкости (${records.length} шт.) в норме!`, "success");
	};

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ ДЕЗСРЕДСТВ И РАБОЧИХ РАСТВОРОВ</h2>
				<p title="Учет дезинфицирующих средств клиники">Дезсредства и рабочие растворы клиники</p>
			</div>

			<div className="sanpin-control-bar" style={{ minHeight: "36px", margin: "0.4rem 0" }}>
				<div className="sanpin-filter-group">
					<div className="dente-search-wrap" style={{ minWidth: "260px" }}>
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							placeholder="Поиск по препарату, назначению..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="dente-search-input"
						/>
						{query && (
							<button
								type="button"
								className="dente-search-clear"
								onClick={() => setQuery("")}
								aria-label="Очистить поиск"
							>
								<X size={12} />
							</button>
						)}
					</div>
				</div>

				<div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
					<button
						type="button"
						onClick={handleAddSolution}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "34px", height: "34px", padding: "0.35rem 0.85rem", fontSize: "0.825rem", fontWeight: 700, background: "var(--teal)", color: "var(--on-teal, #fff)", border: "none" }}
					>
						<Plus size={15} /> Приготовить раствор
					</button>
					<button
						type="button"
						onClick={handleVerifyTestStrips}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "34px", height: "34px", padding: "0.35rem 0.85rem", fontSize: "0.825rem", fontWeight: 600 }}
					>
						<Droplets size={15} /> Экспресс-контроль полосками
					</button>
				</div>
			</div>

			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>Наименование дезсредства</th>
							<th style={{ fontSize: "0.85rem" }}>Назначение и зона применения</th>
							<th style={{ fontSize: "0.85rem" }}>Концентрация / Объем</th>
							<th style={{ fontSize: "0.85rem" }}>Дата приготовления</th>
							<th style={{ fontSize: "0.85rem" }}>Годен до</th>
							<th style={{ fontSize: "0.85rem" }}>Тест-полоски / Контроль</th>
							<th style={{ fontSize: "0.85rem" }}>Ответственный</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<tr>
								<td colSpan={7} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--muted)" }}>
									Нет приготовленных дезрастворов. Нажмите «Приготовить раствор» для внесения партии.
								</td>
							</tr>
						) : (
							filtered.map((r) => (
								<tr key={r.id} className="sanpin-log-row" style={{ minHeight: "40px", contentVisibility: "auto", containIntrinsicSize: "1px 40px", contain: "content" }}>
									<td style={{ fontWeight: 700, color: "var(--ink)" }}>{r.tradeNameRu}</td>
									<td style={{ fontSize: "0.875rem" }}>{r.purposeRu}</td>
									<td>
										<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.8rem" }}>
											{r.concentrationPercent}% ({r.volumeLiters} л)
										</span>
									</td>
									<td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{r.preparationDate}</td>
									<td style={{ fontSize: "0.85rem", fontWeight: 600 }}>{r.expiryDate}</td>
									<td>
										<span style={{ fontSize: "0.8rem", color: "var(--ok-fg)", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
											<Check size={13} /> {r.testStripResultRu}
										</span>
									</td>
									<td style={{ fontSize: "0.85rem", fontWeight: 500 }}>{r.responsibleNurseRu}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export { SanpinDisinfectantsRegisterTab as DisinfectantsRegisterTab };
