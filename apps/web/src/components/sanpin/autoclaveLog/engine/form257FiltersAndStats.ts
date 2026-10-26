import { checkNextBioControlDeadline } from "./sterilizationCycleValidator.js";
import type {
	BiologicalControlTestRecord,
	Form257FilterCriteria,
	Form257Record,
	SterilizerStatisticsSummary,
} from "./types.js";

export function filterSterilizationRecords(
	records: readonly Form257Record[],
	criteria: Form257FilterCriteria,
): Form257Record[] {
	return records.filter((rec) => {
		if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
			const query = criteria.searchQuery.trim().toLowerCase();
			const matchId = rec.id.toLowerCase().includes(query);
			const matchItems = rec.itemsDescriptionRu.toLowerCase().includes(query);
			const matchOperator = rec.operatorStaffFullName.toLowerCase().includes(query);
			const matchSterilizer = rec.sterilizerBrandModel.toLowerCase().includes(query) || rec.sterilizerCode.toLowerCase().includes(query);
			if (!matchId && !matchItems && !matchOperator && !matchSterilizer) return false;
		}

		if (criteria.startDate && rec.date < criteria.startDate) return false;
		if (criteria.endDate && rec.date > criteria.endDate) return false;
		if (criteria.sterilizerId && criteria.sterilizerId !== "all" && rec.sterilizerId !== criteria.sterilizerId) return false;
		if (criteria.regimeId && criteria.regimeId !== "all" && rec.regimeId !== criteria.regimeId) return false;
		if (criteria.status && criteria.status !== "all" && rec.status !== criteria.status) return false;

		return true;
	});
}

export function calculateSterilizerStatistics(
	records: readonly Form257Record[],
	bioRecords: readonly BiologicalControlTestRecord[] = [],
): SterilizerStatisticsSummary {
	const totalCycles = records.length;
	let successfulCycles = 0;
	let failedCycles = 0;
	let totalPacksProcessed = 0;
	const cyclesByRegime: Record<string, number> = {};
	const cyclesBySterilizer: Record<string, number> = {};

	for (const rec of records) {
		if (rec.isCyclePassed) successfulCycles++;
		else failedCycles++;

		totalPacksProcessed += rec.packsCount;
		cyclesByRegime[rec.regimeId] = (cyclesByRegime[rec.regimeId] ?? 0) + 1;
		cyclesBySterilizer[rec.sterilizerCode] = (cyclesBySterilizer[rec.sterilizerCode] ?? 0) + 1;
	}

	const successRatePercent = totalCycles > 0 ? Number(((successfulCycles / totalCycles) * 100).toFixed(1)) : 100;
	const bioTestsTotal = bioRecords.length;
	let bioTestsPassed = 0;
	let bioTestsFailed = 0;
	for (const bio of bioRecords) {
		if (bio.result === "sterile_passed") bioTestsPassed++;
		if (bio.result === "growth_failed") bioTestsFailed++;
	}

	const sortedBio = [...bioRecords].sort((a, b) => b.dateReadout.localeCompare(a.dateReadout));
	const latestBio = sortedBio[0];
	const bioDeadline = checkNextBioControlDeadline(latestBio ? latestBio.dateReadout : "2026-01-01");

	return {
		totalCycles,
		successfulCycles,
		failedCycles,
		successRatePercent,
		totalPacksProcessed,
		cyclesByRegime,
		cyclesBySterilizer,
		bioTestsTotal,
		bioTestsPassed,
		bioTestsFailed,
		nextBioControlOverdue: bioDeadline.isOverdue,
		daysUntilNextBioControl: bioDeadline.daysRemaining,
	};
}

export { filterSterilizationRecords as filterForm257Records };
