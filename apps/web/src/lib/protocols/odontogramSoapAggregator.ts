import type {
	DiaryState,
	OdontogramFindingInput,
	ClinicalProtocolSoap,
} from "./protocolTypes.js";
import {
	getToothAnatomicalNameRu,
	normalizeFdiToothList,
} from "./fdiAnatomy.js";
import { generateTherapySoap } from "./therapyProtocols.js";
import { generateSurgerySoap } from "./surgeryProtocols.js";
import { generateProsthoSoap } from "./prosthoProtocols.js";
import { generatePerioSoap } from "./perioAndHygieneProtocols.js";
import { generatePediatricSoap } from "./anesthesiaAndPediatrics.js";

/**
 * Генерация структурированного клинического протокола SOAP (Форма 043/у)
 * из находки на одонтограмме. Координирует специализированные субмодули.
 */
export function generateSoapFromOdontogramFinding(
	finding: OdontogramFindingInput,
): ClinicalProtocolSoap {
	// 1. ТАБУ СОЗДАТЕЛЯ: Педиатрия (молочные зубы)
	const pediatric = generatePediatricSoap(finding);
	if (pediatric) return pediatric;

	// 2. Терапия (кариес, пульпит, периодонтит, пломбы)
	const therapy = generateTherapySoap(finding);
	if (therapy) return therapy;

	// 3. Пародонтология и гигиена (гингивит, пародонтит, зубные отложения)
	const perio = generatePerioSoap(finding);
	if (perio) return perio;

	// 4. Хирургия (удаление, имплантат, синус-лифтинг)
	const surgery = generateSurgerySoap(finding);
	if (surgery) return surgery;

	// 5. Ортопедия (коронки, мосты, виниры, вкладки)
	const prostho = generateProsthoSoap(finding);
	if (prostho) return prostho;

	// 6. Здоровый зуб / плановый осмотр нормы (Z01.2)
	const tooth = finding.toothNumber;
	const toothTitle = getToothAnatomicalNameRu(tooth);
	const icd = finding.icd10Override || "Z01.2";
	return {
		toothNumber: tooth,
		toothNameRu: toothTitle,
		diagnosisIcd10: icd,
		diagnosisIcd10Label: "Стоматологическое обследование",
		diagnosisTooth: String(tooth),
		anamnesis: `Жалоб со стороны зуба ${toothTitle} пациент не предъявляет. Профилактический осмотр.`,
		statusLocalis: `Зуб ${toothTitle}: Интактен. Твердые ткани без кариозных поражений. Зондирование безболезненно. Десна плотно прилежит.`,
		treatmentDescription: `Зуб ${tooth}: Профилактический осмотр. Очищение поверхности, покрытие фторлаком.`,
		recommendations: "Регулярная гигиена 2 раза в день, профилактический осмотр через 6 месяцев.",
	};
}

export function getIcdPriority(code: string): number {
	const c = (code || "").toUpperCase();
	if (c.startsWith("K04.0")) return 100;
	if (c.startsWith("K04.4")) return 90;
	if (c.startsWith("K04.5") || c.startsWith("K04")) return 80;
	if (c.startsWith("K02.1") || c.startsWith("K02.2")) return 70;
	if (c.startsWith("K02.0") || c.startsWith("K02")) return 65;
	if (c.startsWith("K01.1") || c.startsWith("K08.1")) return 60;
	if (c.startsWith("K05.3") || c.startsWith("K05.0") || c.startsWith("K05")) return 50;
	if (c.startsWith("Z51")) return 40;
	if (c.startsWith("Z01")) return 30;
	return 10;
}

/** Автоматическое заполнение SOAP-дневника из набора зубов одонтограммы */
export function generateSoapFromOdontogramStates(
	states: readonly {
		toothNumber: number;
		state: string;
		surfaces?: readonly string[] | null | undefined;
		subType?: string | undefined;
		pocketDepthMm?: number | undefined;
		icd10Override?: string | undefined;
		notes?: string | undefined;
	}[],
): Partial<DiaryState> {
	const nonHealthy = states.filter((s) => {
		const norm = (s.state || "").toLowerCase();
		return norm !== "healthy" && norm !== "" && norm !== "0";
	});

	if (nonHealthy.length === 0) {
		return {
			anamnesis: "",
			statusLocalis: "",
			diagnosisIcd10: "",
			diagnosisTooth: "",
			treatmentDescription: "",
		};
	}

	const sorted = [...nonHealthy].sort((a, b) => {
		const quadA = Math.floor(a.toothNumber / 10);
		const quadB = Math.floor(b.toothNumber / 10);
		if (quadA !== quadB) return quadA - quadB;
		if (quadA === 1 || quadA === 5 || quadA === 3 || quadA === 7) {
			return b.toothNumber - a.toothNumber;
		}
		return a.toothNumber - b.toothNumber;
	});

	const anamnesisParts: string[] = [];
	const statusLocalisParts: string[] = [];
	const treatmentParts: string[] = [];
	const teethList: number[] = [];
	const icdCodes: string[] = [];
	const recommendationsList: string[] = [];

	for (const item of sorted) {
		const soap = generateSoapFromOdontogramFinding({
			toothNumber: item.toothNumber,
			state: item.state,
			...(item.surfaces ? { surfaces: item.surfaces } : {}),
			...(item.subType ? { subType: item.subType } : {}),
			...(item.pocketDepthMm !== undefined ? { pocketDepthMm: item.pocketDepthMm } : {}),
			...(item.icd10Override ? { icd10Override: item.icd10Override } : {}),
		});

		teethList.push(item.toothNumber);
		if (soap.diagnosisIcd10 && !icdCodes.includes(soap.diagnosisIcd10)) {
			icdCodes.push(soap.diagnosisIcd10);
		}

		if (sorted.length === 1) {
			if (soap.anamnesis) anamnesisParts.push(soap.anamnesis);
			if (soap.statusLocalis) statusLocalisParts.push(soap.statusLocalis);
			if (soap.treatmentDescription) treatmentParts.push(soap.treatmentDescription);
		} else {
			if (soap.anamnesis) anamnesisParts.push(`• Зуб ${soap.toothNameRu}: ${soap.anamnesis}`);
			if (soap.statusLocalis) statusLocalisParts.push(`• Зуб ${soap.toothNameRu}: ${soap.statusLocalis}`);
			if (soap.treatmentDescription) treatmentParts.push(`• Зуб ${soap.toothNumber}: ${soap.treatmentDescription}`);
		}

		if (soap.recommendations && !recommendationsList.includes(soap.recommendations)) {
			recommendationsList.push(soap.recommendations);
		}
	}

	const sortedIcd = [...icdCodes].sort((a, b) => getIcdPriority(b) - getIcdPriority(a));

	let formattedTreatment = treatmentParts.join("\n\n");
	if (sorted.length > 1 && recommendationsList.length > 0) {
		formattedTreatment += `\n\nРекомендации пациенту:\n${recommendationsList
			.map((r) => (r.startsWith("•") || r.startsWith("1.") ? r : `• ${r}`))
			.join("\n")}`;
	}

	return {
		anamnesis:
			sorted.length > 1
				? `Жалобы и анамнез по результатам осмотра:\n${anamnesisParts.join("\n\n")}`
				: anamnesisParts.join("\n\n"),
		statusLocalis:
			sorted.length > 1
				? `Объективный стоматологический статус (Status Localis):\n${statusLocalisParts.join("\n\n")}`
				: statusLocalisParts.join("\n\n"),
		diagnosisIcd10: sortedIcd[0] ?? "K02.1",
		diagnosisTooth: normalizeFdiToothList(teethList),
		treatmentDescription: formattedTreatment,
	};
}
