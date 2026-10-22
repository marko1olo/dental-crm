import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	calculatePeriodDateRange,
	calculateRetroactiveBatchStats,
	generateRetroactiveSanpinDays,
	type PeriodPreset,
	type RetroactiveDayRecord,
	type RetroactiveGenerationOptions,
	STATUTORY_CLINIC_CABINETS,
} from "../retroactiveSanpinEngine";
import { exportRetroactiveCsvAction, printRetroactiveDossierAction } from "./retroactiveExportActions";
import { saveRetroactiveBatchAction } from "./retroactiveSaveAction";

export function useRetroactiveBatchState({
	initialPreset = "current_month",
	sterilizerModel,
	onSuccess,
}: {
	initialPreset?: PeriodPreset | undefined;
	sterilizerModel: string;
	onSuccess?: (() => void) | undefined;
}) {
	const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(initialPreset);
	const [customStartDate, setCustomStartDate] = useState<string>(() => {
		const d = new Date();
		return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
	});
	const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [selectedCabinetIds, setSelectedCabinetIds] = useState<string[]>([
		"cabinet_1", "cabinet_2", "cabinet_3", "sterilization_room",
	]);
	const [nurseFullName, setNurseFullName] = useState("Медсестра ЦСО");
	const [nursePosition, setNursePosition] = useState("Медсестра ЦСО / Старшая медсестра");
	const [autoclaveRegimeId, setAutoclaveRegimeId] = useState<
		"steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min"
	>("steam_134_5min");
	const [excludeSundays, setExcludeSundays] = useState(true);
	const [averageVisitsPerCab, setAverageVisitsPerCab] = useState(6);
	const [generatedDays, setGeneratedDays] = useState<RetroactiveDayRecord[]>([]);
	const [isGenerated, setIsGenerated] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterOnlyWorkdays, setFilterOnlyWorkdays] = useState(false);

	const currentPeriodBounds = useMemo(() => {
		return calculatePeriodDateRange(periodPreset, customStartDate, customEndDate);
	}, [periodPreset, customStartDate, customEndDate]);

	const handleGenerateBatch = () => {
		const options: RetroactiveGenerationOptions = {
			preset: periodPreset, startDate: customStartDate, endDate: customEndDate,
			selectedCabinets: selectedCabinetIds, dutyNurseFullName: nurseFullName,
			dutyNursePosition: nursePosition, autoclaveRegimeId, sterilizerModelName: sterilizerModel,
			excludeSundays, averageVisitsPerCabinetDay: averageVisitsPerCab,
		};
		const days = generateRetroactiveSanpinDays(options);
		setGeneratedDays(days);
		setIsGenerated(true);
		const bStats = calculateRetroactiveBatchStats(days);
		showToast(`Журналы СанПиН рассчитаны: ${days.length} смен (${bStats.workingDaysCount} раб.), ${bStats.totalTraysProcessed} лотков`, "success");
	};

	const toggleCabinet = (cabId: string) => {
		setSelectedCabinetIds((prev) => prev.includes(cabId) ? prev.filter((id) => id !== cabId) : [...prev, cabId]);
	};
	const selectAllCabinets = () => setSelectedCabinetIds(STATUTORY_CLINIC_CABINETS.map((c) => c.id));

	const filteredDays = useMemo(() => {
		return generatedDays.filter((day) => {
			if (filterOnlyWorkdays && !day.isWorkingDay) return false;
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return day.date.includes(q) || day.dayOfWeekRu.toLowerCase().includes(q) || day.cabinetsListRu.toLowerCase().includes(q) || day.nurseFullName.toLowerCase().includes(q) || day.notes.toLowerCase().includes(q);
		});
	}, [generatedDays, filterOnlyWorkdays, searchQuery]);

	const stats = useMemo(() => calculateRetroactiveBatchStats(generatedDays), [generatedDays]);

	const handleSaveToRegisters = async () => {
		setIsSaving(true);
		try {
			await saveRetroactiveBatchAction({
				generatedDays, periodLabelRu: currentPeriodBounds.labelRu, nurseFullName,
				workingDaysCount: stats.workingDaysCount, onSuccess, onDaysUpdated: setGeneratedDays,
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handlePrintDossier = () => printRetroactiveDossierAction({ generatedDays, periodLabelRu: currentPeriodBounds.labelRu, nurseFullName });
	const handleExportCsv = () => exportRetroactiveCsvAction({ generatedDays, startDate: currentPeriodBounds.startDate, endDate: currentPeriodBounds.endDate });

	return {
		periodPreset, setPeriodPreset, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate,
		selectedCabinetIds, toggleCabinet, selectAllCabinets, nurseFullName, setNurseFullName,
		nursePosition, setNursePosition, autoclaveRegimeId, setAutoclaveRegimeId, excludeSundays,
		setExcludeSundays, averageVisitsPerCab, setAverageVisitsPerCab, generatedDays, setGeneratedDays,
		isGenerated, isSaving, searchQuery, setSearchQuery, filterOnlyWorkdays, setFilterOnlyWorkdays,
		currentPeriodBounds, handleGenerateBatch, filteredDays, stats,
		handleSaveToRegisters, handlePrintDossier, handleExportCsv,
	};
}
