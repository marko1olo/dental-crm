import { Droplets, Plus, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import {
	type DisinfectantSolutionRecord,
	DEFAULT_DISINFECTANT_RECORDS,
	getRecentDateTimeRu,
	getRecentIsoDate,
} from "./disinfectants/disinfectantTypes";
import { DisinfectantTable } from "./disinfectants/DisinfectantTable";
import { DisinfectantMobileCards } from "./disinfectants/DisinfectantMobileCards";

export * from "./disinfectants/disinfectantTypes";

export function SanpinDisinfectantsRegisterTab() {
	const [query, setQuery] = useState("");
	const [records, setRecords] = useState<DisinfectantSolutionRecord[]>(() =>
		isDemoShowcaseMode() ? DEFAULT_DISINFECTANT_RECORDS : []
	);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return records;
		return records.filter(
			(r) => r.tradeNameRu.toLowerCase().includes(q) || r.purposeRu.toLowerCase().includes(q)
		);
	}, [records, query]);

	const handleAddSolution = () => {
		const now = new Date();
		const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
		const newRecord: DisinfectantSolutionRecord = {
			id: `ds-${Date.now()}`,
			tradeNameRu: "Аламинол (раствор 1.5%)",
			purposeRu: "Текущая предстерилизационная очистка и дезинфекция инструментов (ЦСО)",
			concentrationPercent: 1.5,
			preparationDate: `${getRecentIsoDate(0)} ${timeStr}`,
			expiryDate: getRecentDateTimeRu(14, timeStr),
			testStripResultRu: "Дезиконт-Аламинол: 1.5% норма (тест пройден)",
			responsibleNurseRu: "Медсестра ЦСО",
			volumeLiters: 5,
		};
		setRecords((prev) => [newRecord, ...prev]);
		showToast("Рабочий дезраствор зарегистрирован (активен 14 суток)", "success");
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
		<div className="sanpin-tab-content space-y-3">
			<style>{`
				.sanpin-disinf-desktop { display: block; }
				.sanpin-disinf-mobile { display: none; }
				@media (max-width: 768px) {
					.sanpin-disinf-desktop { display: none !important; }
					.sanpin-disinf-mobile { display: block !important; }
				}
			`}</style>

			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="dente-search-wrap min-w-[260px] flex-1 max-w-sm">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по препарату, назначению..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="dente-search-input"
					/>
					{query && (
						<button type="button" className="dente-search-clear" onClick={() => setQuery("")} aria-label="Очистить">
							<X size={12} />
						</button>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleAddSolution}
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
					>
						<Plus size={14} /> Приготовить раствор
					</button>
					<button
						type="button"
						onClick={handleVerifyTestStrips}
						className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
					>
						<Droplets size={14} /> Экспресс-контроль полосками
					</button>
				</div>
			</div>

			<div className="sanpin-disinf-desktop">
				<DisinfectantTable records={filtered} />
			</div>
			<div className="sanpin-disinf-mobile">
				<DisinfectantMobileCards records={filtered} />
			</div>
		</div>
	);
}

export { SanpinDisinfectantsRegisterTab as DisinfectantsRegisterTab };
export default SanpinDisinfectantsRegisterTab;
