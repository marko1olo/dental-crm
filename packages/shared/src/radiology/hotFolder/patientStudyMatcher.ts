/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL HOT-FOLDER SYNC & RADIOLOGY INTAKE ENGINE
 * Layer 1: Patient & Visit Study Matcher (Barcode, ID, Fuzzy Name & Tooth)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	ActiveVisitContext,
	ExtractedRadiologyMetadata,
	StudyVisitMatchResult,
	VisitMatchStrategy,
} from "./types.js";
import {
	calculateLevenshteinDistance,
	normalizeCyrillicName,
} from "./dicomHeaderParser.js";

/**
 * Сопоставляет извлеченные метаданные снимка со списком активных приёмов клиники.
 */
export function matchRadiologyStudyWithVisits(
	metadata: ExtractedRadiologyMetadata,
	activeVisits: readonly ActiveVisitContext[],
	options?: { minimumConfidence?: number | undefined },
): StudyVisitMatchResult {
	if (!activeVisits || activeVisits.length === 0) {
		return {
			isMatched: false,
			matchedVisit: null,
			confidenceScore: 0,
			matchStrategy: "UNASSIGNED",
			matchDetails: "Нет активных приёмов в системе",
			candidateCount: 0,
		};
	}

	const minConfidence = options?.minimumConfidence ?? 0.6;

	// Стратегия 1: Точное совпадение по штрихкоду визита
	if (metadata.visitBarcode) {
		const normBarcode = metadata.visitBarcode.toUpperCase().replace(/[^0-9A-ZА-Я]/g, "");
		const matched = activeVisits.find((v) => {
			if (!v.visitBarcode) return false;
			const vNorm = v.visitBarcode.toUpperCase().replace(/[^0-9A-ZА-Я]/g, "");
			return (
				vNorm.length > 0 &&
				(vNorm === normBarcode ||
					(vNorm.length >= 3 && normBarcode.includes(vNorm)) ||
					(normBarcode.length >= 3 && vNorm.includes(normBarcode)))
			);
		});
		if (matched) {
			return {
				isMatched: true,
				matchedVisit: matched,
				confidenceScore: 1.0,
				matchStrategy: "EXACT_BARCODE",
				matchDetails: `Точное совпадение по штрихкоду визита: ${metadata.visitBarcode}`,
				candidateCount: 1,
			};
		}
	}

	// Стратегия 2: Точное совпадение по ID визита
	if (metadata.visitId) {
		const normVisitId = metadata.visitId.toUpperCase();
		const matched = activeVisits.find((v) => v.visitId.toUpperCase() === normVisitId);
		if (matched) {
			return {
				isMatched: true,
				matchedVisit: matched,
				confidenceScore: 1.0,
				matchStrategy: "EXACT_VISIT_ID",
				matchDetails: `Точное совпадение по идентификатору визита: ${metadata.visitId}`,
				candidateCount: 1,
			};
		}
	}

	// Стратегия 3: Точное совпадение по номеру карты / ID пациента
	if (metadata.patientCardNumber || metadata.patientId) {
		const targetCard = (metadata.patientCardNumber || metadata.patientId || "").toUpperCase();
		const matched = activeVisits.find(
			(v) =>
				(v.patientCardNumber && v.patientCardNumber.toUpperCase() === targetCard) ||
				v.patientId.toUpperCase() === targetCard,
		);
		if (matched) {
			return {
				isMatched: true,
				matchedVisit: matched,
				confidenceScore: 0.95,
				matchStrategy: "EXACT_PATIENT_CARD",
				matchDetails: `Точное совпадение по номеру карты пациента: ${targetCard}`,
				candidateCount: 1,
			};
		}
	}

	// Стратегия 4 & 5: Сопоставление по ФИО (точное и нечеткое)
	if (metadata.patientLastName || metadata.patientFullName) {
		const targetNorm = normalizeCyrillicName(metadata.patientFullName || metadata.patientLastName);
		const targetTokens = targetNorm.split(/\s+/).filter(Boolean);

		let bestVisit: ActiveVisitContext | null = null;
		let bestScore = 0;
		let bestStrategy: VisitMatchStrategy = "UNASSIGNED";
		let bestDetails = "";
		let candidateCount = 0;

		for (const visit of activeVisits) {
			const visitNorm = normalizeCyrillicName(visit.patientFullName);
			const visitTokens = visitNorm.split(/\s+/).filter(Boolean);

			// Полное совпадение нормализованного ФИО
			if (targetNorm === visitNorm) {
				return {
					isMatched: true,
					matchedVisit: visit,
					confidenceScore: 0.9,
					matchStrategy: "EXACT_NAME_MATCH",
					matchDetails: `Полное совпадение ФИО: ${visit.patientFullName}`,
					candidateCount: 1,
				};
			}

			// Проверка совпадения фамилии
			const targetLastName = targetTokens[0] ?? "";
			const visitLastName = visitTokens[0] ?? "";
			const dist = calculateLevenshteinDistance(targetLastName, visitLastName);

			if (dist === 0 || (dist <= 2 && targetLastName.length >= 4)) {
				candidateCount++;
				let score = 0.75;
				let details = `Нечеткое совпадение по фамилии (${targetLastName} ~ ${visitLastName})`;

				// Проверка совпадения инициала имени
				const targetInit = targetTokens[1]?.[0];
				const visitInit = visitTokens[1]?.[0];
				if (targetInit && visitInit && targetInit === visitInit) {
					score += 0.05;
					details += `, совпадает инициал (${targetInit}.)`;
				}

				// Проверка пересечения номеров зубов в приёме
				if (metadata.toothFdiList.length > 0 && visit.assignedToothList && visit.assignedToothList.length > 0) {
					const hasToothOverlap = metadata.toothFdiList.some((t) => visit.assignedToothList!.includes(t));
					if (hasToothOverlap) {
						score += 0.1;
						details += `, совпадает зуб FDI (${metadata.toothFdiList.join(", ")})`;
					}
				}

				if (score > bestScore) {
					bestScore = score;
					bestVisit = visit;
					bestStrategy = metadata.toothFdiList.length > 0 ? "FUZZY_NAME_AND_TOOTH_MATCH" : "FUZZY_NAME_MATCH";
					bestDetails = details;
				}
			}
		}

		if (bestVisit && bestScore >= minConfidence) {
			return {
				isMatched: true,
				matchedVisit: bestVisit,
				confidenceScore: Math.min(0.95, bestScore),
				matchStrategy: bestStrategy,
				matchDetails: bestDetails,
				candidateCount,
			};
		}
	}

	// Стратегия 6: Фоллбэк — единственный активный приём в кабинете в данный момент
	const inTreatmentVisits = activeVisits.filter((v) => v.status === "in_treatment");
	if (inTreatmentVisits.length === 1 && inTreatmentVisits[0]) {
		const singleVisit = inTreatmentVisits[0];
		return {
			isMatched: true,
			matchedVisit: singleVisit,
			confidenceScore: 0.6,
			matchStrategy: "CABINET_TIME_WINDOW_FALLBACK",
			matchDetails: `Единственный пациент в статусе «в кресле»: ${singleVisit.patientFullName}`,
			candidateCount: 1,
		};
	}

	return {
		isMatched: false,
		matchedVisit: null,
		confidenceScore: 0,
		matchStrategy: "UNASSIGNED",
		matchDetails: "Снимок не удалось сопоставить ни с одним открытым приёмом",
		candidateCount: 0,
	};
}
