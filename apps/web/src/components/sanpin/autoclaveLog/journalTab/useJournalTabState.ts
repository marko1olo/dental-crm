import { useMemo, useState } from "react";
import {
	detectMissingSterilizationDays,
	exportForm257ToCsv,
	filterForm257Records,
	generateBatchForm257Records,
	generateForm257PrintHtml,
	generateRegulatorySanpinInspectionHtml,
	type ClinicLegalInfo,
	type Form257FilterCriteria,
	type Form257Record,
	type MissingSterilizationDaysAuditResult,
} from "../autoclaveLogEngine.js";
import type { SterilizationRegimeId } from "../autoclaveLogPresets.js";

export function useJournalTabState(
	records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo,
	activeClinicalDates?: readonly string[],
	onBatchAddRecords?: (records: Form257Record[]) => void,
) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSterilizerId, setSelectedSterilizerId] = useState("all");
	const [selectedRegimeId, setSelectedRegimeId] = useState("all");
	const [selectedStatus, setSelectedStatus] = useState<"all" | "sterile_passed" | "rejected_defect">("all");
	const [periodPreset, setPeriodPreset] = useState("all");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const filterCriteria: Form257FilterCriteria = useMemo(() => ({
		searchQuery: searchQuery || undefined,
		sterilizerId: selectedSterilizerId !== "all" ? selectedSterilizerId : undefined,
		regimeId: selectedRegimeId !== "all" ? (selectedRegimeId as SterilizationRegimeId) : undefined,
		status: selectedStatus !== "all" ? selectedStatus : undefined,
		startDate: startDate || undefined,
		endDate: endDate || undefined,
	}), [searchQuery, selectedSterilizerId, selectedRegimeId, selectedStatus, startDate, endDate]);

	const filteredRecords = useMemo(() => filterForm257Records(records, filterCriteria), [records, filterCriteria]);

	const getDynamicDateBounds = () => {
		const now = new Date();
		const currentY = now.getFullYear();
		const currentM = now.getMonth();
		const pad = (n: number) => String(n).padStart(2, "0");
		const daysInCurMonth = new Date(currentY, currentM + 1, 0).getDate();
		return {
			now, currentY, currentM, pad,
			today: `${currentY}-${pad(currentM + 1)}-${pad(now.getDate())}`,
			currentMonthStart: `${currentY}-${pad(currentM + 1)}-01`,
			currentMonthEnd: `${currentY}-${pad(currentM + 1)}-${pad(daysInCurMonth)}`,
			currentMonthNameRu: now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
		};
	};

	const handlePresetChange = (preset: string) => {
		setPeriodPreset(preset);
		const { now, currentY, currentM, pad, today, currentMonthStart, currentMonthEnd } = getDynamicDateBounds();
		if (preset === "all") { setStartDate(""); setEndDate(""); }
		else if (preset === "today") { setStartDate(today); setEndDate(today); }
		else if (preset === "week") {
			const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
			const mon = new Date(now); mon.setDate(now.getDate() + diff);
			const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
			setStartDate(`${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`);
			setEndDate(`${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`);
		} else if (preset === "current_month") { setStartDate(currentMonthStart); setEndDate(currentMonthEnd); }
		else if (preset === "prev_month") {
			const prevD = new Date(currentY, currentM - 1, 1);
			const days = new Date(prevD.getFullYear(), prevD.getMonth() + 1, 0).getDate();
			setStartDate(`${prevD.getFullYear()}-${pad(prevD.getMonth() + 1)}-01`);
			setEndDate(`${prevD.getFullYear()}-${pad(prevD.getMonth() + 1)}-${pad(days)}`);
		}
	};

	const periodLabel = useMemo(() => {
		if (startDate && endDate) return startDate === endDate ? `за ${startDate}` : `с ${startDate} по ${endDate}`;
		if (startDate) return `с ${startDate}`;
		if (endDate) return `по ${endDate}`;
		return "за всё время";
	}, [startDate, endDate]);

	const missingDaysAudit: MissingSterilizationDaysAuditResult | null = useMemo(() => {
		if (activeClinicalDates && activeClinicalDates.length > 0) return detectMissingSterilizationDays(records, activeClinicalDates);
		if (startDate && endDate && startDate !== endDate) {
			const dates: string[] = [];
			const [sY, sM, sD] = startDate.split("-").map(Number);
			const [eY, eM, eD] = endDate.split("-").map(Number);
			if (sY && sM && sD && eY && eM && eD) {
				const startUtc = Date.UTC(sY, sM - 1, sD);
				const endUtc = Date.UTC(eY, eM - 1, eD);
				for (let t = startUtc; t <= endUtc; t += 86400000) {
					const d = new Date(t);
					if (d.getUTCDay() !== 0) dates.push(d.toISOString().slice(0, 10));
				}
			}
			if (dates.length > 0) return detectMissingSterilizationDays(records, dates);
		}
		return null;
	}, [records, activeClinicalDates, startDate, endDate]);

	return {
		searchQuery, setSearchQuery, selectedSterilizerId, setSelectedSterilizerId,
		selectedRegimeId, setSelectedRegimeId, selectedStatus, setSelectedStatus,
		periodPreset, setPeriodPreset, startDate, setStartDate, endDate, setEndDate,
		filteredRecords, missingDaysAudit, handlePresetChange, periodLabel, getDynamicDateBounds,
	};
}
