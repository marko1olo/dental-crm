import { Plus, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface NeedleDisposalRecord {
	id: string;
	shiftDateRu: string;
	wasteTypeRu: string;
	treatmentMethodRu: string;
	netWeightKg: number;
	containerCodeRu: string;
	surrenderedNurseRu: string;
	acceptedNurseRu: string;
}

function getRecentIsoDate(daysOffset = 0): string {
	const d = new Date(Date.now() + daysOffset * 86400000);
	return d.toISOString().slice(0, 10);
}

function getRecentDateTimeRu(daysOffset = 0, timeStr = "08:00"): string {
	return `${getRecentIsoDate(daysOffset)} ${timeStr}`;
}

export const DEFAULT_NEEDLE_DISPOSAL_RECORDS: NeedleDisposalRecord[] = [
	{
		id: "nd-01",
		shiftDateRu: getRecentDateTimeRu(0, "14:00"),
		wasteTypeRu: "Иглы инъекционные карпульные 30G/27G отсеченные + карпулы анестетика",
		treatmentMethodRu: "Иглоотсекатель / деструктор игл + хим. дезинфекция Бриллиант Классик 2%",
		netWeightKg: 1.2,
		containerCodeRu: "Желтый контейнер КБ-12 (одноразовый с иглосъемником)",
		surrenderedNurseRu: "Медсестра ЦСО",
		acceptedNurseRu: "Старшая медсестра",
	},
	{
		id: "nd-02",
		shiftDateRu: getRecentDateTimeRu(-1, "19:30"),
		wasteTypeRu: "Иглы хирургические шовные, лезвия скальпелей, карпулы пустые",
		treatmentMethodRu: "Механическое разрушение + автоклавирование 134°C (класс Б)",
		netWeightKg: 0.85,
		containerCodeRu: "Желтый контейнер КБ-11 (проколостойкий герметичный)",
		surrenderedNurseRu: "Медсестра ЦСО",
		acceptedNurseRu: "Старшая медсестра",
	},
	{
		id: "nd-03",
		shiftDateRu: getRecentDateTimeRu(-2, "20:00"),
		wasteTypeRu: "Отработанные инъекционные карпулы с остатками анестетика и крови",
		treatmentMethodRu: "Химическое обезвреживание дезсредством в желтом баке",
		netWeightKg: 1.4,
		containerCodeRu: "Желтый контейнер КБ-10 (пломба № 04812)",
		surrenderedNurseRu: "Старшая медсестра",
		acceptedNurseRu: "Специализированная организация (Класс Б)",
	},
];

export function SanpinNeedleDisposalRegisterTab() {
	const [query, setQuery] = useState("");
	const [records, setRecords] = useState<NeedleDisposalRecord[]>(() =>
		isDemoShowcaseMode() ? DEFAULT_NEEDLE_DISPOSAL_RECORDS : []
	);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return records;
		return records.filter(
			(r) =>
				r.wasteTypeRu.toLowerCase().includes(q) ||
				r.containerCodeRu.toLowerCase().includes(q)
		);
	}, [records, query]);

	const handleAddNeedleBatch = () => {
		const now = new Date();
		const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
		const containerNum = 13 + records.length - DEFAULT_NEEDLE_DISPOSAL_RECORDS.length;
		const sealNum = String(4813 + records.length - DEFAULT_NEEDLE_DISPOSAL_RECORDS.length).padStart(5, "0");
		const newRecord: NeedleDisposalRecord = {
			id: `nd-${Date.now()}`,
			shiftDateRu: `${getRecentIsoDate(0)} ${timeStr}`,
			wasteTypeRu: "Иглы инъекционные карпульные 30G/27G + карпулы пустые (класс Б)",
			treatmentMethodRu: "Иглоотсекатель / деструктор + хим. дезинфекция Бриллиант Классик 2%",
			netWeightKg: 0.95,
			containerCodeRu: `Желтый контейнер КБ-${containerNum} (пломба № ${sealNum})`,
			surrenderedNurseRu: "Медсестра ЦСО",
			acceptedNurseRu: "Старшая медсестра",
		};
		setRecords((prev) => [newRecord, ...prev]);
		showToast("Партия утилизированных игл внесена в журнал!", "success");
	};

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>УТИЛИЗАЦИЯ ИГЛ И ОСТРЫХ ИНСТРУМЕНТОВ</h2>
				<p title="Безопасный сбор и утилизация использованных игл">Обезвреживание карпульных игл, лезвий и колющих отходов</p>
			</div>

			<div className="sanpin-control-bar" style={{ minHeight: "36px", margin: "0.4rem 0" }}>
				<div className="sanpin-filter-group">
					<div className="dente-search-wrap" style={{ minWidth: "260px" }}>
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							placeholder="Поиск по типу отходов, контейнеру..."
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
						onClick={handleAddNeedleBatch}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "34px", height: "34px", padding: "0.35rem 0.85rem", fontSize: "0.825rem", fontWeight: 700, background: "var(--teal)", color: "var(--on-teal, #fff)", border: "none" }}
					>
						<Plus size={15} /> Внести партию игл
					</button>
				</div>
			</div>

			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>Дата / Время смены</th>
							<th style={{ fontSize: "0.85rem" }}>Вид острого инструментария</th>
							<th style={{ fontSize: "0.85rem" }}>Способ обезвреживания</th>
							<th style={{ fontSize: "0.85rem" }}>Масса нетто</th>
							<th style={{ fontSize: "0.85rem" }}>Маркировка емкости / Контейнер</th>
							<th style={{ fontSize: "0.85rem" }}>Сдал (медсестра)</th>
							<th style={{ fontSize: "0.85rem" }}>Принял</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<tr>
								<td colSpan={7} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--muted)" }}>
									Журнал утилизации острых инструментов пуст. Нажмите «Внести партию игл» для фиксации обезвреженных отходов.
								</td>
							</tr>
						) : (
							filtered.map((r) => (
								<tr key={r.id} className="sanpin-log-row" style={{ minHeight: "40px", contentVisibility: "auto", containIntrinsicSize: "1px 40px", contain: "content" }}>
									<td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{r.shiftDateRu}</td>
									<td style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>{r.wasteTypeRu}</td>
									<td style={{ fontSize: "0.825rem" }}>{r.treatmentMethodRu}</td>
									<td>
										<span className="sanpin-tag" style={{ fontSize: "0.825rem", fontWeight: 700, background: "var(--warn-bg)", color: "var(--warn-fg)", border: "1px solid var(--warn-fg)" }}>
											{r.netWeightKg} кг (Класс Б)
										</span>
									</td>
									<td style={{ fontSize: "0.825rem", fontFamily: "monospace" }}>{r.containerCodeRu}</td>
									<td style={{ fontSize: "0.85rem" }}>{r.surrenderedNurseRu}</td>
									<td style={{ fontSize: "0.85rem", fontWeight: 600 }}>{r.acceptedNurseRu}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export { SanpinNeedleDisposalRegisterTab as NeedleDisposalRegisterTab };
