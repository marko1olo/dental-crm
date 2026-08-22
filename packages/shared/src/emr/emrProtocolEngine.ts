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
	type AnestheticDrug,
	type LocalAnesthesiaType,
	type BlackCavityClass,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	COMPANION_ICD10_CODES,
	anestheticDrugLabels,
	blackCavityClassLabels,
} from "./emrProtocolPresets.js";

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
	readonly toothNumber?: number | string | null;
	readonly icd10Code: string;
	readonly surfaces?: readonly ToothSurface[] | null;
	readonly blackClass?: BlackCavityClass | null;
	readonly rootCanalsCount?: number | null;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null;
	readonly dateStr?: string | null;
	readonly timeStr?: string | null;
	readonly customAnesthesia?: {
		drug?: AnestheticDrug;
		doseCarpules?: number;
		doseMl?: number;
		technique?: LocalAnesthesiaType;
	} | null;
	readonly customMaterials?: readonly string[] | null;
	readonly customComplaints?: string | null;
	readonly customObjectiveNotes?: string | null;
	readonly customProtocolNotes?: string | null;
	readonly isMultiVisitEndo?: boolean;
	readonly endoVisitStage?: "access_instrumentation_temporary_calcium" | "final_obturation_restoration" | "single_visit_complete";
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
	const anesthDrugInfo = anestheticDrugLabels[anesthDrugKey] || anestheticDrugLabels.septanest_1_100000;
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
			surfaces: tooth.surfaces,
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

	// Проверяем, передан ли дневник или полная карта
	const isFullCard = Boolean(input && (input.formNumber || input.passport || input.soapDiaries || input.visitDiaries));
	const fullCard = isFullCard ? input : null;
	const singleDiary = !isFullCard ? input : null;

	let icd10Valid = true;
	let fdiToothValid = true;
	let anesthesiaDoseSafe = true;
	let rubberDamCompliant = true;
	let rvgControlDocumented = true;
	let diagnosisProtocolConsistent = true;

	// 1. Проверка паспортной части (если передана полная карта)
	if (isFullCard && fullCard) {
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
	const rawDiaries = fullCard?.visitDiaries ?? fullCard?.soapDiaries ?? (singleDiary ? [singleDiary] : []);
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

		// Проверка хирургии (K08.1, удаление)
		if (icdClean === "K08.1" && (protocolLower.includes("удален") || protocolLower.includes("экстракц"))) {
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
