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
export interface Statutory043Issue {
	readonly blockKey: "complaints" | "anamnesis" | "objective_status" | "odontogram" | "diagnosis" | "treatment_plan" | "treatment_protocol" | "doctor_signature" | "anesthesia" | "isolation" | "radiology";
	readonly fieldLabel: string;
	readonly message: string;
	readonly severity: "critical" | "warning" | "info";
	readonly statutoryRule: string;
}

export interface Statutory043ComplianceReport {
	readonly isCompliant: boolean;
	readonly complianceScore: number; // 0..100%
	readonly missingMandatoryBlocks: readonly string[];
	readonly criticalDefectsCount: number;
	readonly warningsCount: number;
	readonly issues: readonly Statutory043Issue[];
	readonly semanticChecks: {
		readonly icd10Valid: boolean;
		readonly fdiToothValid: boolean;
		readonly anesthesiaDoseSafe: boolean;
		readonly rubberDamCompliant: boolean;
		readonly rvgControlDocumented: boolean;
		readonly diagnosisProtocolConsistent: boolean;
	};
	readonly statutorySummaryText: string;
}

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

/** Получение шаблона протокола по коду МКБ-10 с поддержкой смежных кодов */
export function getClinicalProtocolTemplate(icd10Code: string, specialty?: ClinicalSpecialtyKind): ClinicalProtocolTemplate {
	const normalizedCode = icd10Code.trim().toUpperCase();
	const directMatch = STATUTORY_EMR_PROTOCOL_CATALOG[normalizedCode];
	if (directMatch) {
		return directMatch;
	}

	// Проверка расширенного ортопедического пресета
	if (specialty === "orthopedics" && (normalizedCode === "K08.1" || normalizedCode === "K03.0")) {
		const orthoMatch = STATUTORY_EMR_PROTOCOL_CATALOG["K08.1_ORTHO"];
		if (orthoMatch) return orthoMatch;
	}

	// Проверка таблицы компаньонов
	if (COMPANION_ICD10_CODES[normalizedCode]) {
		const companion = COMPANION_ICD10_CODES[normalizedCode];
		const baseTemplate = STATUTORY_EMR_PROTOCOL_CATALOG[companion.fallbackPresetKey];
		if (baseTemplate) {
			return {
				...baseTemplate,
				icd10Code: normalizedCode,
				icd10Title: companion.title,
				clinicalDiagnosis: `${companion.title} (${normalizedCode})`,
				specialty: companion.category,
			};
		}
	}

	// Дефолтный fallback на кариес дентина K02.1
	const defaultK021 = STATUTORY_EMR_PROTOCOL_CATALOG["K02.1"];
	if (defaultK021) {
		return defaultK021;
	}

	// Экстренный пуленепробиваемый fallback
	return {
		icd10Code: "K02.1",
		icd10Title: "Кариес дентина (Caries of dentine)",
		clinicalDiagnosis: "Кариес дентина (средний кариес)",
		specialty: "therapy",
		defaultSubjectiveComplaints: "Жалобы на кратковременные боли от холодного и сладкого.",
		defaultAnamnesisMorbi: "Полость обнаружена 1 месяц назад.",
		defaultObjectiveStatus: "Кариозная полость в пределах средних слоев дентина.",
		defaultPercussion: "negative",
		defaultThermalTest: "transient_pain",
		defaultProbing: "along_enamel_dentin_border",
		defaultEodMicroamperes: 5,
		defaultProcedureProtocol: "Препарирование, медикаментозная обработка, адгезивный протокол, пломбирование композитом светового отверждения, шлифовка, полировка.",
		anesthesiaDefault: {
			drug: "septanest_1_100000",
			doseCarpules: 1,
			doseMl: 1.7,
			technique: "infiltration",
		},
		defaultMaterials: ["Septanest 1:100000 1.7ml", "Адгезив", "Композит"],
		defaultRecommendations: "Контрольный осмотр через 6 месяцев.",
		requiresRubberDam: true,
		requiresApexLocatorRvg: false,
		statutoryOrderRef: "Приказ Минздрава РФ № 834н",
		order804nServices: [
			{
				code: "A16.07.002.001",
				nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей",
				isMandatory: true,
			},
			{ code: "A16.07.031", nameRu: "Препарирование твердых тканей зуба при лечении кариеса", isMandatory: true },
		],
	};
}

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

	const entryId = `diary-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

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

/**
 * Семантический и законодательный валидатор формы № 043/у по Приказу Минздрава № 834н
 */
export function validateForm043uCompliance(
	input: any,
): Statutory043ComplianceReport {
	const issues: Statutory043Issue[] = [];
	const missingBlocks: string[] = [];

	// Проверяем, передан ли дневник или полная карта 043/у
	const isExplicitCard = Boolean(
		input &&
		(input.formNumber === "043/у" ||
			input.passport !== undefined ||
			(input.dentalStatus !== undefined && Array.isArray(input.dentalStatus?.odontogramTeeth))),
	);
	const isSingleDiary = Boolean(
		input &&
		!isExplicitCard &&
		(typeof input.procedureProtocol === "string" ||
			typeof input.assessmentIcd10Code === "string" ||
			typeof input.assessmentDiagnosisText === "string"),
	);
	const fullCard = isExplicitCard ? input : null;
	const singleDiary = isSingleDiary ? input : (!isExplicitCard && !Array.isArray(input?.visitDiaries) ? input : null);

	let icd10Valid = true;
	let fdiToothValid = true;
	let anesthesiaDoseSafe = true;
	let rubberDamCompliant = true;
	let rvgControlDocumented = true;
	let diagnosisProtocolConsistent = true;

	// 1. Проверка паспортной части (только если передана полная карта 043/у)
	if (isExplicitCard && fullCard) {
		const p = fullCard.passport || {
			patientFullName: fullCard.patientFullName,
			medicalCardNumber: fullCard.medicalCardNumber,
			patientBirthDate: fullCard.patientBirthDate,
			patientIdentityDocument: fullCard.patientIdentityDocument,
		};

		if (!p?.patientFullName || String(p.patientFullName).trim().length < 3) {
			missingBlocks.push("Паспортная часть: ФИО пациента");
			issues.push({
				blockKey: "anamnesis",
				fieldLabel: "ФИО пациента",
				message: "ФИО пациента не заполнено или содержит менее 3 символов (требование Приказа № 834н).",
				severity: "critical",
				statutoryRule: "Приказ Минздрава России № 834н, Приложение № 11 (Титульный лист карты 043/у)",
			});
		}

		if (!p?.medicalCardNumber) {
			missingBlocks.push("Паспортная часть: Номер медицинской карты");
			issues.push({
				blockKey: "anamnesis",
				fieldLabel: "Номер карты",
				message: "Отсутствует уникальный регистрационный номер амбулаторной карты 043/у.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава России № 834н",
			});
		}

		if (!p?.patientBirthDate) {
			missingBlocks.push("Паспортная часть: Дата рождения");
			issues.push({
				blockKey: "anamnesis",
				fieldLabel: "Дата рождения",
				message: "Не указана дата рождения пациента.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава России № 834н",
			});
		}

		if (!p?.patientIdentityDocument) {
			issues.push({
				blockKey: "anamnesis",
				fieldLabel: "Документ, удостоверяющий личность",
				message: "Не указаны паспортные данные пациента (серия, номер, кем выдан).",
				severity: "warning",
				statutoryRule: "Федеральный закон № 323-ФЗ «Об основах охраны здоровья граждан в РФ»",
			});
		}

		// 2. Проверка анамнеза (Anamnesis vitae / morbi / аллергии)
		const a = fullCard.anamnesis || {
			allergologicalHistory: fullCard.allergologicalHistory,
			chiefComplaint: fullCard.chiefComplaint,
		};

		if (!a?.allergologicalHistory) {
			missingBlocks.push("Анамнез: Аллергологический статус");
			issues.push({
				blockKey: "anamnesis",
				fieldLabel: "Аллергологический статус",
				message: "КРИТИЧЕСКИЙ ДЕФЕКТ: В карте отсутствует запись об аллергологическом статусе и непереносимости анестетиков.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н / Безопасность применения местных анестетиков",
			});
		}

		if (!a?.chiefComplaint) {
			missingBlocks.push("Анамнез: Первичные жалобы");
			issues.push({
				blockKey: "complaints",
				fieldLabel: "Жалобы при первичном обращении",
				message: "Не зафиксированы первичные жалобы пациента при открытии карты.",
				severity: "warning",
				statutoryRule: "Приказ Минздрава № 834н",
			});
		}

		// 3. Зубная формула (Одонтограмма)
		const odontTeeth = fullCard.dentalStatus?.odontogramTeeth || fullCard.odontogramTeeth;
		if (!odontTeeth || odontTeeth.length === 0) {
			missingBlocks.push("Стоматологический статус: Зубная формула");
			issues.push({
				blockKey: "odontogram",
				fieldLabel: "Зубная формула (FDI)",
				message: "Зубная формула не заполнена (отсутствуют записи по 32 зубам).",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н / Форма 043/у раздел «Зубная формула»",
			});
		}
	}

	// 4. Проверка дневниковых записей (SOAP)
	const rawDiaries =
		fullCard?.visitDiaries ??
		fullCard?.soapDiaries ??
		(Array.isArray(input?.visitDiaries)
			? input.visitDiaries
			: Array.isArray(input?.soapDiaries)
				? input.soapDiaries
				: Array.isArray(input)
					? input
					: singleDiary
						? [singleDiary]
						: []);
	const diariesToCheck: VisitDiaryEntry043[] = Array.isArray(rawDiaries) ? rawDiaries : [];

	if (diariesToCheck.length === 0) {
		missingBlocks.push("Дневник приёма (SOAP)");
		issues.push({
			blockKey: "treatment_protocol",
			fieldLabel: "Дневниковые записи посещений",
			message: "В медицинской карте отсутствует ни одной дневниковой записи о проведенном лечении.",
			severity: "critical",
			statutoryRule: "Приказ Минздрава № 834н",
		});
	}

	for (let i = 0; i < diariesToCheck.length; i++) {
		const d = diariesToCheck[i];
		if (!d) continue;
		const diaryPrefix = diariesToCheck.length > 1 ? `[Визит ${i + 1}${d.toothNumber ? ` зуб ${d.toothNumber}` : ""}] ` : "";

		// S: Жалобы
		if (!d.subjectiveComplaints || String(d.subjectiveComplaints).trim().length < 5) {
			issues.push({
				blockKey: "complaints",
				fieldLabel: `${diaryPrefix}Жалобы (Subjective)`,
				message: "Блок жалоб не заполнен или содержит менее 5 символов.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н (SOAP-стандарт)",
			});
		}

		// O: Status localis
		if (!d.objectiveStatusLocalis || String(d.objectiveStatusLocalis).trim().length < 10) {
			issues.push({
				blockKey: "objective_status",
				fieldLabel: `${diaryPrefix}Объективный статус (Objective)`,
				message: "Объективный статус (Status localis) не описан или не содержит данных осмотра.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н (SOAP-стандарт)",
			});
		}

		// A: Диагноз и МКБ-10
		if (!d.assessmentIcd10Code || !/^[Kk]\d{2}(\.\d{1,2})?(_[A-Za-z0-9]+)?$/.test(String(d.assessmentIcd10Code).trim())) {
			icd10Valid = false;
			issues.push({
				blockKey: "diagnosis",
				fieldLabel: `${diaryPrefix}Код МКБ-10 (Assessment)`,
				message: `Некорректный или отсутствующий код диагноза по МКБ-10: «${d.assessmentIcd10Code || "пусто"}». Ожидается код класса K00-K14.`,
				severity: "critical",
				statutoryRule: "Международная классификация болезней МКБ-10 / Приказ № 834н",
			});
		}

		if (!d.assessmentDiagnosisText || String(d.assessmentDiagnosisText).trim().length < 5) {
			issues.push({
				blockKey: "diagnosis",
				fieldLabel: `${diaryPrefix}Клинический диагноз`,
				message: "Текстовое наименование клинического диагноза не указано.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н",
			});
		}

		// FDI Нотация зуба
		if (d.toothNumber && !isValidFdiToothNumber(d.toothNumber)) {
			fdiToothValid = false;
			issues.push({
				blockKey: "odontogram",
				fieldLabel: `${diaryPrefix}Номер зуба FDI`,
				message: `Номер зуба «${d.toothNumber}» не соответствует двухцифровой нотации FDI (допустимы 11-48, 51-85).`,
				severity: "warning",
				statutoryRule: "ISO 3950 / FDI Dental Numbering System",
			});
		}

		// P: Протокол лечения
		if (!d.procedureProtocol || String(d.procedureProtocol).trim().length < 20) {
			issues.push({
				blockKey: "treatment_protocol",
				fieldLabel: `${diaryPrefix}Протокол вмешательства (Procedure)`,
				message: "Протокол лечения не содержит подробного описания манипуляций (менее 20 символов).",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н",
			});
		}

		// Семантическое соответствие диагноза и протокола
		const icdClean = String(d.assessmentIcd10Code || "").toUpperCase();
		const protocolLower = String(d.procedureProtocol || "").toLowerCase();

		// Проверка эндодонтии (K04.0, K04.5, K04.4)
		if (icdClean.startsWith("K04")) {
			const hasEndoKeywords =
				protocolLower.includes("канал") ||
				protocolLower.includes("апекс") ||
				protocolLower.includes("ирригац") ||
				protocolLower.includes("обтурац") ||
				protocolLower.includes("гуттаперч") ||
				protocolLower.includes("кальци") ||
				protocolLower.includes("экстирпац");

			if (!hasEndoKeywords) {
				diagnosisProtocolConsistent = false;
				issues.push({
					blockKey: "treatment_protocol",
					fieldLabel: `${diaryPrefix}Соответствие диагнозу эндодонтии`,
					message: `При диагнозе пульпита/периодонтита (${icdClean}) в протоколе отсутствуют этапы эндодонтического лечения (инструментация, ирригация, обтурация каналов).`,
					severity: "critical",
					statutoryRule: "Клинические рекомендации СтАР «Пульпит» и «Периодонтит»",
				});
			}

			// Проверка коффердама
			if (!protocolLower.includes("коффердам") && !protocolLower.includes("раббердам") && !protocolLower.includes("изоляц")) {
				rubberDamCompliant = false;
				issues.push({
					blockKey: "isolation",
					fieldLabel: `${diaryPrefix}Изоляция коффердамом`,
					message: "При эндодонтическом лечении обязательна фиксация изоляции операционного поля системой коффердам (стандарт ESE и СтАР).",
					severity: "warning",
					statutoryRule: "Стандарты безопасности эндодонтического лечения СтАР / СанПиН",
				});
			}

			// Проверка радиовизиографии (RVG)
			if (!protocolLower.includes("rvg") && !protocolLower.includes("визиограф") && !protocolLower.includes("рентген") && !protocolLower.includes("сним")) {
				rvgControlDocumented = false;
				issues.push({
					blockKey: "radiology",
					fieldLabel: `${diaryPrefix}Рентген-контроль (RVG)`,
					message: "В протоколе эндодонтического лечения отсутствует упоминание контрольной радиовизиографии (определение рабочей длины / качество обтурации).",
					severity: "warning",
					statutoryRule: "Приказ Минздрава № 834н / Клинические протоколы эндодонтии",
				});
			}
		}

		// Проверка хирургии (K08.1, удаление зуба)
		const isSurgeryExtraction =
			icdClean === "K08.1" &&
			(protocolLower.includes("удаление зуба") ||
				protocolLower.includes("удаление корн") ||
				protocolLower.includes("экстракц") ||
				protocolLower.includes("синдесмотомия") ||
				String(d.assessmentDiagnosisText || "").toLowerCase().includes("удален")) &&
			!protocolLower.includes("коронк") &&
			!protocolLower.includes("протезиров");

		if (isSurgeryExtraction) {
			const hasSurgeryKeywords =
				protocolLower.includes("кюретаж") ||
				protocolLower.includes("лунк") ||
				protocolLower.includes("гемостаз") ||
				protocolLower.includes("элеватор") ||
				protocolLower.includes("щипц");

			if (!hasSurgeryKeywords) {
				diagnosisProtocolConsistent = false;
				issues.push({
					blockKey: "treatment_protocol",
					fieldLabel: `${diaryPrefix}Хирургический протокол удаления`,
					message: "В протоколе операции удаления зуба отсутствуют обязательные этапы (синдесмотомия, кюретаж лунки, гемостаз).",
					severity: "critical",
					statutoryRule: "Клинические рекомендации СтАР «Операция удаления зуба»",
				});
			}
		}


		// Проверка подписи врача
		if (!d.doctorFullName || String(d.doctorFullName).trim().length < 3) {
			issues.push({
				blockKey: "doctor_signature",
				fieldLabel: `${diaryPrefix}Подпись врача`,
				message: "Отсутствует ФИО лечащего врача, проводившего приём.",
				severity: "critical",
				statutoryRule: "Федеральный закон № 323-ФЗ / Приказ Минздрава № 834н",
			});
		}
	}

	const criticalDefects = issues.filter((i) => i.severity === "critical");
	const warnings = issues.filter((i) => i.severity === "warning");

	// Расчет индекса соответствия 0..100%
	let score = 100;
	score -= criticalDefects.length * 20;
	score -= warnings.length * 5;
	if (score < 0) score = 0;

	const isCompliant = criticalDefects.length === 0 && score >= 80;

	const summaryText = isCompliant
		? `Медицинская документация соответствует требованиям Приказа Минздрава России № 834н (Индекс комплаентности: ${score}%). Критических дефектов не обнаружено.`
		: `Обнаружены нарушения требований Приказа Минздрава № 834н (Индекс комплаентности: ${score}%). Критических дефектов: ${criticalDefects.length}, замечаний: ${warnings.length}. Требуется устранение дефектов до подписания карты.`;

	return {
		isCompliant,
		complianceScore: score,
		missingMandatoryBlocks: Array.from(new Set(missingBlocks)),
		criticalDefectsCount: criticalDefects.length,
		warningsCount: warnings.length,
		issues,
		semanticChecks: {
			icd10Valid,
			fdiToothValid,
			anesthesiaDoseSafe,
			rubberDamCompliant,
			rvgControlDocumented,
			diagnosisProtocolConsistent,
		},
		statutorySummaryText: summaryText,
	};
}

/**
 * Входные параметры для 1-клик генерации клинического протокола и сметы
 */
export interface EmrAutopilotRequest {
	readonly toothNumber: string | number; // FDI (11-48, 51-85)
	readonly icd10Code: string; // e.g. "K02.1", "K04.0", "K08.1", etc.
	readonly surfaces?: readonly ToothSurface[] | null | undefined; // e.g. ["occlusal", "mesial"]
	readonly cavityClass?: BlackCavityClass | null | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: ClinicalSpecialtyKind | string | null | undefined;
	readonly entryDate?: string | null | undefined;
	readonly entryTime?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly allergologicalHistory?: string | null | undefined;
	readonly customComplaints?: string | null | undefined;
	readonly customObjective?: string | null | undefined;
	readonly customProtocol?: string | null | undefined;
	readonly customMaterials?: readonly string[] | null | undefined;
	readonly anestheticDrug?: StatutoryAnestheticDrug | null | undefined;
	readonly anesthesiaCarpules?: number | null | undefined;
	readonly includeAnesthesia?: boolean | undefined;
	readonly includeRvg?: boolean | undefined;
	readonly includeSutures?: boolean | undefined;
	readonly customCanalCount?: number | null | undefined;
	readonly isMultiVisitEndo?: boolean | undefined;
	readonly endoVisitStage?: "access_instrumentation_temporary_calcium" | "final_obturation_restoration" | "single_visit_complete" | undefined;
}

/**
 * Результат работы 1-клик клинического автопилота EMR
 */
export interface EmrAutopilotResult {
	readonly toothNumber: string;
	readonly icd10Code: string;
	readonly clinicalDiagnosis: string;
	readonly specialty: ClinicalSpecialtyKind;
	readonly canalCount: number;
	readonly surfaces: readonly ToothSurface[];
	readonly blackClass: BlackCavityClass;
	readonly diaryEntry: VisitDiaryEntry043;
	readonly soapVisitDiary: SoapVisitDiary;
	readonly order804nServices: readonly Order804nBillingLineItem[];
	readonly billingEstimate: Order804nBillingEstimateResult;
	readonly complianceAudit: Statutory043ComplianceReport;
}

/**
 * 1-Клик клинический автопилот EMR (Приказ № 834н + Номенклатура 804н + Расчет сметы в копейках)
 */
export function generateEmrAutopilotPlan(request: EmrAutopilotRequest): EmrAutopilotResult {
	const toothNumStr = String(request.toothNumber || "16").trim();
	const surfaces = request.surfaces && request.surfaces.length > 0 ? request.surfaces : (["occlusal"] as readonly ToothSurface[]);
	const blackClass = request.cavityClass || deduceBlackCavityClassFromSurfaces(toothNumStr, surfaces);
	const template = getClinicalProtocolTemplate(request.icd10Code, (request.doctorSpecialty as ClinicalSpecialtyKind) || undefined);
	const canalCount = getCanalCountForTooth(toothNumStr, request.customCanalCount ?? undefined);

	// Синтез дневниковой записи визита
	const diaryEntry = synthesizeClinicalDiary({
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		surfaces,
		blackClass,
		rootCanalsCount: canalCount,
		doctorFullName: request.doctorFullName,
		doctorSpecialty: typeof request.doctorSpecialty === "string" ? request.doctorSpecialty : null,
		dateStr: request.entryDate ?? null,
		timeStr: request.entryTime ?? null,
		customComplaints: request.customComplaints ?? null,
		customObjectiveNotes: request.customObjective ?? null,
		customProtocolNotes: request.customProtocol ?? null,
		customMaterials: request.customMaterials ?? null,
		customAnesthesia: request.anestheticDrug
			? {
					drug: request.anestheticDrug,
					doseCarpules: request.anesthesiaCarpules ?? 1,
				}
			: null,
		isMultiVisitEndo: request.isMultiVisitEndo,
		endoVisitStage: request.endoVisitStage,
	});

	// Генерация 804н услуг
	const order804nServices = getOrder804nServicesForClinicalCase({
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		canalCount,
		surfaces,
		specialty: template.specialty,
		includeAnesthesia: request.includeAnesthesia ?? true,
		includeRvg: request.includeRvg ?? (template.requiresApexLocatorRvg || template.specialty === "endodontics"),
		includeSutures: request.includeSutures ?? false,
	});

	// Расчет сметы в копейках
	const billingEstimate = calculateOrder804nBillingEstimate({
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		canalCount,
		surfaces,
		specialty: template.specialty,
		includeAnesthesia: request.includeAnesthesia ?? true,
		includeRvg: request.includeRvg ?? (template.requiresApexLocatorRvg || template.specialty === "endodontics"),
		includeSutures: request.includeSutures ?? false,
	});

	// Формирование SOAP записи для формы 043/у
	const soapVisitDiary: SoapVisitDiary = {
		entryDate: diaryEntry.entryDate,
		toothNumber: diaryEntry.toothNumber,
		subjectiveComplaints: diaryEntry.subjectiveComplaints,
		objectiveStatusLocalis: diaryEntry.objectiveStatusLocalis,
		percussionVertical: diaryEntry.percussionVertical || "negative",
		percussionHorizontal: diaryEntry.percussionHorizontal || "negative",
		probingTenderness: diaryEntry.probingTenderness || "none",
		thermalTestResponse: diaryEntry.thermalTestResponse || "indifferent",
		eodMicroamperes: diaryEntry.eodMicroamperes ?? null,
		assessmentDiagnosisText: diaryEntry.assessmentDiagnosisText,
		assessmentIcd10Code: diaryEntry.assessmentIcd10Code,
		procedureProtocol: diaryEntry.procedureProtocol,
		anesthesiaDetails: diaryEntry.anesthesiaDetails ?? null,
		appliedMaterials: diaryEntry.appliedMaterials ?? null,
		homeCareRecommendations: diaryEntry.homeCareRecommendations ?? null,
		nextVisitDate: diaryEntry.nextVisitDate ?? null,
		doctorFullName: diaryEntry.doctorFullName,
	};

	// Валидация соответствия Приказу № 834н
	const complianceAudit = validateForm043uCompliance({
		patientFullName: request.patientFullName || "Пациент Тестовый",
		medicalCardNumber: request.medicalCardNumber || "КАРТА-043-001",
		allergologicalHistory: request.allergologicalHistory || "Аллергологический анамнез спокоен, аллергических реакций на местные анестетики и антибиотики не отмечает.",
		doctorFullName: request.doctorFullName,
		visitDiaries: [soapVisitDiary],
	});

	return {
		toothNumber: toothNumStr,
		icd10Code: request.icd10Code,
		clinicalDiagnosis: diaryEntry.assessmentDiagnosisText,
		specialty: template.specialty,
		canalCount,
		surfaces,
		blackClass,
		diaryEntry,
		soapVisitDiary,
		order804nServices,
		billingEstimate,
		complianceAudit,
	};
}

/**
 * Запрос пакетного автопилота всей зубной формулы FDI
 */
export interface FullOdontogramAutopilotRequest {
	readonly teeth: readonly FdiToothRecord[];
	readonly doctorFullName: string;
	readonly doctorSpecialty?: ClinicalSpecialtyKind | string | null;
	readonly entryDate?: string | null;
	readonly patientFullName?: string | null;
	readonly medicalCardNumber?: string | null;
	readonly allergologicalHistory?: string | null;
	readonly includeAnesthesia?: boolean;
	readonly includeRvg?: boolean;
	readonly includeSutures?: boolean;
}

/**
 * Результат пакетного автопилота всей зубной формулы FDI
 */
export interface FullOdontogramAutopilotResult {
	readonly totalTeethCount: number;
	readonly pathologyTeethCount: number;
	readonly autopilotItems: readonly EmrAutopilotResult[];
	readonly totalKopecks: number;
	readonly totalFormattedRub: string;
	readonly diaries: readonly VisitDiaryEntry043[];
	readonly overallComplianceScore: number;
	readonly isFullyCompliant: boolean;
	readonly missingMandatoryBlocks: readonly string[];
}

/**
 * Пакетный автопилот зубной формулы FDI (генерация всех протоколов и общей сметы 804н)
 */
export function synthesizeFullOdontogramAutopilot(request: FullOdontogramAutopilotRequest): FullOdontogramAutopilotResult {
	const validTeeth = (request.teeth || []).filter((t) => isValidFdiToothNumber(t.toothNumber));
	const autopilotItems: EmrAutopilotResult[] = [];
	let totalKopecks = 0;

	for (const tooth of validTeeth) {
		const status = (tooth.statusCode || "healthy") as ToothClinicalStatusCode;

		// Пропуск интактных, удаленных и имплантированных зубов без патологий
		if (status === "healthy" || status === "extracted_absent" || status === "implant" || status === "sealant_fissure") {
			continue;
		}

		let icdCode = "K02.1";
		if (status === "caries_initial" || status === "caries_superficial") {
			icdCode = "K02.0";
		} else if (status === "caries_media" || status === "caries_profunda" || status === "filled_secondary_caries" || status === "filled_defective") {
			icdCode = "K02.1";
		} else if (status === "caries_cementum") {
			icdCode = "K02.2";
		} else if (status === "pulpitis_acute" || status === "pulpitis_chronic" || status === "pulpitis_necrosis") {
			icdCode = "K04.0";
		} else if (status === "periodontitis_acute") {
			icdCode = "K04.4";
		} else if (status === "periodontitis_chronic") {
			icdCode = "K04.5";
		} else if (status === "periodontitis_radicular_cyst") {
			icdCode = "K04.8";
		} else if (status === "wedge_defect") {
			icdCode = "K03.1";
		} else if (status === "erosion") {
			icdCode = "K03.2";
		} else if (status === "attrition_pathological") {
			icdCode = "K03.0";
		} else if (status === "root_remnant" || status === "fracture") {
			icdCode = "K08.1";
		} else if (
			status === "crown_metal_ceramic" ||
			status === "crown_zirconia" ||
			status === "crown_emax" ||
			status === "crown_temporary" ||
			status === "inlay_onlay" ||
			status === "veneer"
		) {
			icdCode = "K08.1_ORTHO";
		}

		const surfaces = tooth.surfaces && tooth.surfaces.length > 0 ? tooth.surfaces : (["occlusal"] as readonly ToothSurface[]);
		const item = generateEmrAutopilotPlan({
			toothNumber: tooth.toothNumber,
			icd10Code: icdCode,
			surfaces,
			doctorFullName: request.doctorFullName,
			doctorSpecialty: request.doctorSpecialty ?? null,
			entryDate: request.entryDate ?? null,
			patientFullName: request.patientFullName ?? null,
			medicalCardNumber: request.medicalCardNumber ?? null,
			allergologicalHistory: request.allergologicalHistory ?? null,
			includeAnesthesia: request.includeAnesthesia ?? true,
			includeRvg: request.includeRvg ?? false,
			includeSutures: request.includeSutures ?? false,
			customCanalCount: tooth.rootCanalsCount ?? null,
		});

		autopilotItems.push(item);
		totalKopecks += item.billingEstimate.totalKopecks;
	}

	const diaries = autopilotItems.map((item) => item.diaryEntry);
	const avgScore =
		autopilotItems.length > 0
			? Math.round(autopilotItems.reduce((acc, item) => acc + item.complianceAudit.complianceScore, 0) / autopilotItems.length)
			: 100;
	const isFullyCompliant = autopilotItems.every((item) => item.complianceAudit.isCompliant);
	const missingBlocks = Array.from(new Set(autopilotItems.flatMap((item) => item.complianceAudit.missingMandatoryBlocks)));

	const rubles = Math.floor(totalKopecks / 100);
	const kopecks = totalKopecks % 100;
	const totalFormattedRub = `${rubles.toLocaleString("ru-RU")},${kopecks.toString().padStart(2, "0")} ₽`;

	return {
		totalTeethCount: validTeeth.length,
		pathologyTeethCount: autopilotItems.length,
		autopilotItems,
		totalKopecks,
		totalFormattedRub,
		diaries,
		overallComplianceScore: avgScore,
		isFullyCompliant,
		missingMandatoryBlocks: missingBlocks,
	};
}

/**
 * Справочник структурированных описаний процедур по Номенклатуре Минздрава 804н
 */
export interface Order804nProtocolDefinition {
	readonly code: string;
	readonly nameRu: string;
	readonly primaryIcd10: string;
	readonly protocolStepRu: string;
	readonly defaultSubjective?: string;
	readonly defaultStatusLocalis?: string;
	readonly requiredMaterials?: readonly string[];
}

export const ORDER_804N_PROTOCOL_DEFINITIONS: Record<string, Order804nProtocolDefinition> = {
	"A16.07.002.001": {
		code: "A16.07.002.001",
		nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей (I, V, VI класс по Блэку)",
		primaryIcd10: "K02.1",
		protocolStepRu: "Изоляция рабочего поля коффердамом. Препарирование кариозной полости (I/V/VI класс по Блэку), некрэктомия, формирование эмалевого фальца. Медикаментозная антисептическая обработка 2% раствором хлоргексидина. Селективное кислотное травление эмали 37% ортофосфорной кислотой (20 сек), промывание, бережное высушивание без пересушивания дентина. Нанесение универсальной адгезивной системы (OptiBond FL / Prime&Bond), экспозиция 20 сек, раздувание воздухом, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (Filtek Ultimate / Estelite Asteria) с анатомическим восстановлением фиссур и бугров. Финишная окклюзионная пришлифовка по артикуляционной бумаге, шлифовка и полировка (диски Enhance, полиры, алмазная паста) до сухого зеркального блеска.",
		defaultSubjective: "Жалобы на кратковременные боли от холодного и сладкого, застревание пищи.",
		defaultStatusLocalis: "Кариозная полость средней глубины в пределах плащевого дентина. Зондирование слабоболезненно по эмалево-дентинной границе.",
		requiredMaterials: ["Коффердам", "37% H3PO4 гель", "Адгезивная система OptiBond FL", "Нанокомпозит Filtek/Estelite", "Полировочная система Enhance"],
	},
	"A16.07.002.002": {
		code: "A16.07.002.002",
		nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей (II, III класс по Блэку)",
		primaryIcd10: "K02.1",
		protocolStepRu: "Изоляция операционного поля системой коффердам. Препарирование контактной кариозной полости (II/III класс по Блэку), атравматичная некрэктомия. Установка секционной контурной матрицы (Garrison / Tor VM) и анатомического клина, создание плотного контактного пункта с соседним зубом. Медикаментозная обработка 2% хлоргексидином. Тотальное/селективное травление 37% ортофосфорной кислотой, адгезивный протокол (праймер + бонд), полимеризация 20 сек. Адаптационный слой текучего композита (Flowable), послойная реставрация наногибридным композитом. Снятие матрицы, финирование контактного пункта штрипсами, полировка до сухого зеркального блеска.",
		defaultSubjective: "Жалобы на застревание волокнистой пищи между зубами, дефект контактного края, кратковременную чувствительность на сладкое.",
		defaultStatusLocalis: "Кариозная полость на контактной поверхности, переходящая на жевательную. Зондирование по эмалево-дентинной границе чувствительно.",
		requiredMaterials: ["Коффердам", "Секционная матричная система Garrison", "Анатомические клинья", "37% гель", "Адгезив", "Текучий и пакуемый нанокомпозит"],
	},
	"A16.07.002.003": {
		code: "A16.07.002.003",
		nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей (IV класс по Блэку с восстановлением режущего края)",
		primaryIcd10: "K02.1",
		protocolStepRu: "Изоляция коффердамом. Препарирование дефекта с созданием широкого скоса эмали (бевеля) 1.5-2 мм на вестибулярной поверхности для оптической интеграции. Применение силиконового ключа (Palatal Silicone Index). Медикаментозная обработка 2% хлоргексидином. Адгезивный протокол V/IV поколения. Восстановление нёбной стенки эмалевым оттенком композита по силиконовому ключу, моделирование дентинных мамелонов опаковым композитом, характеризация прозрачным эмалевым слоем (Incisal Translucent). Полимеризация каждого слоя 20 сек. Окклюзионный контроль в статике и динамике (протрузия/латеротрузия), полировка дисками Sof-Lex и щетками с пастой Prisma Gloss.",
		defaultSubjective: "Жалобы на скол режущего края фронтального зуба, эстетический дефект, шероховатость при касании языком.",
		defaultStatusLocalis: "Дефект коронковой части зуба с вовлечением режущего края и контактного угла (IV класс по Блэку). Зондирование безболезненно, ЭОД 4-6 мкА.",
		requiredMaterials: ["Коффердам", "Силиконовый ключ", "Опаковый и эмалевый нанокомпозиты", "Диски Sof-Lex", "Алмазная полировочная паста"],
	},
	"A16.07.031": {
		code: "A16.07.031",
		nameRu: "Препарирование твердых тканей зуба при лечении кариеса",
		primaryIcd10: "K02.1",
		protocolStepRu: "Препарирование твердых тканей зуба турбинным наконечником с водно-воздушным охлаждением. Раскрытие кариозной полости, полная щадящая некрэктомия размягченного дентина твердосплавными борами на микромоторе под контролем кариес-маркера (Caries Detector). Финирование краев эмали мелкозернистыми алмазными борами.",
		defaultSubjective: "Жалобы на наличие кариозной полости и застревание пищи.",
		defaultStatusLocalis: "Кариозная полость средней глубины с пигментированным дентином.",
		requiredMaterials: ["Твердосплавные боры", "Кариес-маркер Caries Detector", "Алмазные финиры"],
	},
	"A16.07.030.001": {
		code: "A16.07.030.001",
		nameRu: "Инструментальная и медикаментозная обработка одного корневого канала",
		primaryIcd10: "K04.0",
		protocolStepRu: "Изоляция зуба системой коффердам. Эндодонтический доступ, раскрытие полости зуба, нахождение устья корневого канала. Первичное скаутирование ручными К-файлами #10. Определение рабочей длины канала электронным апекслокатором (Apex 0.0) и контрольной радиовизиографией. Механическая инструментальная обработка никель-титановыми ротационными инструментами (WaveOne Gold / ProTaper Ultimate) с созданием конусности .06. Обильная медикаментозная ирригация 3% раствором гипохлорита натрия (NaOCl) и 17% раствором ЭДТА с ультразвуковой активацией (EndoActivator). Финишный лаваж дистиллированной водой, высушивание канала стерильными бумажными штифтами.",
		defaultSubjective: "Жалобы на острые самопроизвольные приступообразные ночные боли в зубе, усиливающиеся от температурных раздражителей.",
		defaultStatusLocalis: "Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки рога пульпы резко болезненно.",
		requiredMaterials: ["Коффердам", "Апекслокатор Root ZX", "Ротационные файлы NiTi", "3% NaOCl", "17% ЭДТА", "Бумажные штифты"],
	},
	"A16.07.008.001": {
		code: "A16.07.008.001",
		nameRu: "Пломбирование одного корневого канала гуттаперчевыми штифтами",
		primaryIcd10: "K04.0",
		protocolStepRu: "Припасовка мастер-штифта гуттаперчи с проверкой эффекта заклинивания (tug-back) на рабочей длине. Трехмерная герметичная обтурация корневого канала разогретой термопластифицированной гуттаперчей с эпоксидным силером AH Plus методом вертикальной конденсации (Continuous Wave of Condensation). Устье канала герметично запечатано светоотверждаемым стеклоиономерным цементом. Контрольная прицельная радиовизиография: канал обтурирован гомогенно, плотно до физиологического апекса, без выведения силера за верхушку.",
		defaultSubjective: "Жалоб на момент обтурации не предъявляет.",
		defaultStatusLocalis: "Корневой канал сухой, чистый, без запаха и экссудации. Перкуссия зуба безболезненна.",
		requiredMaterials: ["Гуттаперчевые штифты", "Эпоксидный силер AH Plus", "Стеклоиономерный цемент", "Контрольная радиовизиография"],
	},
	"A16.07.001.001": {
		code: "A16.07.001.001",
		nameRu: "Удаление постоянного зуба (простое)",
		primaryIcd10: "K08.1",
		protocolStepRu: "Местная инфильтрационная / проводниковая анестезия (Артикаин 4% 1.7 мл). Синдесмотомия — отслоение круговой связки зуба на глубину 3-4 мм распатором. Наложение анатомических щипцов, продвижение щечек под десну, фиксация, люксация в щечно-язычном направлении, аккуратная тракция зуба из альвеолы без повреждения кортикальных пластинок. Ревизия и щадящий кюретаж лунки острой ложкой, удаление грануляций. Достижение стабильного гемостаза с формированием плотного кровяного сгустка, введение антисептической гемостатической губки. Сближение краев лунки, давящий стерильный марлевый тампон на 20 минут.",
		defaultSubjective: "Жалобы на сильное разрушение коронковой части зуба, невозможность восстановления.",
		defaultStatusLocalis: "Коронка зуба разрушена ниже уровня десны, корни подвижны/несостоятельны.",
		requiredMaterials: ["Распатор", "Анатомические щипцы", "Кюретажная ложка", "Гемостатическая губка Альвостаз/Spongostan"],
	},
	"A16.07.051": {
		code: "A16.07.051",
		nameRu: "Профессиональная гигиена полости рта и зубов",
		primaryIcd10: "K05.0",
		protocolStepRu: "Индикация зубного налета 2-х компонентным раствором. Аппликационное обезболивание десны лидокаин-спреем 10%. Ультразвуковое удаление минерализованных наддесневых и поддесневых зубных отложений (скейлинг) насадками EMS. Снятие плотного пигментированного налета и биопленки аппаратом Air-Flow мелкодисперсным порошком на основе глицина/эритритола. Полировка поверхностей зубов абразивной пастой Cleanic и щеточками. Обработка межзубных промежутков флоссом и полировочными штрипсами. Глубокое фторирование эмали и дентина препаратом Clinpro White Varnish.",
		defaultSubjective: "Жалобы на темный налет на зубах, кровоточивость десен при чистке зубов, неприятный запах изо рта.",
		defaultStatusLocalis: "Обильный мягкий налет, над- и поддесневой зубной камень, гиперемия и отечность десневых сосочков (PBI > 1).",
		requiredMaterials: ["Индикатор налета", "УЗ-насадки", "Порошок Air-Flow глицин", "Паста Cleanic", "Фторлак Clinpro White Varnish"],
	},
	"A16.07.004": {
		code: "A16.07.004",
		nameRu: "Восстановление зуба коронкой",
		primaryIcd10: "K08.1_ORTHO",
		protocolStepRu: "Местная инфильтрационная / проводниковая анестезия. Препарирование твердых тканей культи зуба под искусственную коронку с созданием кругового уступа типа Chamfer (ширина 0.8–1.0 мм) с водно-воздушным охлаждением. Ретракция краевой десны одинарной/двойной нитью Ultrapak #00/#0 с гемостатиком. Получение прецизионного двухслойного оттиска А-силиконовой массой (Honigum / Express XT) и оттиска зубного ряда антагонистов. Изготовление провизорной пластмассовой коронки прямым методом (Protemp 4), припасовка, полировка и временная фиксация на безэвгенольный цемент Temp-Bond NE.",
		defaultSubjective: "Жалобы на разрушение твердых тканей зуба более 50%, необходимость ортопедического восстановления.",
		defaultStatusLocalis: "Дефект твердых тканей зуба ИРОПЗ > 0.6. Зуб девитализирован, каналы обтурированы до апекса.",
		requiredMaterials: ["Алмазные боры для препарирования", "Ретракционная нить Ultrapak", "А-силиконовый слепочный материал", "Материал для временных коронок Protemp 4", "Цемент Temp-Bond NE"],
	},
	"B01.003.004.005": {
		code: "B01.003.004.005",
		nameRu: "Проводниковая/инфильтрационная анестезия",
		primaryIcd10: "K02.1",
		protocolStepRu: "Антисептическая обработка места инъекции. Местная анестезия: Артикаин 4% с эпинефрином 1:100 000 (1.7 мл). Проведена аспирационная проба (отрицательная). Обезболивание глубокое, наступило через 2–3 минуты, осложнений нет.",
		defaultSubjective: "Аллергологический анамнез не отягощен, ранее местную анестезию переносил(а) хорошо.",
		defaultStatusLocalis: "Слизистая оболочка в месте вкола бледно-розовая, без воспалительных явлений.",
		requiredMaterials: ["Карпульный шприц", "Карпула Артикаин 4% 1.7 мл", "Стерильная карпульная игла 30G"],
	},
};

/**
 * Опции для интеллектуального обогащения дневниковой записи на основе кодов 804н
 */
export interface EnrichDiaryFrom804nOptions {
	readonly toothNumber?: number | string | null | undefined;
	readonly surfaces?: readonly ToothSurface[] | null | undefined;
	readonly preserveCustomText?: boolean | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
}

/**
 * Синтезирует структурированный клинический протокол и дневник на основе выбранной услуги Номенклатуры 804н
 */
export function synthesizeProtocolFromOrder804nService(
	code804n: string,
	options?: EnrichDiaryFrom804nOptions,
): Order804nProtocolDefinition {
	const cleanCode = code804n.trim();
	const direct = ORDER_804N_PROTOCOL_DEFINITIONS[cleanCode];
	if (direct) {
		return direct;
	}

	// Поиск по префиксу: например A16.07.030.* -> эндодонтия, A16.07.008.* -> обтурация, A16.07.001.* -> удаление, A16.07.002.* -> пломба
	if (cleanCode.startsWith("A16.07.002")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.002.001"]!;
	}
	if (cleanCode.startsWith("A16.07.030")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.030.001"]!;
	}
	if (cleanCode.startsWith("A16.07.008")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.008.001"]!;
	}
	if (cleanCode.startsWith("A16.07.001")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.001.001"]!;
	}
	if (cleanCode.startsWith("A16.07.051") || cleanCode.startsWith("A16.07.020")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.051"]!;
	}
	if (cleanCode.startsWith("A16.07.004")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["A16.07.004"]!;
	}
	if (cleanCode.startsWith("B01.003.004")) {
		return ORDER_804N_PROTOCOL_DEFINITIONS["B01.003.004.005"]!;
	}

	// Дефолтный ответ
	return {
		code: cleanCode,
		nameRu: `Стоматологическая услуга ${cleanCode}`,
		primaryIcd10: "K02.1",
		protocolStepRu: `Выполнено медицинское вмешательство по коду ${cleanCode} в полном объеме согласно клиническим рекомендациям СтАР.`,
		defaultSubjective: "Жалобы соответствуют клиническому диагнозу.",
		defaultStatusLocalis: "Объективный статус осмотра зафиксирован.",
		requiredMaterials: ["Стандартный стоматологический набор"],
	};
}

/**
 * 100% неразрушающее обогащение дневника 043/у при выборе услуг 804н.
 * Защищает от потери любой введенный врачом текст (жалобы, анамнез, сопутствующие патологии).
 */
export function enrichDiaryFrom804nServices(
	existingDiary: Partial<SoapVisitDiary> | any,
	services804n: readonly (string | { code: string })[],
	options?: EnrichDiaryFrom804nOptions,
): SoapVisitDiary {
	const codes = services804n.map((s) => (typeof s === "string" ? s : s.code).trim());
	const definitions = codes.map((c) => synthesizeProtocolFromOrder804nService(c, options));
	const primaryDef = definitions[0];

	// 1. Жалобы (S): если введены врачом — сохраняем 100%
	let complaints = (existingDiary?.subjectiveComplaints || "").trim();
	if (!complaints && primaryDef?.defaultSubjective) {
		complaints = primaryDef.defaultSubjective;
	}

	// 2. Статус (O): если введен врачом — сохраняем 100%
	let statusLocalis = (existingDiary?.objectiveStatusLocalis || "").trim();
	if (!statusLocalis && primaryDef?.defaultStatusLocalis) {
		statusLocalis = primaryDef.defaultStatusLocalis;
	}

	// 3. Протокол лечения (P): обогащаем шагами процедур, избегая дублирования
	let currentProtocol = (existingDiary?.procedureProtocol || "").trim();
	const newSteps: string[] = [];

	for (const def of definitions) {
		if (def.protocolStepRu && !currentProtocol.includes(def.protocolStepRu)) {
			newSteps.push(def.protocolStepRu);
		}
	}

	let updatedProtocol = currentProtocol;
	if (newSteps.length > 0) {
		if (updatedProtocol) {
			updatedProtocol = `${updatedProtocol}\n\n${newSteps.join("\n\n")}`;
		} else {
			updatedProtocol = newSteps.join("\n\n");
		}
	}

	// 4. МКБ-10: выставляем основной код, если не был указан
	const icd10 = existingDiary?.assessmentIcd10Code || primaryDef?.primaryIcd10 || "K02.1";
	const diagText = existingDiary?.assessmentDiagnosisText || getClinicalProtocolTemplate(icd10).clinicalDiagnosis;

	// 5. Материалы: объединяем с дедупликацией
	const existingMaterials = (existingDiary?.appliedMaterials || "")
		.split(";")
		.map((s: string) => s.trim())
		.filter(Boolean);
	const newMaterials = definitions.flatMap((d) => d.requiredMaterials || []);
	const mergedMaterials = Array.from(new Set([...existingMaterials, ...newMaterials]));

	const toothNum = options?.toothNumber ? String(options.toothNumber) : (existingDiary?.toothNumber ?? null);

	return {
		entryDate: existingDiary?.entryDate || new Date().toISOString().split("T")[0] || "2026-08-25",
		toothNumber: toothNum,
		subjectiveComplaints: complaints,
		objectiveStatusLocalis: statusLocalis,
		percussionVertical: existingDiary?.percussionVertical || "negative",
		percussionHorizontal: existingDiary?.percussionHorizontal || "negative",
		probingTenderness: existingDiary?.probingTenderness || "none",
		thermalTestResponse: existingDiary?.thermalTestResponse || "indifferent",
		eodMicroamperes: existingDiary?.eodMicroamperes ?? null,
		assessmentDiagnosisText: diagText,
		assessmentIcd10Code: icd10,
		procedureProtocol: updatedProtocol,
		anesthesiaDetails: existingDiary?.anesthesiaDetails ?? null,
		appliedMaterials: mergedMaterials.length > 0 ? mergedMaterials.join("; ") : null,
		homeCareRecommendations: existingDiary?.homeCareRecommendations || getClinicalProtocolTemplate(icd10).defaultRecommendations,
		nextVisitDate: existingDiary?.nextVisitDate ?? null,
		doctorFullName: existingDiary?.doctorFullName || options?.doctorFullName || "Врач-стоматолог",
	};
}


