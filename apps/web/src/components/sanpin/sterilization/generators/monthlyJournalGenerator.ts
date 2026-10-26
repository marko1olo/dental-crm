import { exportForm257ToCsv, exportPsoToCsv } from "../csvExporters.js";
import {
	generateCombinedInspectionDossierHtml,
	generateForm257PrintHtml,
	generatePso366PrintHtml,
} from "../htmlRenderers.js";
import {
	DEFAULT_CLINIC_REQUISITES,
	type AutoclaveCycleRecord,
	type Form257CycleRecord,
	type KraftPackageItem,
	type MonthlySanpinGenerationOptions,
	type MonthlySanpinJournalBundle,
	type PsoTestRecord,
} from "../types.js";
import { generateDayCycles } from "./monthlyCyclesGenerator.js";
import { computeWorkingDates, MONTH_NAMES_RU } from "./monthlyDatesHelper.js";
import { generateDayPsoAndKraft } from "./monthlyPsoKraftGenerator.js";

export function generateMonthlySanpinJournal(
	options: MonthlySanpinGenerationOptions,
): MonthlySanpinJournalBundle {
	const {
		year,
		month,
		clinicInfo = DEFAULT_CLINIC_REQUISITES,
		primaryOperatorFullName = "Медсестра ЦСО",
		secondaryOperatorFullName = "Оператор стерилизационной",
		includeSaturdays = true,
		includeSundays = false,
		dailyPatientLoadLevel = "standard",
	} = options;

	const monthFormattedRu = `${MONTH_NAMES_RU[month - 1] || "Месяц"} ${year} г.`;
	const workingDates = computeWorkingDates(year, month, includeSaturdays, includeSundays);

	const allCycles: Form257CycleRecord[] = [];
	const allPsoRecords: PsoTestRecord[] = [];
	const allKraftPackages: KraftPackageItem[] = [];

	let globalCycleCounter = 1;
	let globalPsoCounter = 1;
	const loadMultiplier = dailyPatientLoadLevel === "high" ? 1.3 : dailyPatientLoadLevel === "moderate" ? 0.8 : 1.0;

	for (let dayIdx = 0; dayIdx < workingDates.length; dayIdx++) {
		const dateStr = workingDates[dayIdx]!;
		const isAltShift = dayIdx % 2 === 1;
		const operator = isAltShift ? secondaryOperatorFullName : primaryOperatorFullName;

		const dayCycles = generateDayCycles(year, month, dayIdx, dateStr, operator, loadMultiplier, globalCycleCounter);
		allCycles.push(...dayCycles);
		globalCycleCounter += dayCycles.length;

		const { psoRecords, kraftPackages } = generateDayPsoAndKraft(year, month, dayIdx, dateStr, operator, loadMultiplier, globalPsoCounter);
		allPsoRecords.push(...psoRecords);
		allKraftPackages.push(...kraftPackages);
		globalPsoCounter += psoRecords.length;
	}

	const totalPacksCount = allCycles.reduce((acc, c) => acc + c.packsCount, 0);
	const csv257 = exportForm257ToCsv(allCycles);
	const csv366 = exportPsoToCsv(allPsoRecords);
	const printHtml257 = generateForm257PrintHtml(allCycles, clinicInfo);
	const printHtml366 = generatePso366PrintHtml(allPsoRecords, clinicInfo);
	const combinedDossierHtml = generateCombinedInspectionDossierHtml({
		monthFormattedRu,
		cycles: allCycles,
		psoRecords: allPsoRecords,
		clinicInfo,
	});

	return {
		year,
		month,
		monthFormattedRu,
		workingDaysCount: workingDates.length,
		totalCyclesCount: allCycles.length,
		totalPsoTestsCount: allPsoRecords.length,
		totalPacksCount,
		cycles: allCycles,
		psoRecords: allPsoRecords,
		kraftPackages: allKraftPackages,
		clinicInfo,
		csv257,
		csv366,
		printHtml257,
		printHtml366,
		combinedDossierHtml,
	};
}
