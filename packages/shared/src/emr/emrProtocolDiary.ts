/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U STATUTORY PROTOCOL AUTO-GENERATOR & DIARY ENGINE
 * Implementation according to Order of the Ministry of Health № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	type FdiToothRecord,
	type ToothSurface,
	type ToothClinicalStatusCode,
	type SoapVisitDiary,
	type FullForm043uPayload,
	toothStatusCodeLabels,
	toothStatusCodeShortMap,
} from "../documents/forms043u.js";

export type { FdiToothRecord, ToothSurface, ToothClinicalStatusCode, SoapVisitDiary, FullForm043uPayload };
import {
	type ClinicalProtocolTemplate,
	type ClinicalSpecialtyKind,
	type StatutoryAnestheticDrug,
	type LocalAnesthesiaType,
	type BlackCavityClass,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	COMPANION_ICD10_CODES,
	anestheticDrugLabels,
	statutoryAnestheticDrugLabels,
	blackCavityClassLabels,
	getClinicalProtocolTemplate,
} from "./emrProtocolPresets.js";

export type { StatutoryAnestheticDrug };
export { anestheticDrugLabels, statutoryAnestheticDrugLabels };

import {
	getOrder804nServicesForClinicalCase,
	calculateOrder804nBillingEstimate,
	getCanalCountForTooth,
	type Order804nBillingLineItem,
	type Order804nBillingEstimateResult,
} from "../toothCanalsAndBilling804n.js";


/** Дневниковая запись одного посещения (SOAP формат по Приказу № 834н) */
export interface VisitDiaryEntry043 {
	id: string;
	entryDate: string;
	entryTime?: string | null;
	toothNumber?: string | null; // Номер зуба по FDI (11-48, 51-85)
	subjectiveComplaints: string; // S: Жалобы и динамика
	objectiveStatusLocalis: string; // O: Status localis, данные осмотра
	percussionVertical?: "negative" | "positive_mild" | "positive_sharp";
	percussionHorizontal?: "negative" | "positive_mild" | "positive_sharp";
	probingTenderness?: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
	thermalTestResponse?: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
	eodMicroamperes?: number | null; // ЭОД в мкА
	probingPocketDepthMm?: number | null; // Глубина зондирования кармана в мм
	assessmentDiagnosisText: string; // A: Клинический диагноз
	assessmentIcd10Code: string; // Код МКБ-10
	procedureProtocol: string; // P: Протокол проведенного лечения
	anesthesiaDetails?: string | null; // Анестетик, доза, метод
	appliedMaterials?: string | null; // Пломбировочные, эндодонтические, костные материалы
	homeCareRecommendations?: string | null; // Рекомендации и назначения на дом
	prescribedMedications?: string | null; // Выписанные рецепты (Форма 107-1/у)
	nextVisitDate?: string | null;
	doctorFullName: string;
	doctorSpecialty?: string | null;
	digitalSignatureHash?: string | null; // Хэш УКЭП (ГОСТ Р 34.10 / SHA-256)
	isSignedWithUkep?: boolean;
}

/** Запрос на генерацию дневниковой записи */
export interface ClinicalDiarySynthesisRequest {
	readonly toothNumber?: number | string | null | undefined;
	readonly icd10Code: string;
	readonly surfaces?: readonly ToothSurface[] | null | undefined;
	readonly blackClass?: BlackCavityClass | null | undefined;
	readonly rootCanalsCount?: number | null | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly dateStr?: string | null | undefined;
	readonly timeStr?: string | null | undefined;
	readonly customAnesthesia?: {
		drug?: StatutoryAnestheticDrug | string | null | undefined;
		doseCarpules?: number | null | undefined;
		doseMl?: number | null | undefined;
		technique?: LocalAnesthesiaType | null | undefined;
	} | null | undefined;

	readonly customMaterials?: readonly string[] | null | undefined;
	readonly customComplaints?: string | null | undefined;
	readonly customObjectiveNotes?: string | null | undefined;
	readonly customProtocolNotes?: string | null | undefined;
	readonly isMultiVisitEndo?: boolean | undefined;
	readonly endoVisitStage?: "access_instrumentation_temporary_calcium" | "final_obturation_restoration" | "single_visit_complete" | undefined;
}

/** Результат аудита соответствия Приказу Минздрава № 834н */
import {
	type Statutory043Issue,
	type Statutory043ComplianceReport,
	type Form043uComplianceInput,
	validateForm043uCompliance,
} from "./emrComplianceValidator.js";

export type { Statutory043Issue, Statutory043ComplianceReport, Form043uComplianceInput };
export { validateForm043uCompliance };

/** Проверка корректности номера зуба по FDI нотации (11-48 или 51-85) */
export function isValidFdiToothNumber(num: number | string | null | undefined): boolean {
	if (num === null || num === undefined) return false;
	const n = typeof num === "string" ? parseInt(num, 10) : num;
	if (Number.isNaN(n)) return false;

	// Постоянные зубы (11-18, 21-28, 31-38, 41-48)
	const permanentQuadrants = [1, 2, 3, 4];
	// Временные зубы (51-55, 61-65, 71-75, 81-85)
	const deciduousQuadrants = [5, 6, 7, 8];

	const quadrant = Math.floor(n / 10);
	const toothInQuadrant = n % 10;

	if (permanentQuadrants.includes(quadrant)) {
		return toothInQuadrant >= 1 && toothInQuadrant <= 8;
	}
	if (deciduousQuadrants.includes(quadrant)) {
		return toothInQuadrant >= 1 && toothInQuadrant <= 5;
	}
	return false;
}

/** Автоматическое определение класса по Блэку на основе поверхностей и номера зуба */
export function deduceBlackClassFromSurfaces(
	toothNumber: number | string | null | undefined,
	surfaces: readonly ToothSurface[] | null | undefined,
): BlackCavityClass {
	if (!surfaces || surfaces.length === 0) return "class_I";
	const surfSet = new Set(surfaces);

	const n = typeof toothNumber === "string" ? parseInt(toothNumber, 10) : (toothNumber ?? 16);
	const toothInQuad = n % 10;
	const isAnterior = toothInQuad >= 1 && toothInQuad <= 3; // Резцы и клыки

	if (isAnterior) {
		if (surfSet.has("vestibular") && surfSet.size === 1) return "class_V";
		if (surfSet.has("oral") && surfSet.size === 1) return "class_I"; // Ямка
		if (surfSet.has("occlusal")) return "class_IV"; // Вовлечение режущего края
		if (surfSet.has("mesial") || surfSet.has("distal")) return "class_III";
		return "class_III";
	}

	// Жевательные зубы (премоляры и моляры)
	if (surfSet.has("vestibular") && surfSet.size === 1) return "class_V";
	if (surfSet.has("oral") && surfSet.size === 1) return "class_V";
	if (surfSet.has("mesial") || surfSet.has("distal")) return "class_II";
	if (surfSet.has("occlusal")) return "class_I";

	return "class_I";
}

export const deduceBlackCavityClassFromSurfaces = deduceBlackClassFromSurfaces;



/**
 * Синтезатор дневниковой записи визита (SOAP формат по Приказу Минздрава № 834н)
 */
export function synthesizeClinicalDiary(request: ClinicalDiarySynthesisRequest): VisitDiaryEntry043 {
	const template = getClinicalProtocolTemplate(request.icd10Code);
	const toothNumStr = request.toothNumber ? String(request.toothNumber) : "";
	const isoDatePart = new Date().toISOString().split("T")[0];
	const dateStr = request.dateStr || isoDatePart || "2026-08-22";
	const timeStr = request.timeStr || new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

	const surfacesList: readonly ToothSurface[] = request.surfaces && request.surfaces.length > 0 ? request.surfaces : ["occlusal"];
	const surfaceNamesRu = surfacesList
		.map((s) => {
			if (s === "occlusal") return "окклюзионная";
			if (s === "vestibular") return "вестибулярная";
			if (s === "oral") return "оральная/язычная";
			if (s === "mesial") return "медиальная";
			if (s === "distal") return "дистальная";
			return s;
		})
		.join(", ");

	const blackClass = request.blackClass || deduceBlackCavityClassFromSurfaces(request.toothNumber, surfacesList);
	const blackClassLabel = blackCavityClassLabels[blackClass] || "Класс I по Блэку";

	// 1. Формирование раздела S (Subjective)
	let complaints = request.customComplaints || template.defaultSubjectiveComplaints;
	if (toothNumStr) {
		complaints = `Жалобы в области зуба ${toothNumStr}: ${complaints.replace(/^Жалобы (на )?/, "")}`;
	}

	// 2. Формирование раздела O (Objective)
	let objective = template.defaultObjectiveStatus;
	if (toothNumStr) {
		objective = objective.replace(/в области зуба/g, `в области зуба ${toothNumStr}`).replace(/жевательной\/контактной поверхности зуба/g, `${surfaceNamesRu} поверхности зуба ${toothNumStr} (${blackClassLabel})`);
	}
	if (request.customObjectiveNotes) {
		objective += `\nДополнительно: ${request.customObjectiveNotes}`;
	}

	// 3. Формирование раздела A (Assessment)
	let diagnosis = template.clinicalDiagnosis;
	if (toothNumStr) {
		diagnosis += ` зуба ${toothNumStr} (${surfaceNamesRu})`;
	}

	// 4. Формирование раздела P (Procedure Protocol)
	const anesth = request.customAnesthesia || template.anesthesiaDefault;
	const anesthDrugKey = anesth.drug || template.anesthesiaDefault.drug;
	const anesthDrugInfo = statutoryAnestheticDrugLabels[anesthDrugKey as StatutoryAnestheticDrug] || statutoryAnestheticDrugLabels.septanest_1_100000;
	const anesthCarpules = anesth.doseCarpules || template.anesthesiaDefault.doseCarpules;
	const anesthMl = anesth.doseMl || Number((anesthCarpules * anesthDrugInfo.carpuleVolumeMl).toFixed(1));
	const anesthTechnique = anesth.technique || template.anesthesiaDefault.technique;

	const anesthTechniqueName =
		anesthTechnique === "infiltration"
			? "инфильтрационная"
			: anesthTechnique === "mandibular"
				? "мандибулярная проводниковая"
				: anesthTechnique === "torus"
					? "торусальная по Вейсбрему"
					: anesthTechnique === "tuberal"
						? "туберальная проводниковая"
						: anesthTechnique === "palatal"
							? "нёбная"
							: anesthTechnique === "intraligamentary"
								? "интралигаментарная"
								: "местная";

	const anesthesiaLine = `Местная ${anesthTechniqueName} анестезия препаратом «${anesthDrugInfo.name}» (${anesthDrugInfo.activeSubstance}, ${anesthDrugInfo.vasoconstrictor}) в объеме ${anesthMl} мл (${anesthCarpules} карп.). Анестезия наступила полностью через 3-4 минуты, глубокая, безболезненность манипуляций 100%.`;

	let procedureProtocol = template.defaultProcedureProtocol;

	// Подстановка параметров эндодонтии при необходимости
	if (template.specialty === "endodontics" && request.endoVisitStage === "access_instrumentation_temporary_calcium") {
		procedureProtocol =
			`1. Анестезия: ${anesthesiaLine}\n` +
			"2. Изоляция: наложение системы коффердам, обработка операционного поля 0.05% хлоргексидином.\n" +
			`3. Доступ: препарирование кариозной полости зуба ${toothNumStr}, раскрытие полости зуба, визуализация устьев корневых каналов.\n` +
			`4. Рабочая длина: зондирование ${request.rootCanalsCount || 3} корневых каналов, электронная апекслокация апекслокатором Root ZX, контроль RVG с К-файлами.\n` +
			"5. Механическая обработка: формирование ковровой дорожки ProGlider, машинная обработка никель-титановыми инструментами WaveOne Gold / ProTaper Gold.\n" +
			"6. Ирригация: обильное промывание подогретым 3% NaOCl (15 мл на канал) с ультразвуковой активацией EndoActivator (3 цикла по 20 сек). Промежуточная экспозиция 17% EDTA 1 мин. Финишный лаваж дистиллированной водой, высушивание бумажными штифтами.\n" +
			"7. Временная обтурация: корневые каналы плотно заполнены антибактериальной пастой с гидроксидом кальция (Кальсепт / Metapex) под рентген-контролем. Устья загерметизированы СИЦ, наложена временная герметичная повязка Cavit на 10-14 дней.";
	}

	if (request.customProtocolNotes) {
		procedureProtocol += `\nОсобенности вмешательства: ${request.customProtocolNotes}`;
	}

	const materialsList = request.customMaterials && request.customMaterials.length > 0 ? Array.from(request.customMaterials) : template.defaultMaterials;

	const entryId = `diary-${Date.now().toString(36)}-${((materialsList.length * 31 + (request.toothNumber ? Number(request.toothNumber) : 1)) % 1000).toString(36).padStart(3, "0")}`;

	return {
		id: entryId,
		entryDate: dateStr,
		entryTime: timeStr,
		toothNumber: toothNumStr || null,
		subjectiveComplaints: complaints,
		objectiveStatusLocalis: objective,
		percussionVertical: template.defaultPercussion,
		percussionHorizontal: "negative",
		probingTenderness: template.defaultProbing,
		thermalTestResponse: template.defaultThermalTest,
		eodMicroamperes: template.defaultEodMicroamperes ?? null,
		assessmentDiagnosisText: diagnosis,
		assessmentIcd10Code: template.icd10Code,
		procedureProtocol: procedureProtocol,
		anesthesiaDetails: anesthesiaLine,
		appliedMaterials: materialsList.join("; "),
		homeCareRecommendations: template.defaultRecommendations,
		prescribedMedications: template.defaultPrescriptions ? template.defaultPrescriptions.join("; ") : null,
		nextVisitDate: null,
		doctorFullName: request.doctorFullName,
		doctorSpecialty: request.doctorSpecialty || "Врач-стоматолог-терапевт",
		isSignedWithUkep: false,
		digitalSignatureHash: null,
	};
}

/**
 * Синтез полного набора дневниковых записей на основе зубной формулы FDI
 */
export function synthesizeDiariesFromOdontogram(
	teeth: readonly FdiToothRecord[],
	doctorInfo: { fullName: string; specialty?: string; snils?: string },
	baseDateStr?: string,
): VisitDiaryEntry043[] {
	const diaries: VisitDiaryEntry043[] = [];
	const validTeeth = teeth.filter((t) => isValidFdiToothNumber(t.toothNumber));

	for (const tooth of validTeeth) {
		let icdCode = "K02.1";
		const status = tooth.statusCode as ToothClinicalStatusCode;

		// Пропускаем интактные и удаленные зубы
		if (status === "healthy" || status === "extracted_absent" || status === "implant") {
			continue;
		}

		if (status === "caries_initial" || status === "caries_superficial") {
			icdCode = "K02.0";
		} else if (status === "caries_media" || status === "caries_profunda" || status === "filled_secondary_caries") {
			icdCode = "K02.1";
		} else if (status === "caries_cementum") {
			icdCode = "K02.2";
		} else if (status === "pulpitis_acute" || status === "pulpitis_chronic" || status === "pulpitis_necrosis") {
			icdCode = "K04.0";
		} else if (status === "periodontitis_acute") {
			icdCode = "K04.4";
		} else if (status === "periodontitis_chronic" || status === "periodontitis_radicular_cyst") {
			icdCode = "K04.5";
		} else if (status === "root_remnant" || status === "fracture") {
			icdCode = "K08.1";
		} else if (status === "crown_metal_ceramic" || status === "crown_zirconia" || status === "crown_emax") {
			icdCode = "K08.1_ORTHO";
		}

		const diary = synthesizeClinicalDiary({
			toothNumber: tooth.toothNumber,
			icd10Code: icdCode,
			surfaces: tooth.surfaces ?? null,
			rootCanalsCount: tooth.rootCanalsCount ?? null,
			doctorFullName: doctorInfo.fullName,
			doctorSpecialty: doctorInfo.specialty ?? null,
			dateStr: baseDateStr ?? null,
		});

		diaries.push(diary);
	}

	return diaries;
}

/** Форматирование протокола SOAP в читаемый текстовый блок для предварительного просмотра (Приказ № 834н) */
export function formatStatutorySoapSummary(diary: VisitDiaryEntry043): string {
	const toothInfo = diary.toothNumber ? ` [Зуб ${diary.toothNumber}]` : "";
	return [
		`══════════════════════════════════════════════════════════════════`,
		`ДНЕВНИК ПРИЁМА ФОРМЫ 043/у (Приказ Минздрава № 834н)${toothInfo}`,
		`Дата/время: ${diary.entryDate} ${diary.entryTime || ""}`,
		`Врач: ${diary.doctorFullName} (${diary.doctorSpecialty || "Врач-стоматолог"})`,
		`──────────────────────────────────────────────────────────────────`,
		`S (ЖАЛОБЫ):`,
		diary.subjectiveComplaints,
		``,
		`O (STATUS LOCALIS):`,
		diary.objectiveStatusLocalis,
		`Перкуссия: верт. ${diary.percussionVertical === "negative" ? "отрицательная" : "положительная"}, гор. ${diary.percussionHorizontal === "negative" ? "отрицательная" : "положительная"} | Зондирование: ${diary.probingTenderness || "безболезненно"}`,
		diary.eodMicroamperes !== null && diary.eodMicroamperes !== undefined ? `ЭОД: ${diary.eodMicroamperes} мкА` : null,
		``,
		`A (ДИАГНОЗ МКБ-10):`,
		`${diary.assessmentIcd10Code} — ${diary.assessmentDiagnosisText}`,
		``,
		`P (ПРОТОКОЛ ВМЕШАТЕЛЬСТВА):`,
		diary.procedureProtocol,
		diary.anesthesiaDetails ? `Анестезия: ${diary.anesthesiaDetails}` : null,
		diary.appliedMaterials ? `Использованные материалы: ${diary.appliedMaterials}` : null,
		diary.homeCareRecommendations ? `Рекомендации: ${diary.homeCareRecommendations}` : null,
		diary.prescribedMedications ? `Назначения: ${diary.prescribedMedications}` : null,
		`══════════════════════════════════════════════════════════════════`,
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}




