import { Check, Plus, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface BacLabRecord {
	id: string;
	actNumberRu: string;
	sampleDate: string;
	targetObjectRu: string;
	pathogensTestedRu: string;
	resultRu: string;
	labNameRu: string;
	statusRu: string;
}

function getRecentIsoDate(daysOffset = 0): string {
	const d = new Date(Date.now() + daysOffset * 86400000);
	return d.toISOString().slice(0, 10);
}

export const DEFAULT_BAC_LAB_RECORDS: BacLabRecord[] = [
	{
		id: "bac-01",
		actNumberRu: "Акт № 264/С",
		sampleDate: getRecentIsoDate(-4),
		targetObjectRu: "Наконечник турбинный и угловой после автоклавирования",
		pathogensTestedRu: "БГКП, Staphylococcus aureus, спорообразующие бациллы",
		resultRu: "Рост микрофлоры отсутствует (100% стерильно)",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
	{
		id: "bac-02",
		actNumberRu: "Акт № 265/С",
		sampleDate: getRecentIsoDate(-4),
		targetObjectRu: "Столик врача, подголовник кресла, светильник (Кабинет 1)",
		pathogensTestedRu: "ОМЧ, БГКП, синегнойная палочка (Pseudomonas)",
		resultRu: "ОМЧ < 10 КОЕ/см², патогенная микрофлора не выделена",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
	{
		id: "bac-03",
		actNumberRu: "Акт № 266/С",
		sampleDate: getRecentIsoDate(-9),
		targetObjectRu: "Крафт-пакет хирургический базовый (контроль стерильности)",
		pathogensTestedRu: "Аэробные и факультативно-анаэробные бактерии",
		resultRu: "Стерильность подтверждена, посев стерилен",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
	{
		id: "bac-04",
		actNumberRu: "Акт № 267/С",
		sampleDate: getRecentIsoDate(-14),
		targetObjectRu: "Проба воздуха рабочей зоны при включенном Дезар-4",
		pathogensTestedRu: "Общее микробное число (ОМЧ) в 1 м³ воздуха",
		resultRu: "ОМЧ = 120 КОЕ/м³ (норматив до 500 КОЕ/м³ соблюден)",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
];

export function SanpinBacLabRegisterTab() {
	const [query, setQuery] = useState("");
	const [records, setRecords] = useState<BacLabRecord[]>(() =>
		isDemoShowcaseMode() ? DEFAULT_BAC_LAB_RECORDS : []
	);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return records;
		return records.filter(
			(r) =>
				r.actNumberRu.toLowerCase().includes(q) ||
				r.targetObjectRu.toLowerCase().includes(q)
		);
	}, [records, query]);

	const handleAddProtocol = () => {
		const nextActNum = 268 + records.length - DEFAULT_BAC_LAB_RECORDS.length;
		const newRecord: BacLabRecord = {
			id: `bac-${Date.now()}`,
			actNumberRu: `Акт № ${nextActNum}/С`,
			sampleDate: getRecentIsoDate(0),
			targetObjectRu: "Операционный блок: смыв со столика хирурга и наконечника после автоклава",
			pathogensTestedRu: "ОМЧ, БГКП, Staphylococcus aureus, спорообразующие бациллы",
			resultRu: "Рост микрофлоры отсутствует (100% стерильно)",
			labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
			statusRu: "Протокол утвержден",
		};
		setRecords((prev) => [newRecord, ...prev]);
		showToast("Протокол смывов аккредитованной лаборатории зарегистрирован!", "success");
	};

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ ПРОВЕРКИ СТЕРИЛЬНОСТИ (СМЫВЫ)</h2>
				<p title="Контроль чистоты и бактериологические исследования">Контроль стерильности и санитарно-бактериологические исследования</p>
			</div>

			<div className="sanpin-control-bar" style={{ minHeight: "36px", margin: "0.4rem 0" }}>
				<div className="sanpin-filter-group">
					<div className="dente-search-wrap" style={{ minWidth: "260px" }}>
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							placeholder="Поиск по акту, объекту смыва..."
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
						onClick={handleAddProtocol}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "34px", height: "34px", padding: "0.35rem 0.85rem", fontSize: "0.825rem", fontWeight: 700, background: "var(--teal)", color: "var(--on-teal, #fff)", border: "none" }}
					>
						<Plus size={15} /> Внести протокол смывов
					</button>
				</div>
			</div>

			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>№ Протокола / Акт</th>
							<th style={{ fontSize: "0.85rem" }}>Дата забора</th>
							<th style={{ fontSize: "0.85rem" }}>Объект контроля / Смыв</th>
							<th style={{ fontSize: "0.85rem" }}>Определяемые патогены</th>
							<th style={{ fontSize: "0.85rem" }}>Результат посева</th>
							<th style={{ fontSize: "0.85rem" }}>Аккредитованная лаборатория</th>
							<th style={{ fontSize: "0.85rem" }}>Статус</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<tr>
								<td colSpan={7} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--muted)" }}>
									Журнал бактериологических исследований пуст. Нажмите «Внести протокол смывов» для регистрации акта лаборатории.
								</td>
							</tr>
						) : (
							filtered.map((r) => (
								<tr key={r.id} className="sanpin-log-row" style={{ minHeight: "40px", contentVisibility: "auto", containIntrinsicSize: "1px 40px", contain: "content" }}>
									<td style={{ fontWeight: 700, color: "var(--ink)" }}>{r.actNumberRu}</td>
									<td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{r.sampleDate}</td>
									<td style={{ fontSize: "0.875rem", fontWeight: 600 }}>{r.targetObjectRu}</td>
									<td style={{ fontSize: "0.825rem" }}>{r.pathogensTestedRu}</td>
									<td>
										<span style={{ fontSize: "0.825rem", color: "var(--ok-fg)", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
											<Check size={13} /> {r.resultRu}
										</span>
									</td>
									<td style={{ fontSize: "0.825rem", color: "var(--muted)" }}>{r.labNameRu}</td>
									<td>
										<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.8rem" }}>
											{r.statusRu}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export { SanpinBacLabRegisterTab as BacLabRegisterTab };
