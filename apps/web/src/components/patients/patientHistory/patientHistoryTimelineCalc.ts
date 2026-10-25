import {
	type ClinicalSpecialty,
	type ClinicalVisitItem,
	type HistoryTimelineGroup,
	type PatientHistoryFinancialSummaryData,
} from "./types";

export function filterVisits(
	visits: ClinicalVisitItem[],
	selectedSpecialty: ClinicalSpecialty,
	searchQuery: string,
): ClinicalVisitItem[] {
	const query = searchQuery.trim().toLowerCase();
	return visits.filter((item) => {
		if (selectedSpecialty !== "all" && item.specialty !== selectedSpecialty) {
			return false;
		}

		if (query) {
			const toothMatches = item.toothNumber
				? String(item.toothNumber).toLowerCase().includes(query)
				: false;
			const diagnosisCodeMatches = item.diagnosisCode.toLowerCase().includes(query);
			const diagnosisTitleMatches = item.diagnosisTitle.toLowerCase().includes(query);
			const doctorMatches = item.doctorName.toLowerCase().includes(query);
			const protocolMatches = (item.treatmentProtocol || "").toLowerCase().includes(query);
			const complaintsMatches = (item.complaints || "").toLowerCase().includes(query);

			if (
				!toothMatches &&
				!diagnosisCodeMatches &&
				!diagnosisTitleMatches &&
				!doctorMatches &&
				!protocolMatches &&
				!complaintsMatches
			) {
				return false;
			}
		}

		return true;
	});
}

export function groupVisitsByMonth(visits: ClinicalVisitItem[]): HistoryTimelineGroup[] {
	const groups: HistoryTimelineGroup[] = [];
	const groupMap = new Map<string, HistoryTimelineGroup>();

	for (const visit of visits) {
		const key = `${visit.year}-${String(visit.monthNumber).padStart(2, "0")}`;
		let group = groupMap.get(key);
		if (!group) {
			group = {
				monthKey: key,
				monthNameRu: visit.monthNameRu,
				year: visit.year,
				monthNumber: visit.monthNumber,
				totalAmountRub: 0,
				items: [],
			};
			groupMap.set(key, group);
			groups.push(group);
		}
		group.items.push(visit);
		group.totalAmountRub += visit.amountRub;
	}

	groups.sort((a, b) => {
		if (a.year !== b.year) return b.year - a.year;
		return b.monthNumber - a.monthNumber;
	});

	return groups;
}

export function calculateHistoryFinancialSummary(visits: ClinicalVisitItem[]): PatientHistoryFinancialSummaryData {
	let totalBilledRub = 0;
	let totalPaidRub = 0;
	let totalPendingRub = 0;
	let warrantiesCount = 0;

	for (const v of visits) {
		totalBilledRub += v.amountRub;
		if (v.isPaid) {
			totalPaidRub += v.amountRub;
		} else {
			totalPendingRub += v.amountRub;
		}
		if (v.warrantyStatus === "active") {
			warrantiesCount++;
		}
	}

	return {
		totalBilledRub,
		totalPaidRub,
		totalPendingRub,
		visitsCount: visits.length,
		warrantiesCount,
	};
}
