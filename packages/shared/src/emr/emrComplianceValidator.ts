/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U COMPLIANCE VALIDATOR (ORDERS № 834N & № 203N)
 * Statutory rules, semantic audit, and quality assessment
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { FullForm043uPayload, SoapVisitDiary } from "../documents/forms043u.js";
import { STATUTORY_EMR_PROTOCOL_CATALOG } from "./emrProtocolPresets.js";
import { type VisitDiaryEntry043, isValidFdiToothNumber } from "./emrProtocolDiary.js";

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


export type Form043uComplianceInput =
	| Partial<FullForm043uPayload>
	| Partial<SoapVisitDiary>
	| Partial<VisitDiaryEntry043>
	| Record<string, unknown>;

/**
 * Семантический и законодательный валидатор формы № 043/у по Приказу Минздрава № 834н
 */
export function validateForm043uCompliance(
	input: Form043uComplianceInput | null | undefined,
): Statutory043ComplianceReport {
	const issues: Statutory043Issue[] = [];
	const missingBlocks: string[] = [];

	const raw = (input && typeof input === "object" ? input : {}) as Record<string, any>;

	// Проверяем, передан ли дневник или полная карта 043/у
	const isExplicitCard = Boolean(
		input &&
		(raw.formNumber === "043/у" ||
			raw.passport !== undefined ||
			(raw.dentalStatus !== undefined && Array.isArray(raw.dentalStatus?.odontogramTeeth))),
	);
	const isSingleDiary = Boolean(
		input &&
		!isExplicitCard &&
		(typeof raw.procedureProtocol === "string" ||
			typeof raw.assessmentIcd10Code === "string" ||
			typeof raw.assessmentDiagnosisText === "string"),
	);
	const fullCard = isExplicitCard ? raw : null;
	const singleDiary = isSingleDiary ? raw : (!isExplicitCard && !Array.isArray(raw.visitDiaries) ? raw : null);

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
		(Array.isArray(raw.visitDiaries)
			? raw.visitDiaries
			: Array.isArray(raw.soapDiaries)
				? raw.soapDiaries
				: Array.isArray(input)
					? input
					: singleDiary
						? [singleDiary]
						: []);
	const diariesToCheck: VisitDiaryEntry043[] = Array.isArray(rawDiaries) ? rawDiaries : [];

	if (diariesToCheck.length === 0) {
		missingBlocks.push("Дневник приёма (Форма 043/у)");
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

		// I: Жалобы и анамнез
		if (!d.subjectiveComplaints || String(d.subjectiveComplaints).trim().length < 5) {
			issues.push({
				blockKey: "complaints",
				fieldLabel: `${diaryPrefix}I. Жалобы и анамнез`,
				message: "Блок жалоб не заполнен или содержит менее 5 символов.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н (Форма 043/у)",
			});
		}

		// II: Status localis
		if (!d.objectiveStatusLocalis || String(d.objectiveStatusLocalis).trim().length < 10) {
			issues.push({
				blockKey: "objective_status",
				fieldLabel: `${diaryPrefix}II. Объективный статус (Status localis)`,
				message: "Объективный статус (Status localis) не описан или не содержит данных осмотра.",
				severity: "critical",
				statutoryRule: "Приказ Минздрава № 834н (Форма 043/у)",
			});
		}

		// III: Диагноз и МКБ-10
		if (!d.assessmentIcd10Code || !/^[Kk]\d{2}(\.\d{1,2})?(_[A-Za-z0-9]+)?$/.test(String(d.assessmentIcd10Code).trim())) {
			icd10Valid = false;
			issues.push({
				blockKey: "diagnosis",
				fieldLabel: `${diaryPrefix}III. Код МКБ-10`,
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

		// IV: Протокол лечения
		if (!d.procedureProtocol || String(d.procedureProtocol).trim().length < 20) {
			issues.push({
				blockKey: "treatment_protocol",
				fieldLabel: `${diaryPrefix}IV. Протокол лечения (манипуляции)`,
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
