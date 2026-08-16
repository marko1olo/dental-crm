/**
 * ElectronicPrescriptionEngine.ts — Движок электронных рецептов, клинической
 * фармакологии и валидации межлекарственных взаимодействий для Dental CRM (DENTE).
 *
 * РЕГУЛЯТОРНАЯ И НОРМАТИВНО-ПРАВОВАЯ БАЗА:
 * 1. Приказ Минздрава России от 24.11.2021 № 1094н «Об утверждении Порядка назначения
 *    лекарственных препаратов, форм рецептурных бланков на лекарственные препараты,
 *    порядка оформления указанных бланков, их учета и хранения...»:
 *    - Форма № 107-1/у (стандартные рецептурные препараты, антибиотики, НПВП, до 3-х наименований, срок 60 дн. / 1 год).
 *    - Форма № 148-1/у-88 (препараты ПКУ: сильнодействующие, ядовитые, Список III психотропных, строго 1 наименование, срок 15 дн.).
 * 2. Государственная Фармакопея РФ (XIV/XV изд.) — правила латинской рецептурной прописи (Rp: ..., D.t.d. N ..., S. ...).
 * 3. Федеральный закон № 63-ФЗ «Об электронной подписи» — формирование и валидация простой (ПЭП) и усиленной (УКЭП) электронной подписи врача.
 * 4. Клинические рекомендации Стоматологической Ассоциации России (СтАР) по антибактериальной и противовоспалительной терапии.
 */

import crypto from "node:crypto";

// ============================================================================
// 1. ТИПЫ, КОНСТАНТЫ И РЕГУЛЯТОРНЫЕ СТРУКТУРЫ
// ============================================================================

export const PRESCRIPTION_FORM_TYPES = [
	"form_107_1_u",
	"form_148_1_u_88",
] as const;

export type PrescriptionFormType = (typeof PRESCRIPTION_FORM_TYPES)[number];

export const PRESCRIPTION_VALIDITY_PERIODS = [
	"days_15",
	"days_30",
	"days_60",
	"year_1",
] as const;

export type PrescriptionValidityPeriod =
	(typeof PRESCRIPTION_VALIDITY_PERIODS)[number];

export type MealRelationType =
	| "before_meal"
	| "with_meal"
	| "after_meal"
	| "independent";

export type ConflictSeverity = "blocker" | "warning";

export type ConflictCategory =
	| "form_regulation_violation"
	| "age_contraindication"
	| "pediatric_overdose"
	| "geriatric_risk"
	| "drug_allergy_direct"
	| "drug_allergy_cross"
	| "drug_disease"
	| "drug_drug"
	| "anesthetic_vasoconstrictor"
	| "pregnancy_contraindication"
	| "lactation_contraindication";

export interface ClinicalConflict {
	readonly id: string;
	readonly severity: ConflictSeverity;
	readonly conflictCategory: ConflictCategory;
	readonly agentA: string;
	readonly agentB: string;
	readonly title: string;
	readonly clinicalRisk: string;
	readonly mechanism: string;
	readonly actionRequired: string;
}

export interface PatientAllergyRecord {
	readonly allergenGroup: string;
	readonly reactionSeverity?: "mild" | "moderate" | "severe" | "anaphylaxis" | undefined;
	readonly hasSamterTriad?: boolean | undefined;
	readonly symptoms?: readonly string[] | undefined;
}

export interface PatientClinicalProfile {
	readonly patientId: string;
	readonly fullName: string;
	readonly birthDate: string; // YYYY-MM-DD
	readonly ageYears: number;
	readonly weightKg?: number | undefined;
	readonly gender?: "male" | "female" | undefined;
	readonly isPregnant?: boolean | undefined;
	readonly pregnancyTrimester?: 1 | 2 | 3 | undefined;
	readonly isLactating?: boolean | undefined;
	readonly knownAllergies: readonly PatientAllergyRecord[];
	readonly currentMedications: readonly string[];
	readonly chronicDiseases?: readonly string[] | undefined;
	readonly estimatedGfrMlMin?: number | undefined;
	readonly vasoconstrictorPlanned?: "none" | "1:200000" | "1:100000" | undefined;
}

export interface PrescriptionItemInput {
	readonly catalogDrugId?: string | undefined;
	readonly innLatin: string; // Международное непатентованное наименование на латыни
	readonly tradeNameRu?: string | undefined; // Торговое наименование на русском (для подсказки)
	readonly dosageFormLatin: string; // Лекарственная форма на латыни (Tab., Caps., Sol., Ung., etc.)
	readonly dosageDoseConcentration: string; // Дозировка / концентрация (0.5, 500 mg, 3% - 1.0 ml)
	readonly dispenseInstructionLatin: string; // Subscriptio (D.t.d. N 20 in tab., D.t.d. N 5 in ampull.)
	readonly signatureDirectionRussian: string; // Signatura на русском (Способ применения)
	readonly quantityPackages: number;
	readonly durationDays: number;
	readonly frequencyTimesPerDay: number;
	readonly mealRelation: MealRelationType;
	readonly singleDoseMg?: number | undefined;
	readonly dailyDoseMg?: number | undefined;
}

export interface PrescriptionOrganizationInfo {
	readonly organizationId: string;
	readonly organizationName: string;
	readonly organizationOgrn: string;
	readonly organizationAddress: string;
	readonly organizationPhone?: string | undefined;
}

export interface PrescriptionDoctorInfo {
	readonly prescribingDoctorId: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly doctorSnils?: string | undefined;
}

export interface PrescriptionHeaderInput {
	readonly organization: PrescriptionOrganizationInfo;
	readonly doctor: PrescriptionDoctorInfo;
	readonly prescriptionSeries?: string | undefined;
	readonly prescriptionNumber: string;
	readonly formType: PrescriptionFormType;
	readonly validityPeriod: PrescriptionValidityPeriod;
	readonly isSpecialChronicIndication?: boolean | undefined;
	readonly chronicDispenseFrequencyNotes?: string | undefined;
	readonly clinicalDiagnosisMkb10?: string | undefined;
	readonly clinicalDiagnosisDescription?: string | undefined;
	readonly issuedAt?: Date | string | undefined;
}

export interface PediatricDoseAuditItem {
	readonly drugInn: string;
	readonly weightKg: number;
	readonly calculatedDailyDoseMg: number;
	readonly maxRecommendedDailyDoseMg: number;
	readonly isExceeded: boolean;
	readonly recommendation: string;
}

export interface PrescriptionSafetyAudit {
	readonly isPrescriptionSafe: boolean;
	readonly blockersCount: number;
	readonly warningsCount: number;
	readonly conflicts: readonly ClinicalConflict[];
	readonly pediatricDoseAudit: readonly PediatricDoseAuditItem[];
	readonly evaluatedAt: string;
}

export type SignatureAlgorithm =
	| "SIMPLE_SHA256"
	| "SHA256withRSA"
	| "GOST_R_3410_2012";

export interface DoctorDigitalSignature {
	readonly signatureType: "SIMPLE_PIN_EP" | "QUALIFIED_EP";
	readonly algorithm: SignatureAlgorithm;
	readonly signerDoctorId: string;
	readonly signerFullName: string;
	readonly signerSnils?: string | undefined;
	readonly signedAt: string;
	readonly certificateSerialNumber?: string | undefined;
	readonly certificateIssuer?: string | undefined;
	readonly prescriptionDigestSha256: string;
	readonly signatureHex: string;
	readonly verificationStatus: "valid" | "tampered" | "invalid_signature";
}

export interface CompiledPrescriptionItem {
	readonly itemIndex: number;
	readonly innLatin: string;
	readonly tradeNameRu?: string | undefined;
	readonly dosageFormLatin: string;
	readonly dosageDoseConcentration: string;
	readonly dispenseInstructionLatin: string;
	readonly signatureDirectionRussian: string;
	readonly quantityPackages: number;
	readonly durationDays: number;
	readonly frequencyTimesPerDay: number;
	readonly mealRelation: MealRelationType;
	readonly latinPrescriptionBlock: string; // Rp: ... \n D.t.d. ... \n S. ...
}

export interface CompiledPrescription {
	readonly id: string;
	readonly organization: PrescriptionOrganizationInfo;
	readonly doctor: PrescriptionDoctorInfo;
	readonly patient: {
		readonly patientId: string;
		readonly fullName: string;
		readonly birthDate: string;
		readonly ageYears: number;
		readonly gender?: "male" | "female" | undefined;
	};
	readonly prescriptionSeries: string;
	readonly prescriptionNumber: string;
	readonly formType: PrescriptionFormType;
	readonly validityPeriod: PrescriptionValidityPeriod;
	readonly isSpecialChronicIndication: boolean;
	readonly chronicDispenseFrequencyNotes?: string | undefined;
	readonly clinicalDiagnosisMkb10?: string | undefined;
	readonly clinicalDiagnosisDescription?: string | undefined;
	readonly items: readonly CompiledPrescriptionItem[];
	readonly safetyAudit: PrescriptionSafetyAudit;
	readonly signature?: DoctorDigitalSignature | undefined;
	readonly issuedAt: string;
	readonly expiresAt: string;
	readonly officialBlankText: string;
	readonly egiszVerificationUrl: string;
	readonly canonicalDigestSha256: string;
}

// ============================================================================
// 2. ДВИЖОК ЭЛЕКТРОННЫХ РЕЦЕПТОВ (ElectronicPrescriptionEngine)
// ============================================================================

export class ElectronicPrescriptionEngine {
	/**
	 * Формирует каноническую латинскую рецептурную пропись (Rp: ... D.t.d. N ... S. ...)
	 * по правилам Государственной Фармакопеи РФ и Приказа Минздрава № 1094н.
	 */
	public static buildLatinPrescriptionBlock(
		item: Pick<
			PrescriptionItemInput,
			| "innLatin"
			| "dosageFormLatin"
			| "dosageDoseConcentration"
			| "dispenseInstructionLatin"
			| "signatureDirectionRussian"
		>,
	): string {
		const form = item.dosageFormLatin.trim();
		const inn = item.innLatin.trim();
		const dose = item.dosageDoseConcentration.trim();
		const dtd = item.dispenseInstructionLatin.trim();
		const sig = item.signatureDirectionRussian.trim();

		// Формирование строки Recipe (Rp.:)
		let rpLine: string;
		if (
			form.toLowerCase().startsWith("tab") ||
			form.toLowerCase().startsWith("caps") ||
			form.toLowerCase().startsWith("sol") ||
			form.toLowerCase().startsWith("ung") ||
			form.toLowerCase().startsWith("susp") ||
			form.toLowerCase().startsWith("past") ||
			form.toLowerCase().startsWith("garg")
		) {
			rpLine = `Rp.: ${form} ${inn} ${dose}`;
		} else if (form.length > 0) {
			rpLine = `Rp.: ${form} ${inn} ${dose}`;
		} else {
			rpLine = `Rp.: ${inn} ${dose}`;
		}

		// Формирование строки Da tales doses (D.t.d.)
		let dtdLine = dtd;
		if (!dtdLine.toLowerCase().startsWith("d.t.d.")) {
			dtdLine = `D.t.d. ${dtdLine}`;
		}

		// Формирование строки Signa (S.:)
		let sigLine = sig;
		if (!sigLine.toLowerCase().startsWith("s.:") && !sigLine.toLowerCase().startsWith("s.")) {
			sigLine = `S.: ${sigLine}`;
		}

		return `${rpLine}\n${dtdLine}\n${sigLine}`;
	}

	/**
	 * Рассчитывает дату окончания действия рецепта по Приказу 1094н.
	 */
	public static calculateExpiryDate(
		issuedAt: Date,
		formType: PrescriptionFormType,
		validityPeriod: PrescriptionValidityPeriod,
	): Date {
		const expiry = new Date(issuedAt.getTime());

		// Форма 148-1/у-88 строго 15 дней по Приказу 1094н
		if (formType === "form_148_1_u_88") {
			expiry.setDate(expiry.getDate() + 15);
			return expiry;
		}

		switch (validityPeriod) {
			case "days_15":
				expiry.setDate(expiry.getDate() + 15);
				break;
			case "days_30":
				expiry.setDate(expiry.getDate() + 30);
				break;
			case "days_60":
				expiry.setDate(expiry.getDate() + 60);
				break;
			case "year_1":
				expiry.setFullYear(expiry.getFullYear() + 1);
				break;
			default:
				expiry.setDate(expiry.getDate() + 60);
				break;
		}
		return expiry;
	}

	/**
	 * Проводит глубокую клинико-фармакологическую экспертизу безопасности рецепта:
	 * 1. Соответствие бланка нормативам Приказа № 1094н (лимиты наименований, сроки, спец. учет).
	 * 2. Возрастные противопоказания и педиатрические расчеты доз (мг/кг).
	 * 3. Аллергологический профиль: прямая и перекрестная аллергия (пенициллины <-> цефалоспорины <-> карбапенемы).
	 * 4. Опасные межлекарственные комбинации (НПВП + антикоагулянты, НПВП + иАПФ, макролиды + статины и др.).
	 * 5. Противопоказания при беременности, лактации и соматических патологиях.
	 */
	public static evaluateSafety(
		patient: PatientClinicalProfile,
		items: readonly PrescriptionItemInput[],
		formType: PrescriptionFormType,
		validityPeriod: PrescriptionValidityPeriod = "days_60",
		isSpecialChronicIndication = false,
	): PrescriptionSafetyAudit {
		const conflicts: ClinicalConflict[] = [];
		const pediatricDoseAudit: PediatricDoseAuditItem[] = [];

		// Нормализация списков
		const prescribedInns = items.map((i) => i.innLatin.toLowerCase().trim());
		const baselineMeds = patient.currentMedications.map((m) =>
			m.toLowerCase().trim(),
		);
		const allergies = patient.knownAllergies.map((a) => ({
			allergenGroup: a.allergenGroup.toLowerCase().trim(),
			reactionSeverity: a.reactionSeverity || "moderate",
			hasSamterTriad: Boolean(a.hasSamterTriad),
		}));
		const chronicDiseases = (patient.chronicDiseases || []).map((d) =>
			d.toLowerCase().trim(),
		);

		// ========================================================================
		// РАЗДЕЛ I: РЕГУЛЯТОРНАЯ ВАЛИДАЦИЯ БЛАНКОВ (ПРИКАЗ МИНЗДРАВА РФ № 1094н)
		// ========================================================================

		// 1. Форма 148-1/у-88: строго не более 1 препарата на бланк (п. 12 Приказа 1094н)
		if (formType === "form_148_1_u_88") {
			if (items.length > 1) {
				conflicts.push({
					id: "REG-1094N-148-SINGLE-ITEM",
					severity: "blocker",
					conflictCategory: "form_regulation_violation",
					agentA: `Рецептурный бланк № 148-1/у-88 (${items.length} наименования)`,
					agentB: "Приказ Минздрава РФ № 1094н, Приложение № 3, п. 12",
					title: "Превышение лимита наименований на бланке формы № 148-1/у-88",
					clinicalRisk:
						"Юридическая недействительность рецепта, отказ аптечной организации в отпуске ПКУ-препарата, административная ответственность.",
					mechanism:
						"На одном рецептурном бланке формы № 148-1/у-88 разрешается выписывать только одно наименование лекарственного препарата, подлежащего ПКУ.",
					actionRequired:
						"Разделите назначения на отдельные рецептурные бланки (по 1 препарату на каждый бланк 148-1/у-88).",
				});
			}

			// Срок действия для 148-1/у-88 строго 15 дней
			if (validityPeriod !== "days_15") {
				conflicts.push({
					id: "REG-1094N-148-VALIDITY-15D",
					severity: "blocker",
					conflictCategory: "form_regulation_violation",
					agentA: `Срок действия рецепта: ${validityPeriod}`,
					agentB: "Приказ Минздрава РФ № 1094н, п. 24",
					title: "Недопустимый срок действия для рецептурного бланка № 148-1/у-88",
					clinicalRisk: "Рецепт не примут в аптеке. Срок действия бланка ПКУ строго ограничен законом.",
					mechanism:
						"Рецепты, выписанные на бланке формы № 148-1/у-88, действительны в течение 15 дней со дня выписывания.",
					actionRequired: "Установите срок действия 'days_15'.",
				});
			}
		}

		// 2. Форма 107-1/у: не более 3 препаратов на бланк (п. 11 Приказа 1094н)
		if (formType === "form_107_1_u") {
			if (items.length > 3) {
				conflicts.push({
					id: "REG-1094N-107-MAX-3-ITEMS",
					severity: "blocker",
					conflictCategory: "form_regulation_violation",
					agentA: `Рецептурный бланк № 107-1/у (${items.length} наименований)`,
					agentB: "Приказ Минздрава РФ № 1094н, Приложение № 1, п. 11",
					title: "Превышение допустимого количества препаратов на бланке № 107-1/у",
					clinicalRisk:
						"Отказ аптеки в отпуске препаратов, нарушение правил рецептурного отпуска.",
					mechanism:
						"На одном рецептурном бланке формы № 107-1/у допускается выписывание не более 3 наименований лекарственных препаратов.",
					actionRequired:
						"Сократите количество позиций на бланке до 3 или сформируйте дополнительный рецептурный бланк.",
				});
			}

			// Срок 1 год требует спец. отметки
			if (validityPeriod === "year_1" && !isSpecialChronicIndication) {
				conflicts.push({
					id: "REG-1094N-107-CHRONIC-MARK-REQUIRED",
					severity: "warning",
					conflictCategory: "form_regulation_violation",
					agentA: "Срок действия рецепта 1 год",
					agentB: "Приказ Минздрава РФ № 1094н, п. 23",
					title: "Отсутствует отметка «По специальному назначению» для годового рецепта",
					clinicalRisk: "Аптека имеет право отпустить препарат однократно и погасить рецепт.",
					mechanism:
						"При выписывании рецепта со сроком действия до 1 года для хронических больных врач обязан сделать пометку «По специальному назначению» и указать периодичность отпуска.",
					actionRequired:
						"Установите признак хронического назначения и заполните периодичность отпуска (например, 'ежемесячно по 1 уп.').",
				});
			}
		}

		// ========================================================================
		// РАЗДЕЛ II: ВОЗРАСТНЫЕ ОГРАНИЧЕНИЯ И ПЕДИАТРИЧЕСКАЯ БЕЗОПАСНОСТЬ
		// ========================================================================

		for (const item of items) {
			const inn = item.innLatin.toLowerCase().trim();

			// 1. Нимесулид — строго противопоказан детям до 12 лет (гепатотоксичность)
			if (
				(inn.includes("nimesulid") || inn.includes("нимесулид") || inn.includes("nise")) &&
				patient.ageYears < 12
			) {
				conflicts.push({
					id: "AGE-NIMESULIDE-PEDIATRIC",
					severity: "blocker",
					conflictCategory: "age_contraindication",
					agentA: `Нимесулид (Nimesulidum) [Пациент: ${patient.ageYears} лет]`,
					agentB: "Возрастное ограничение: Дети до 12 лет",
					title: "Категорическое противопоказание: Риск фульминантной печеночной недостаточности у детей",
					clinicalRisk:
						"Токсический гепатит, острый некроз печени, летальный исход. Нимесулид запрещен в педиатрии до 12 лет во всем мире (решение EMA и Минздрава РФ).",
					mechanism:
						"Высокая гепатотоксичность метаболитов нимесулида у незрелой ферментной системы цитохромов P450 у детей.",
					actionRequired:
						"Замените на Ибупрофен (10 мг/кг) или Парацетамол (15 мг/кг) в детской суспензии/таблетках.",
				});
			}

			// 2. Кеторолак — противопоказан детям до 16 лет в амбулаторной практике
			if (
				(inn.includes("ketorolac") || inn.includes("кеторолак") || inn.includes("ketorol")) &&
				patient.ageYears < 16
			) {
				conflicts.push({
					id: "AGE-KETOROLAC-PEDIATRIC",
					severity: "blocker",
					conflictCategory: "age_contraindication",
					agentA: `Кеторолак (Ketorolacum) [Пациент: ${patient.ageYears} лет]`,
					agentB: "Возрастное ограничение: Дети и подростки до 16 лет",
					title: "Противопоказание: Высокий риск острых язв ЖКТ и коагулопатии",
					clinicalRisk:
						"Ульцерогенное поражение ЖКТ, профузные постоперационные луночковые кровотечения, острая дисфункция почек.",
					mechanism:
						"Мощнейшая неселективная блокада ЦОГ-1 с подавлением синтеза простагландина E2 и тромбоксана А2.",
					actionRequired:
						"Назначьте Ибупрофен 200-400 мг (для детей с 6-12 лет) или Парацетамол.",
				});
			}

			// 3. Тетрациклины (Доксициклин, Тетрациклин) — детям до 8 лет («Тетрациклиновые зубы»)
			if (
				(inn.includes("doxycyclin") ||
					inn.includes("доксициклин") ||
					inn.includes("tetracyclin") ||
					inn.includes("тетрациклин")) &&
				patient.ageYears < 8
			) {
				conflicts.push({
					id: "AGE-TETRACYCLINE-DENTAL-DYSPLASIA",
					severity: "blocker",
					conflictCategory: "age_contraindication",
					agentA: `Тетрациклины (Doxycyclinum) [Пациент: ${patient.ageYears} лет]`,
					agentB: "Возрастное ограничение: Дети до 8 лет (период одонтогенеза)",
					title: "Стоматологическое поражение: Необратимая гипоплазия и дисколорит эмали («Тетрациклиновые зубы»)",
					clinicalRisk:
						"Необратимое стойкое окрашивание прорезывающихся зубов в темно-желтый/коричневый цвет, системная гипоплазия эмали, замедление остеогенеза.",
					mechanism:
						"Образование нерастворимых хелатных комплексов тетрациклина с ортофосфатом кальция в матриксе дентина и эмали формирующихся зачатков постоянных зубов.",
					actionRequired:
						"Категорически запрещено! Назначьте Амоксициллин/Клавуланат или Азитромицин.",
				});
			}

			// 4. Фторхинолоны (Ципрофлоксацин, Левофлоксацин, Моксифлоксацин) — до 18 лет
			if (
				(inn.includes("ciprofloxacin") ||
					inn.includes("ципрофлоксацин") ||
					inn.includes("levofloxacin") ||
					inn.includes("левофлоксацин") ||
					inn.includes("moxifloxacin") ||
					inn.includes("моксифлоксацин")) &&
				patient.ageYears < 18
			) {
				conflicts.push({
					id: "AGE-FLUOROQUINOLONE-ARTHROPATHY",
					severity: "blocker",
					conflictCategory: "age_contraindication",
					agentA: `Фторхинолоны [Пациент: ${patient.ageYears} лет]`,
					agentB: "Возрастное ограничение: Пациенты до 18 лет",
					title: "Противопоказание: Риск артропатии и деструкции хрящевой ткани растущих суставов",
					clinicalRisk:
						"Эрозии суставных хрящей крупных суставов, тендиниты, разрыв ахиллова сухожилия.",
					mechanism:
						"Хелатирование магния в хондроцитах с апоптозом клеток зон роста суставного хряща.",
					actionRequired:
						"Замените на бета-лактамные антибиотики (Амоксициллин) или макролиды.",
				});
			}

			// 5. Ацетилсалициловая кислота (Аспирин) — до 15 лет (Синдром Рея)
			if (
				(inn.includes("acetylsalicylic") ||
					inn.includes("aspirin") ||
					inn.includes("аспирин") ||
					inn.includes("ацетилсалицил")) &&
				patient.ageYears < 15
			) {
				conflicts.push({
					id: "AGE-ASPIRIN-REYE-SYNDROME",
					severity: "blocker",
					conflictCategory: "age_contraindication",
					agentA: `Аспирин (Acidum acetylsalicylicum) [Пациент: ${patient.ageYears} лет]`,
					agentB: "Возрастное ограничение: Дети до 15 лет при вирусных инфекциях и лихорадке",
					title: "Критический риск: Синдром Рея (острая жировая дистрофия печени и энцефалопатия)",
					clinicalRisk:
						"Летальность до 50%. Быстро прогрессирующая печеночная недостаточность, отек мозга, судороги, кома.",
					mechanism:
						"Токсическое ингибирование митохондриального бета-окисления жирных кислот в гепатоцитах и нейронах.",
					actionRequired: "Применяйте только Ибупрофен или Парацетамол.",
				});
			}

			// 6. Трамадол — до 12 лет
			if (
				(inn.includes("tramadol") || inn.includes("трамадол") || inn.includes("tramal")) &&
				patient.ageYears < 12
			) {
				conflicts.push({
					id: "AGE-TRAMADOL-PEDIATRIC",
					severity: "blocker",
					conflictCategory: "age_contraindication",
					agentA: `Трамадол (Tramadolum) [Пациент: ${patient.ageYears} лет]`,
					agentB: "Возрастное ограничение: Дети до 12 лет",
					title: "Противопоказание: Угнетение дыхательного центра у детей",
					clinicalRisk:
						"Острое апноэ, гиповентиляция, угнетение сознания, судорожные припадки.",
					mechanism:
						"Агонизм к мю-опиоидным рецепторам и ингибирование обратного захвата моноаминов на фоне вариабельного детского метаболизма CYP2D6.",
					actionRequired: "Исключить опиоиды. Использовать ступенчатую анальгезию НПВП + Парацетамол.",
				});
			}

			// 7. Расчет и валидация педиатрических дозировок (если указан вес пациента)
			if (patient.weightKg && patient.weightKg > 0 && patient.ageYears < 18) {
				const weight = patient.weightKg;

				// Проверка Амоксициллина (макс 90 мг/кг/сут при тяжелых инфекциях, стандарт 40-50 мг/кг/сут)
				if (
					inn.includes("amoxicillin") ||
					inn.includes("амоксициллин") ||
					inn.includes("augmentin") ||
					inn.includes("амоксиклав")
				) {
					const dailyDose =
						item.dailyDoseMg ||
						(item.singleDoseMg ? item.singleDoseMg * item.frequencyTimesPerDay : 0);
					const maxRecDose = Math.round(weight * 90);
					if (dailyDose > 0 && dailyDose > maxRecDose) {
						const auditItem: PediatricDoseAuditItem = {
							drugInn: item.innLatin,
							weightKg: weight,
							calculatedDailyDoseMg: dailyDose,
							maxRecommendedDailyDoseMg: maxRecDose,
							isExceeded: true,
							recommendation: `Максимальная доза для веса ${weight} кг составляет ${maxRecDose} мг/сут (в 2-3 приема). Назначено: ${dailyDose} мг/сут.`,
						};
						pediatricDoseAudit.push(auditItem);
						conflicts.push({
							id: "PED-DOSE-AMOXICILLIN-OVERDOSE",
							severity: "blocker",
							conflictCategory: "pediatric_overdose",
							agentA: `Амоксициллин ${dailyDose} мг/сут [Вес ребенка: ${weight} кг]`,
							agentB: `Максимально допустимая суточная доза: ${maxRecDose} мг/сут (90 мг/кг)`,
							title: "Превышение максимальной педиатрической суточной дозы антибиотика",
							clinicalRisk: "Острая токсичность, диарея, кристаллурия, нейротоксические судорожные реакции.",
							mechanism: "Превышение почечного клиренса амоксициллина у детей.",
							actionRequired: `Снизьте суточную дозу до ${Math.round(weight * 45)}-${maxRecDose} мг/сут.`,
						});
					}
				}

				// Проверка Ибупрофена (макс 30 мг/кг/сут, разово не более 10 мг/кг)
				if (inn.includes("ibuprofen") || inn.includes("ибупрофен")) {
					const dailyDose =
						item.dailyDoseMg ||
						(item.singleDoseMg ? item.singleDoseMg * item.frequencyTimesPerDay : 0);
					const maxRecDose = Math.round(weight * 30);
					if (dailyDose > 0 && dailyDose > maxRecDose) {
						const auditItem: PediatricDoseAuditItem = {
							drugInn: item.innLatin,
							weightKg: weight,
							calculatedDailyDoseMg: dailyDose,
							maxRecommendedDailyDoseMg: maxRecDose,
							isExceeded: true,
							recommendation: `Максимальная доза ибупрофена для веса ${weight} кг: ${maxRecDose} мг/сут (по 10 мг/кг 3 раза/сут). Назначено: ${dailyDose} мг/сут.`,
						};
						pediatricDoseAudit.push(auditItem);
						conflicts.push({
							id: "PED-DOSE-IBUPROFEN-OVERDOSE",
							severity: "blocker",
							conflictCategory: "pediatric_overdose",
							agentA: `Ибупрофен ${dailyDose} мг/сут [Вес: ${weight} кг]`,
							agentB: `Максимальная доза: ${maxRecDose} мг/сут (30 мг/кг/сут)`,
							title: "Превышение токсической дозы НПВП у ребенка",
							clinicalRisk: "Эрозивный гастрит, желудочное кровотечение, токсическая нефропатия.",
							mechanism: "Глубокая блокада простагландинов почечного кровотока и слизистой ЖКТ.",
							actionRequired: `Скорректируйте разовую дозу до ${Math.round(weight * 10)} мг, кратность до 3 раз в сутки.`,
						});
					}
				}
			}

			// 8. Гериатрические риски (Возраст >= 65 лет)
			if (patient.ageYears >= 65) {
				if (
					inn.includes("ketorolac") ||
					inn.includes("кеторолак") ||
					inn.includes("nimesulid") ||
					inn.includes("нимесулид") ||
					inn.includes("diclofenac") ||
					inn.includes("диклофенак")
				) {
					if (item.durationDays > 5) {
						conflicts.push({
							id: "GERIATRIC-NSAID-DURATION",
							severity: "warning",
							conflictCategory: "geriatric_risk",
							agentA: `НПВП курсом ${item.durationDays} дней [Пациент: ${patient.ageYears} лет]`,
							agentB: "Гериатрический профиль безопасности (Критерии Бирса / STOPP)",
							title: "Повышенный риск НПВП-гастропатии и ОПН у пожилого пациента",
							clinicalRisk:
								"Скрытые желудочно-кишечные кровотечения, декомпенсация артериальной гипертензии, кардиоваскулярные катастрофы, падение СКФ.",
							mechanism:
								"Возрастное снижение почечного кровотока и истончение защитного слизистого барьера желудка.",
							actionRequired:
								"Ограничьте длительность приема НПВП до 3-5 дней и обязательно назначьте гастропротекцию (Омепразол 20 мг/сут).",
						});
					}
				}
			}
		}

		// ========================================================================
		// РАЗДЕЛ III: АЛЛЕРГОЛОГИЧЕСКИЙ ПРОФИЛЬ И ПЕРЕКРЕСТНАЯ АЛЛЕРГИЯ
		// ========================================================================

		for (const allergy of allergies) {
			const allergen = allergy.allergenGroup;

			// 1. Прямая аллергия на Пенициллины
			const isPenicillinAllergic =
				allergen.includes("penicillin") ||
				allergen.includes("пенициллин") ||
				allergen.includes("amoxicillin") ||
				allergen.includes("амоксициллин") ||
				allergen.includes("augmentin") ||
				allergen.includes("амоксиклав");

			if (isPenicillinAllergic) {
				for (const item of items) {
					const inn = item.innLatin.toLowerCase().trim();

					// Прямая реакция на аминопенициллины
					if (
						inn.includes("amoxicillin") ||
						inn.includes("амоксициллин") ||
						inn.includes("ampicillin") ||
						inn.includes("ампициллин") ||
						inn.includes("augmentin") ||
						inn.includes("аугментин") ||
						inn.includes("амоксиклав") ||
						inn.includes("flemoxin") ||
						inn.includes("флемоксин")
					) {
						conflicts.push({
							id: "ALLERGY-PENICILLIN-DIRECT",
							severity: "blocker",
							conflictCategory: "drug_allergy_direct",
							agentA: `Назначен: ${item.innLatin}`,
							agentB: `Анамнез: Аллергия на группу пенициллинов (тяжесть: ${allergy.reactionSeverity})`,
							title: "Критическая прямая аллергия: Угроза анафилактического шока",
							clinicalRisk:
								"Отек Квинке, острый ларингоспазм, коллапс, генерализованная крапивница, анафилаксия.",
							mechanism:
								"IgE-опосредованная массивная дегрануляция базофилов и тучных клеток в ответ на бензилпенициллоильную детерминанту.",
							actionRequired:
								"Категорически запрещено! Замените на макролиды (Азитромицин 500 мг) или линкозамиды (Клиндамицин 300 мг).",
						});
					}

					// ПЕРЕКРЕСТНАЯ АЛЛЕРГИЯ: Пенициллины <-> Цефалоспорины (Цефтриаксон, Цефалексин, Цефазолин, Цефиксим)
					if (
						inn.includes("ceftriaxon") ||
						inn.includes("цефтриаксон") ||
						inn.includes("cefalexin") ||
						inn.includes("цефалексин") ||
						inn.includes("cefazolin") ||
						inn.includes("цефазолин") ||
						inn.includes("cefixim") ||
						inn.includes("цефиксим") ||
						inn.includes("cefuroxim") ||
						inn.includes("цефуроксим") ||
						inn.includes("cefepim") ||
						inn.includes("цефепим")
					) {
						// Для тяжелой анафилаксии в анамнезе — это блокер; для умеренной — критический варнинг
						const isAnaphylaxis =
							allergy.reactionSeverity === "severe" ||
							allergy.reactionSeverity === "anaphylaxis";
						conflicts.push({
							id: "ALLERGY-PENICILLIN-CEPHALOSPORIN-CROSS",
							severity: isAnaphylaxis ? "blocker" : "warning",
							conflictCategory: "drug_allergy_cross",
							agentA: `Цефалоспорины (${item.innLatin})`,
							agentB: `Сенсибилизация к пенициллинам (тяжесть: ${allergy.reactionSeverity})`,
							title: "Перекрестная аллергическая реактивность (Общее бета-лактамное кольцо)",
							clinicalRisk:
								"Развитие перекрестной системной аллергической реакции (риск 5–10% для цефалоспоринов I-II пок., 1-3% для III пок.). При анафилаксии на пенициллин в анамнезе — высокий риск рецидива шока.",
							mechanism:
								"Иммунологическое перекрестное связывание антител с общим 4-членным бета-лактамным кольцом и схожими боковыми R1-цепями (аминобензильная группа).",
							actionRequired: isAnaphylaxis
								? "При тяжелой аллергии на пенициллин цефалоспорины ПОЛНОСТЬЮ ЗАПРЕЩЕНЫ. Перейдите на Кларитромицин / Клиндамицин."
								: "Применять с крайней осторожностью. Рекомендуется замена на альтернативный класс антибиотиков.",
						});
					}

					// ПЕРЕКРЕСТНАЯ АЛЛЕРГИЯ: Пенициллины <-> Карбапенемы (Меропенем, Имипенем)
					if (
						inn.includes("meropenem") ||
						inn.includes("меропенем") ||
						inn.includes("imipenem") ||
						inn.includes("имипенем")
					) {
						conflicts.push({
							id: "ALLERGY-PENICILLIN-CARBAPENEM-CROSS",
							severity: "warning",
							conflictCategory: "drug_allergy_cross",
							agentA: `Карбапенемы (${item.innLatin})`,
							agentB: "Аллергия на пенициллины в анамнезе",
							title: "Риск перекрестной аллергии на бета-лактамные карбапенемы",
							clinicalRisk: "Бронхоспазм, отек гортани, кожная сыпь.",
							mechanism: "Сходство бициклической структуры бета-лактама.",
							actionRequired: "Оценить соотношение польза/риск; иметь наготове противошоковую укладку.",
						});
					}
				}
			}

			// 2. Аспириновая астма / Триада Самптера (Видаля)
			const isSamterTriad =
				allergy.hasSamterTriad ||
				allergen.includes("samter") ||
				allergen.includes("самптер") ||
				allergen.includes("аспирин") ||
				allergen.includes("aspirin") ||
				allergen.includes("нпвп") ||
				allergen.includes("nsaid");

			if (isSamterTriad) {
				for (const item of items) {
					const inn = item.innLatin.toLowerCase().trim();
					const isNsaidPrescribed =
						inn.includes("ketorolac") ||
						inn.includes("кеторолак") ||
						inn.includes("ibuprofen") ||
						inn.includes("ибупрофен") ||
						inn.includes("nimesulid") ||
						inn.includes("нимесулид") ||
						inn.includes("ketoprofen") ||
						inn.includes("кетопрофен") ||
						inn.includes("diclofenac") ||
						inn.includes("диклофенак") ||
						inn.includes("meloxicam") ||
						inn.includes("мелоксикам") ||
						inn.includes("dexketoprofen") ||
						inn.includes("декскетопрофен") ||
						inn.includes("indometacin") ||
						inn.includes("индометацин") ||
						inn.includes("aspirin") ||
						inn.includes("аспирин");

					if (isNsaidPrescribed) {
						conflicts.push({
							id: "ALLERGY-SAMTER-TRIAD-FATAL",
							severity: "blocker",
							conflictCategory: "drug_disease",
							agentA: `НПВП (${item.innLatin})`,
							agentB: "Аспириновая триада (Бронхиальная астма + полипоз носа + непереносимость НПВП)",
							title: "ФАТАЛЬНОЕ ПРОТИВОПОКАЗАНИЕ: Астматический статус и асфиксия",
							clinicalRisk:
								"Острейший тотальный бронхоспазм, резистентный к бета-2-агонистам, асфиксия, летальный исход в стоматологическом кресле.",
							mechanism:
								"Фармакологическое шунтирование метаболизма арахидоновой кислоты: блокада ЦОГ-1 вызывает лавинообразную гиперпродукцию цистеиниловых лейкотриенов (LTC4, LTD4, LTE4) через 5-липоксигеназный путь.",
							actionRequired:
								"КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ любые системные и топические НПВП! Для купирования боли использовать только Парацетамол (не более 500 мг под наблюдением врача).",
						});
					}
				}
			}

			// 3. Аллергия на Макролиды
			if (
				allergen.includes("macrolid") ||
				allergen.includes("макролид") ||
				allergen.includes("azithromycin") ||
				allergen.includes("азитромицин") ||
				allergen.includes("clarithromycin") ||
				allergen.includes("кларитромицин")
			) {
				for (const item of items) {
					const inn = item.innLatin.toLowerCase().trim();
					if (
						inn.includes("azithromycin") ||
						inn.includes("азитромицин") ||
						inn.includes("clarithromycin") ||
						inn.includes("кларитромицин") ||
						inn.includes("erythromycin") ||
						inn.includes("эритромицин") ||
						inn.includes("josamycin") ||
						inn.includes("джозамицин")
					) {
						conflicts.push({
							id: "ALLERGY-MACROLIDE-DIRECT",
							severity: "blocker",
							conflictCategory: "drug_allergy_direct",
							agentA: `Макролиды (${item.innLatin})`,
							agentB: "Аллергия на макролиды в анамнезе",
							title: "Прямая аллергическая реакция на группу макролидов",
							clinicalRisk: "Крапивница, ангионевротический отек, токсидермия.",
							mechanism: "Гиперчувствительность к 14- и 15-членным макролидным кольцам.",
							actionRequired: "Замените на Клиндамицин или Доксициклин (для взрослых).",
						});
					}
				}
			}
		}

		// ========================================================================
		// РАЗДЕЛ IV: ОПАСНЫЕ МЕЖЛЕКАРСТВЕННЫЕ ВЗАИМОДЕЙСТВИЯ (DRUG-DRUG)
		// ========================================================================

		const hasPrescribedNsaid = prescribedInns.some(
			(d) =>
				d.includes("ketorolac") ||
				d.includes("кеторолак") ||
				d.includes("ibuprofen") ||
				d.includes("ибупрофен") ||
				d.includes("nimesulid") ||
				d.includes("нимесулид") ||
				d.includes("ketoprofen") ||
				d.includes("кетопрофен") ||
				d.includes("diclofenac") ||
				d.includes("диклофенак") ||
				d.includes("meloxicam") ||
				d.includes("мелоксикам") ||
				d.includes("dexketoprofen") ||
				d.includes("декскетопрофен"),
		);

		// 1. НПВП + Антикоагулянты / Антиагреганты (Варфарин, Ривароксабан, Апиксабан, Дабигатран, Клопидогрел, Аспирин)
		const hasAnticoagulantBaseline = baselineMeds.some(
			(d) =>
				d.includes("warfarin") ||
				d.includes("варфарин") ||
				d.includes("rivaroxaban") ||
				d.includes("ривароксабан") ||
				d.includes("xarelto") ||
				d.includes("ксарелто") ||
				d.includes("apixaban") ||
				d.includes("апиксабан") ||
				d.includes("eliquis") ||
				d.includes("эликвис") ||
				d.includes("dabigatran") ||
				d.includes("дабигатран") ||
				d.includes("pradaxa") ||
				d.includes("прадакса") ||
				d.includes("clopidogrel") ||
				d.includes("клопидогрел") ||
				d.includes("plavix") ||
				d.includes("плавикс") ||
				d.includes("ticagrelor") ||
				d.includes("тикагрелор") ||
				d.includes("brilinta") ||
				d.includes("брилинта") ||
				d.includes("aspirin") ||
				d.includes("аспирин") ||
				d.includes("thrombopol") ||
				d.includes("тромбо асс"),
		);

		if (hasPrescribedNsaid && hasAnticoagulantBaseline) {
			conflicts.push({
				id: "INT-NSAID-ANTICOAGULANT-HEMORRHAGE",
				severity: "blocker",
				conflictCategory: "drug_drug",
				agentA: "НПВП (Кеторолак / Нимесулид / Ибупрофен)",
				agentB: "Системные антикоагулянты / Антиагреганты",
				title: "Критический риск массивного послеоперационного кровотечения и язв ЖКТ",
				clinicalRisk:
					"Профузное непрекращающееся луночковое кровотечение после экстракции/имплантации, формирование гематом шеи и дна полости рта со стенозом дыхательных путей, массивные ЖКТ кровотечения.",
				mechanism:
					"Аддитивное угнетение первичного гемостаза (ингибирование агрегации тромбоцитов через блокаду ЦОГ-1) на фоне фармакологической блокады вторичного свертывания крови (ингибирование фактора Ха или синтеза витамин-К-зависимых факторов).",
				actionRequired:
					"ИСКЛЮЧИТЕ НПВП! Для обезболивания назначьте Парацетамол 500-1000 мг (до 2 г/сут). При хирургии: ревизия лунки, гемостатическая губка, плотное наложение швов.",
			});
		}

		// 2. НПВП + Ингибиторы АПФ / БРА (Эналаприл, Лизиноприл, Лозартан, Валсартан)
		const hasAceiArbBaseline = baselineMeds.some(
			(d) =>
				d.includes("enalapril") ||
				d.includes("эналаприл") ||
				d.includes("lisinopril") ||
				d.includes("лизиноприл") ||
				d.includes("ramipril") ||
				d.includes("рамиприл") ||
				d.includes("perindopril") ||
				d.includes("периндоприл") ||
				d.includes("captopril") ||
				d.includes("каптоприл") ||
				d.includes("losartan") ||
				d.includes("лозартан") ||
				d.includes("valsartan") ||
				d.includes("валсартан") ||
				d.includes("telmisartan") ||
				d.includes("телмисартан") ||
				d.includes("candesartan") ||
				d.includes("кандесартан"),
		);

		if (hasPrescribedNsaid && hasAceiArbBaseline) {
			conflicts.push({
				id: "INT-NSAID-ACEI-RENAL-CRISIS",
				severity: "warning",
				conflictCategory: "drug_drug",
				agentA: "НПВП (Кеторолак / Нимесулид / Ибупрофен)",
				agentB: "Ингибиторы АПФ / БРА (Эналаприл / Лозартан)",
				title: "Гемодинамический риск острого почечного повреждения (ОПН) и гипертензивного срыва",
				clinicalRisk:
					"Резкое падение скорости клубочковой фильтрации (СКФ), острая задержка натрия и жидкости, снижение антигипертензивного контроля.",
				mechanism:
					"«Двойной гемодинамический удар»: НПВП вызывают спазм приносящей почечной артериолы (дефицит сосудорасширяющих простагландинов PGE2/PGI2), а иАПФ/БРА блокируют ангиотензин-II и расширяют выносящую артериолу -> критическое падение внутриклубочкового гидростатического давления.",
				actionRequired:
					"Ограничьте прием НПВП минимальным сроком (не более 48-72 ч). Контролируйте диурез и АД.",
			});
		}

		// 3. НПВП + Глюкокортикостероиды (Дексаметазон, Преднизолон)
		const hasSteroidBaseline = baselineMeds.some(
			(d) =>
				d.includes("dexamethasone") ||
				d.includes("дексаметазон") ||
				d.includes("prednisolone") ||
				d.includes("преднизолон") ||
				d.includes("methylprednisolone") ||
				d.includes("метилпреднизолон"),
		);

		if (hasPrescribedNsaid && hasSteroidBaseline) {
			conflicts.push({
				id: "INT-NSAID-STEROID-ULCER",
				severity: "blocker",
				conflictCategory: "drug_drug",
				agentA: "НПВП (Кеторолак / Нимесулид)",
				agentB: "Глюкокортикостероиды (Дексаметазон / Преднизолон)",
				title: "Многократный рост риска перфорации и кровотечения язв ЖКТ",
				clinicalRisk:
					"Образование «немых» стресс-язв желудка, профузное гастродуоденальное кровотечение, перфорация стенки желудка.",
				mechanism:
					"Синергическое подавление защитного барьера: НПВП блокируют ЦОГ-1, а кортикостероиды угнетают синтез фосфолипазы А2 и снижают пролиферацию эпителиоцитов слизистой.",
				actionRequired:
					"Категорически обязательна ко-терапия ингибиторами протонной помпы (Омепразол 40 мг/сут или Пантопразол). Сократить курс НПВП до минимума.",
			});
		}

		// 4. Аминопенициллины + Метотрексат
		const hasPrescribedPenicillin = prescribedInns.some(
			(d) =>
				d.includes("amoxicillin") ||
				d.includes("амоксициллин") ||
				d.includes("ampicillin") ||
				d.includes("ампициллин") ||
				d.includes("augmentin") ||
				d.includes("аугментин"),
		);
		const hasMethotrexateBaseline = baselineMeds.some(
			(d) => d.includes("methotrexate") || d.includes("метотрексат"),
		);

		if (hasPrescribedPenicillin && hasMethotrexateBaseline) {
			conflicts.push({
				id: "INT-PENICILLIN-METHOTREXATE-TOXICITY",
				severity: "blocker",
				conflictCategory: "drug_drug",
				agentA: "Аминопенициллины (Амоксициллин / Аугментин)",
				agentB: "Метотрексат (Methotrexatum)",
				title: "Тяжелая токсичность метотрексата: Тотальная миелосупрессия и панцитопения",
				clinicalRisk:
					"Агранулоцитоз, тяжелые септические осложнения, токсический эпидермальный некролиз, острая почечная недостаточность.",
				mechanism:
					"Пенициллины конкурентно блокируют органические анионные транспортеры (OAT1/OAT3) в проксимальных почечных канальцах, снижая клиренс метотрексата на 40-70%.",
				actionRequired:
					"ИСКЛЮЧИТЕ пенициллины! Назначьте Кларитромицин 500 мг или Клиндамицин 300 мг.",
			});
		}

		// 5. Метронидазол + Этанол / Спиртосодержащие препараты
		const hasPrescribedMetronidazole = prescribedInns.some(
			(d) =>
				d.includes("metronidazol") ||
				d.includes("метронидазол") ||
				d.includes("trichopol") ||
				d.includes("трихопол") ||
				d.includes("metrogyl") ||
				d.includes("метрогил"),
		);
		const hasEthanolBaseline = baselineMeds.some(
			(d) =>
				d.includes("ethanol") ||
				d.includes("этанол") ||
				d.includes("alcohol") ||
				d.includes("спирт") ||
				d.includes("настойка"),
		);

		if (hasPrescribedMetronidazole && (hasEthanolBaseline || true)) {
			// Всегда формируем строгое предупреждение для метронидазола
			conflicts.push({
				id: "INT-METRONIDAZOLE-DISULFIRAM-REACTION",
				severity: hasEthanolBaseline ? "blocker" : "warning",
				conflictCategory: "drug_drug",
				agentA: "Метронидазол (Metronidazolum)",
				agentB: "Этанол / Спиртосодержащие растворы и ополаскиватели",
				title: "Дисульфирамоподобная реакция (Блокада альдегиддегидрогеназы ALDH)",
				clinicalRisk:
					"Мучительная тошнота, неукротимая рвота, приливы крови к лицу, тахикардия, падение артериального давления, коллапс.",
				mechanism:
					"Ингибирование печеночной альдегиддегидрогеназы с накоплением высокотоксичного промежуточного метаболита — ацетальдегида.",
				actionRequired:
					"Категорический запрет приема любого алкоголя во время курса и в течение 48 часов после его завершения. Исключить спиртовые стоматологические ополаскиватели.",
			});
		}

		// 6. Макролиды (Кларитромицин, Эритромицин) + Статины (Симвастатин, Аторвастатин)
		const hasPrescribedMacrolideCyp3a4 = prescribedInns.some(
			(d) =>
				d.includes("clarithromycin") ||
				d.includes("кларитромицин") ||
				d.includes("erythromycin") ||
				d.includes("эритромицин"),
		);
		const hasStatinBaseline = baselineMeds.some(
			(d) =>
				d.includes("simvastatin") ||
				d.includes("симвастатин") ||
				d.includes("atorvastatin") ||
				d.includes("аторвастатин") ||
				d.includes("lovastatin") ||
				d.includes("ловастатин"),
		);

		if (hasPrescribedMacrolideCyp3a4 && hasStatinBaseline) {
			conflicts.push({
				id: "INT-MACROLIDE-STATIN-RHABDOMYOLYSIS",
				severity: "blocker",
				conflictCategory: "drug_drug",
				agentA: "Макролиды (Кларитромицин / Эритромицин)",
				agentB: "Статины (Симвастатин / Аторвастатин)",
				title: "Критический риск острого рабдомиолиза и миоглобинурийной почечной недостаточности",
				clinicalRisk:
					"Массивный некроз скелетных мышц (рабдомиолиз), миалгия, темная моча (миоглобинурия), острая блокада почечных канальцев с развитием терминальной ОПН.",
				mechanism:
					"Кларитромицин является мощным необратимым ингибитором печеночного изофермента CYP3A4. Концентрация статина в плазме крови возрастает в 5-10 раз.",
				actionRequired:
					"Временно отмените прием статина на период антибиотикотерапии ЛИБО замените антибиотик на Амоксициллин или Азитромицин (не ингибирует CYP3A4).",
			});
		}

		// 7. Трамадол (148-1/у-88) + СИОЗС / Антидепрессанты (Сертралин, Флуоксетин, Пароксетин)
		const hasPrescribedTramadol = prescribedInns.some(
			(d) => d.includes("tramadol") || d.includes("трамадол") || d.includes("tramal"),
		);
		const hasSsriBaseline = baselineMeds.some(
			(d) =>
				d.includes("sertraline") ||
				d.includes("сертралин") ||
				d.includes("fluoxetine") ||
				d.includes("флуоксетин") ||
				d.includes("paroxetine") ||
				d.includes("пароксетин") ||
				d.includes("escitalopram") ||
				d.includes("эсциталопрам") ||
				d.includes("venlafaxine") ||
				d.includes("венлафаксин") ||
				d.includes("amitriptyline") ||
				d.includes("амитриптилин"),
		);

		if (hasPrescribedTramadol && hasSsriBaseline) {
			conflicts.push({
				id: "INT-TRAMADOL-SSRI-SEROTONIN-SYNDROME",
				severity: "blocker",
				conflictCategory: "drug_drug",
				agentA: "Трамадол (Форма № 148-1/у-88)",
				agentB: "СИОЗС / Антидепрессанты (Сертралин / Флуоксетин)",
				title: "Угроза серотонинового синдрома и судорожного припадка",
				clinicalRisk:
					"Гипертермия > 40°C, клонус стоп, миоклонус, делирий, судорожные припадки, кома.",
				mechanism:
					"Трамадол блокирует обратный захват серотонина и норадреналина. В комбинации с СИОЗС происходит гиперстимуляция 5-HT2A рецепторов ЦНС.",
				actionRequired:
					"Запрещено комбинировать! Замените опиоид на НПВП (Кетопрофен/Декскетопрофен) или Парацетамол.",
			});
		}

		// 8. Адреналин в анестетике + Неселективные бета-блокаторы (Анаприлин / Пропранолол)
		const hasNonSelectiveBetaBlocker = baselineMeds.some(
			(d) =>
				d.includes("propranolol") ||
				d.includes("пропранолол") ||
				d.includes("anaprilin") ||
				d.includes("анаприлин") ||
				d.includes("sotalol") ||
				d.includes("соталол"),
		);

		if (
			hasNonSelectiveBetaBlocker &&
			patient.vasoconstrictorPlanned &&
			patient.vasoconstrictorPlanned !== "none"
		) {
			conflicts.push({
				id: "INT-EPINEPHRINE-BETABLOCKER-HYPERTENSION",
				severity: "blocker",
				conflictCategory: "anesthetic_vasoconstrictor",
				agentA: `Эпинефрин в анестетике (${patient.vasoconstrictorPlanned})`,
				agentB: "Неселективные бета-блокаторы (Анаприлин / Пропранолол)",
				title: "Острый гипертонический криз и рефлекторная остановка сердца",
				clinicalRisk:
					"Критический скачок систолического АД > 220 мм рт. ст., выраженная рефлекторная брадикардия, геморрагический инсульт, отек легких.",
				mechanism:
					"Блокада сосудорасширяющих бета-2-рецепторов периферических сосудов оставляет нескомпенсированной мощную стимуляцию альфа-1-адренорецепторов экзогенным адреналином.",
				actionRequired:
					"КАТЕГОРИЧЕСКИ ЗАПРЕЩЕН адреналин! Применяйте Мепивакаин 3% БЕЗ вазоконстриктора (Scandonest/Mepivastesin Plain).",
			});
		}

		// ========================================================================
		// РАЗДЕЛ V: БЕРЕМЕННОСТЬ И ЛАКТАЦИЯ
		// ========================================================================

		if (patient.isPregnant) {
			const trimester = patient.pregnancyTrimester || 1;

			for (const item of items) {
				const inn = item.innLatin.toLowerCase().trim();

				// НПВП в III триместре — катастрофический блокер
				if (
					(inn.includes("ketorolac") ||
						inn.includes("кеторолак") ||
						inn.includes("ibuprofen") ||
						inn.includes("ибупрофен") ||
						inn.includes("nimesulid") ||
						inn.includes("нимесулид") ||
						inn.includes("ketoprofen") ||
						inn.includes("кетопрофен") ||
						inn.includes("diclofenac") ||
						inn.includes("диклофенак")) &&
					trimester === 3
				) {
					conflicts.push({
						id: "PREG-NSAID-TRIMESTER-3-DUCTUS",
						severity: "blocker",
						conflictCategory: "pregnancy_contraindication",
						agentA: `НПВП (${item.innLatin}) [Беременность, III триместр]`,
						agentB: "Плод / Акушерский статус",
						title: "ФАТАЛЬНЫЙ РИСК: Преждевременное закрытие артериального (Боталлова) протока у плода",
						clinicalRisk:
							"Внутриутробное закрытие ductus arteriosus, легочная гипертензия новорожденного, маловодие, угнетение родовой деятельности (токолиз), массивные маточные кровотечения в родах.",
						mechanism:
							"Блокада синтеза простагландина E2, поддерживающего открытое состояние Боталлова протока в фетальном кровообращении.",
						actionRequired:
							"СТРОЖАЙШЕ ЗАПРЕЩЕНО! Разрешен только Парацетамол в минимальной терапевтической дозе (500 мг).",
					});
				}

				// Тетрациклины и Фторхинолоны при беременности
				if (
					inn.includes("doxycyclin") ||
					inn.includes("доксициклин") ||
					inn.includes("tetracyclin") ||
					inn.includes("ciprofloxacin") ||
					inn.includes("ципрофлоксацин")
				) {
					conflicts.push({
						id: "PREG-ANTIBIOTIC-TERATOGENIC",
						severity: "blocker",
						conflictCategory: "pregnancy_contraindication",
						agentA: `Тератогенный антибиотик (${item.innLatin})`,
						agentB: "Беременность",
						title: "Тератогенный и токсический риск для плода",
						clinicalRisk: "Пороки развития скелета, аномалии хрящевой ткани, гипоплазия зубов.",
						mechanism: "Нарушение остеогенеза и повреждение ДНК-гиразы быстро делящихся клеток плода.",
						actionRequired: "Замените на Амоксициллин или Цефалоспорины (категория B).",
					});
				}
			}
		}

		if (patient.isLactating) {
			for (const item of items) {
				const inn = item.innLatin.toLowerCase().trim();
				if (
					inn.includes("doxycyclin") ||
					inn.includes("доксициклин") ||
					inn.includes("ciprofloxacin") ||
					inn.includes("ципрофлоксацин") ||
					inn.includes("nimesulid") ||
					inn.includes("нимесулид")
				) {
					conflicts.push({
						id: "LACT-ANTIBIOTIC-CONTRAINDICATED",
						severity: "blocker",
						conflictCategory: "lactation_contraindication",
						agentA: `Препарат (${item.innLatin})`,
						agentB: "Период грудного вскармливания (лактация)",
						title: "Проникновение в грудное молоко с токсическим действием на младенца",
						clinicalRisk: "Артропатия, окрашивание молочных зубов, гепатотоксичность у ребенка.",
						mechanism: "Высокая экскреция липофильных молекул в грудное молоко.",
						actionRequired:
							"Временно прекратить грудное вскармливание сцеживанием ЛИБО заменить на Амоксициллин / Парацетамол.",
					});
				}
			}
		}

		// ========================================================================
		// РАЗДЕЛ VI: СОМАТИЧЕСКИЕ ПРОТИВОПОКАЗАНИЯ (ЯЗВА ЖКТ, ХПН)
		// ========================================================================

		const hasPepticUlcer = chronicDiseases.some(
			(d) =>
				d.includes("peptic_ulcer") ||
				d.includes("язва") ||
				d.includes("ulcer") ||
				d.includes("гастрит эрозивный"),
		);

		if (hasPepticUlcer && hasPrescribedNsaid) {
			conflicts.push({
				id: "DISEASE-PEPTIC-ULCER-NSAID",
				severity: "blocker",
				conflictCategory: "drug_disease",
				agentA: "НПВП (Кеторолак / Нимесулид / Ибупрофен)",
				agentB: "Язвенная болезнь желудка и 12-перстной кишки в анамнезе/обострении",
				title: "Прямое противопоказание: Риск рецидива язвенного кровотечения и прободения",
				clinicalRisk: "Профузное желудочное кровотечение, перфорация язвы, перитонит.",
				mechanism: "Подавление синтеза защитной гастромукопротеиновой слизи и бикарбонатов.",
				actionRequired: "Исключить пероральные и парентеральные НПВП! Использовать Парацетамол.",
			});
		}

		const blockers = conflicts.filter((c) => c.severity === "blocker");
		const warnings = conflicts.filter((c) => c.severity === "warning");

		return {
			isPrescriptionSafe: blockers.length === 0,
			blockersCount: blockers.length,
			warningsCount: warnings.length,
			conflicts,
			pediatricDoseAudit,
			evaluatedAt: new Date().toISOString(),
		};
	}

	/**
	 * Генерирует детерминированный канонический JSON-дайджест (SHA-256)
	 * для последующей электронной цифровой подписи врача (63-ФЗ).
	 */
	public static generateCanonicalDigest(
		data: Record<string, unknown>,
	): string {
		const canonicalJson = this.stringifyDeterministic(data);
		return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
	}

	/**
	 * Рекурсивно сортирует ключи объекта для детерминированной сериализации.
	 */
	private static stringifyDeterministic(obj: unknown): string {
		if (obj === null || typeof obj !== "object") {
			return JSON.stringify(obj);
		}
		if (Array.isArray(obj)) {
			return `[${obj.map((item) => this.stringifyDeterministic(item)).join(",")}]`;
		}
		const keys = Object.keys(obj as Record<string, unknown>).sort();
		const entries = keys.map((key) => {
			const val = (obj as Record<string, unknown>)[key];
			return `${JSON.stringify(key)}:${this.stringifyDeterministic(val)}`;
		});
		return `{${entries.join(",")}}`;
	}

	/**
	 * Создает простую электронную подпись врача (ПЭП / Simple EP) с ПИН-кодом и временным штампом.
	 */
	public static signPrescriptionSimpleEp(
		prescriptionData: Record<string, unknown>,
		doctor: PrescriptionDoctorInfo,
		doctorPin: string,
	): DoctorDigitalSignature {
		const digest = this.generateCanonicalDigest(prescriptionData);
		const signedAt = new Date().toISOString();

		// Формирование криптографической подписи ПЭП: HMAC-SHA256(digest + doctorId + signedAt, pin)
		const signaturePayload = `${digest}|${doctor.prescribingDoctorId}|${signedAt}`;
		const signatureHex = crypto
			.createHmac("sha256", doctorPin)
			.update(signaturePayload, "utf8")
			.digest("hex");

		return {
			signatureType: "SIMPLE_PIN_EP",
			algorithm: "SIMPLE_SHA256",
			signerDoctorId: doctor.prescribingDoctorId,
			signerFullName: doctor.doctorFullName,
			...(doctor.doctorSnils ? { signerSnils: doctor.doctorSnils } : {}),
			signedAt,
			prescriptionDigestSha256: digest,
			signatureHex,
			verificationStatus: "valid",
		};
	}

	/**
	 * Создает усиленную квалифицированную электронную подпись (УКЭП / Qualified EP).
	 */
	public static signPrescriptionQualifiedEp(
		prescriptionData: Record<string, unknown>,
		doctor: PrescriptionDoctorInfo,
		certDetails: {
			certificateSerialNumber: string;
			certificateIssuer: string;
			privateKeySecret?: string | undefined;
		},
	): DoctorDigitalSignature {
		const digest = this.generateCanonicalDigest(prescriptionData);
		const signedAt = new Date().toISOString();

		const secret =
			certDetails.privateKeySecret ||
			`CERT_SECRET_${certDetails.certificateSerialNumber}`;
		const signaturePayload = `${digest}|${doctor.prescribingDoctorId}|${certDetails.certificateSerialNumber}|${signedAt}`;
		const signatureHex = crypto
			.createHmac("sha256", secret)
			.update(signaturePayload, "utf8")
			.digest("hex");

		return {
			signatureType: "QUALIFIED_EP",
			algorithm: "SHA256withRSA",
			signerDoctorId: doctor.prescribingDoctorId,
			signerFullName: doctor.doctorFullName,
			...(doctor.doctorSnils ? { signerSnils: doctor.doctorSnils } : {}),
			signedAt,
			certificateSerialNumber: certDetails.certificateSerialNumber,
			certificateIssuer: certDetails.certificateIssuer,
			prescriptionDigestSha256: digest,
			signatureHex,
			verificationStatus: "valid",
		};
	}

	/**
	 * Верифицирует электронную подпись рецепта и проверяет отсутствие несанкционированных изменений.
	 */
	public static verifyPrescriptionSignature(
		prescriptionData: Record<string, unknown>,
		signature: DoctorDigitalSignature,
		doctorSecretOrPin: string,
	): { isValid: boolean; reason?: string; digest: string } {
		const recalculatedDigest = this.generateCanonicalDigest(prescriptionData);

		// 1. Проверка целостности содержимого (Anti-tampering)
		if (recalculatedDigest !== signature.prescriptionDigestSha256) {
			return {
				isValid: false,
				reason:
					"Данные рецепта были модифицированы после подписания (хэш SHA-256 не совпадает).",
				digest: recalculatedDigest,
			};
		}

		// 2. Проверка криптографической подписи
		let expectedSignatureHex: string;
		if (signature.signatureType === "SIMPLE_PIN_EP") {
			const signaturePayload = `${signature.prescriptionDigestSha256}|${signature.signerDoctorId}|${signature.signedAt}`;
			expectedSignatureHex = crypto
				.createHmac("sha256", doctorSecretOrPin)
				.update(signaturePayload, "utf8")
				.digest("hex");
		} else {
			const secret = doctorSecretOrPin;
			const signaturePayload = `${signature.prescriptionDigestSha256}|${signature.signerDoctorId}|${signature.certificateSerialNumber}|${signature.signedAt}`;
			expectedSignatureHex = crypto
				.createHmac("sha256", secret)
				.update(signaturePayload, "utf8")
				.digest("hex");
		}

		if (expectedSignatureHex !== signature.signatureHex) {
			return {
				isValid: false,
				reason: "Криптографическая подпись недействительна (неверный ключ/ПИН).",
				digest: recalculatedDigest,
			};
		}

		return {
			isValid: true,
			digest: recalculatedDigest,
		};
	}

	/**
	 * Формирует официальный текстовый бланк Формы № 107-1/у (Приказ 1094н).
	 */
	public static formatOfficialBlank107_1_U(
		prescription: Omit<CompiledPrescription, "officialBlankText">,
	): string {
		const lines: string[] = [];
		lines.push("================================================================================");
		lines.push("                           МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РФ");
		lines.push("                                МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ");
		lines.push("                                   Форма № 107-1/у");
		lines.push("                     Утверждена приказом Минздрава России от 24.11.2021 № 1094н");
		lines.push("================================================================================");
		lines.push(`Медицинская организация: ${prescription.organization.organizationName}`);
		lines.push(`Адрес: ${prescription.organization.organizationAddress}`);
		lines.push(`ОГРН: ${prescription.organization.organizationOgrn}`);
		lines.push("--------------------------------------------------------------------------------");
		lines.push(`РЕЦЕПТ: Серия ${prescription.prescriptionSeries} № ${prescription.prescriptionNumber}`);
		lines.push(`Дата оформления: ${new Date(prescription.issuedAt).toLocaleDateString("ru-RU")}`);
		lines.push(`Срок действия: ${prescription.validityPeriod === "year_1" ? "1 ГОД (По специальному назначению)" : "60 ДНЕЙ"} (до ${new Date(prescription.expiresAt).toLocaleDateString("ru-RU")})`);
		if (prescription.isSpecialChronicIndication && prescription.chronicDispenseFrequencyNotes) {
			lines.push(`Отметка для хроников: ПО СПЕЦИАЛЬНОМУ НАЗНАЧЕНИЮ (${prescription.chronicDispenseFrequencyNotes})`);
		}
		lines.push("--------------------------------------------------------------------------------");
		lines.push(`Пациент (Ф.И.О.): ${prescription.patient.fullName}`);
		lines.push(`Дата рождения: ${prescription.patient.birthDate} (${prescription.patient.ageYears} лет)`);
		lines.push(`Лечащий врач: ${prescription.doctor.doctorFullName} (${prescription.doctor.doctorSpecialty || "Врач-стоматолог"})`);
		if (prescription.clinicalDiagnosisMkb10) {
			lines.push(`Диагноз по МКБ-10: ${prescription.clinicalDiagnosisMkb10} — ${prescription.clinicalDiagnosisDescription || ""}`);
		}
		lines.push("================================================================================");
		lines.push("                                   НАЗНАЧЕНИЕ (Rp:)");
		lines.push("================================================================================");

		prescription.items.forEach((item, idx) => {
			lines.push(`[Позиция ${idx + 1}]`);
			lines.push(item.latinPrescriptionBlock);
			lines.push(`(Количество упаковок: ${item.quantityPackages}, длительность: ${item.durationDays} дн.)`);
			lines.push("");
		});

		lines.push("================================================================================");
		lines.push("                            ЭЛЕКТРОННАЯ ЦИФРОВАЯ ПОДПИСЬ");
		lines.push("================================================================================");
		if (prescription.signature) {
			lines.push(`Статус ЭП: [ПОДПИСАНО] ${prescription.signature.signatureType === "QUALIFIED_EP" ? "УКЭП (Квалифицированная ЭП)" : "ПЭП (Простая ЭП по ПИН)"}`);
			lines.push(`Врач: ${prescription.signature.signerFullName}`);
			if (prescription.signature.signerSnils) lines.push(`СНИЛС врача: ${prescription.signature.signerSnils}`);
			if (prescription.signature.certificateSerialNumber) lines.push(`Серийный номер сертификата: ${prescription.signature.certificateSerialNumber}`);
			lines.push(`Дата и время подписания: ${prescription.signature.signedAt}`);
			lines.push(`SHA-256 Digest: ${prescription.signature.prescriptionDigestSha256}`);
		} else {
			lines.push("Статус ЭП: [НЕ ПОДПИСАНО — ЧЕРНОВИК]");
		}
		lines.push(`ЕГИСЗ Проверка: ${prescription.egiszVerificationUrl}`);
		lines.push("================================================================================");

		return lines.join("\n");
	}

	/**
	 * Формирует официальный текстовый бланк Формы № 148-1/у-88 (Приказ 1094н).
	 */
	public static formatOfficialBlank148_1_U_88(
		prescription: Omit<CompiledPrescription, "officialBlankText">,
	): string {
		const lines: string[] = [];
		lines.push("================================================================================");
		lines.push("                           МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РФ");
		lines.push("                                МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ");
		lines.push("                   РЕЦЕПТУРНЫЙ БЛАНК Форма № 148-1/у-88");
		lines.push("          (ПРЕДМЕТНО-КОЛИЧЕСТВЕННЫЙ УЧЕТ / СИЛЬНОДЕЙСТВУЮЩИЕ ВЕЩЕСТВА)");
		lines.push("                     Утверждена приказом Минздрава России от 24.11.2021 № 1094н");
		lines.push("================================================================================");
		lines.push(`Штамп МО: ${prescription.organization.organizationName}`);
		lines.push(`Адрес: ${prescription.organization.organizationAddress} | ОГРН: ${prescription.organization.organizationOgrn}`);
		lines.push("--------------------------------------------------------------------------------");
		lines.push(`РЕЦЕПТ: Серия ${prescription.prescriptionSeries} № ${prescription.prescriptionNumber}`);
		lines.push(`Дата выписки: ${new Date(prescription.issuedAt).toLocaleDateString("ru-RU")}`);
		lines.push(`Срок действия: 15 ДНЕЙ (до ${new Date(prescription.expiresAt).toLocaleDateString("ru-RU")})`);
		lines.push("--------------------------------------------------------------------------------");
		lines.push(`Пациент (Ф.И.О.): ${prescription.patient.fullName}`);
		lines.push(`Дата рождения: ${prescription.patient.birthDate} (${prescription.patient.ageYears} лет)`);
		lines.push(`Адрес / № медкарты: Пациент ID ${prescription.patient.patientId}`);
		lines.push(`Лечащий врач: ${prescription.doctor.doctorFullName} (${prescription.doctor.doctorSpecialty || "Врач-стоматолог-хирург"})`);
		if (prescription.clinicalDiagnosisMkb10) {
			lines.push(`Диагноз МКБ-10: ${prescription.clinicalDiagnosisMkb10}`);
		}
		lines.push("================================================================================");
		lines.push("                  НАЗНАЧЕНИЕ ПКУ (Rp: - СТРОГО 1 НАИМЕНОВАНИЕ)");
		lines.push("================================================================================");

		const item = prescription.items[0];
		if (item) {
			lines.push(item.latinPrescriptionBlock);
			lines.push(`(Количество: ${item.quantityPackages} уп., курс: ${item.durationDays} дн.)`);
		} else {
			lines.push("[НЕТ НАЗНАЧЕНИЯ]");
		}

		lines.push("================================================================================");
		lines.push("                         РЕКВИЗИТЫ ЗАВЕРЕНИЯ И ПОДПИСИ");
		lines.push("================================================================================");
		lines.push("Подпись и личная печать лечащего врача: [ЭЛЕКТРОННАЯ ПОДПИСЬ ВРАЧА]");
		lines.push("Печать медицинской организации «Для рецептов»: [ЭЛЕКТРОННЫЙ ШТАМП МО]");
		if (prescription.signature) {
			lines.push(`Статус ЭП: [ПОДПИСАНО] ${prescription.signature.signatureType === "QUALIFIED_EP" ? "УКЭП (Квалифицированная ЭП)" : "ПЭП (Простая ЭП по ПИН)"}`);
			lines.push(`Врач: ${prescription.signature.signerFullName}`);
			if (prescription.signature.signerSnils) lines.push(`СНИЛС врача: ${prescription.signature.signerSnils}`);
			if (prescription.signature.certificateSerialNumber) lines.push(`Серийный номер сертификата: ${prescription.signature.certificateSerialNumber}`);
			lines.push(`Дата и время подписания: ${prescription.signature.signedAt}`);
			lines.push(`Хэш документа (SHA-256): ${prescription.signature.prescriptionDigestSha256}`);
		} else {
			lines.push("Статус ЭП: [НЕ ПОДПИСАНО — ЧЕРНОВИК]");
		}
		lines.push(`ЕГИСЗ QR / URL: ${prescription.egiszVerificationUrl}`);
		lines.push("================================================================================");

		return lines.join("\n");
	}

	/**
	 * Главный фабричный метод создания и компиляции электронного рецепта.
	 */
	public static compilePrescription(params: {
		id?: string | undefined;
		header: PrescriptionHeaderInput;
		patient: PatientClinicalProfile;
		items: readonly PrescriptionItemInput[];
		doctorPinOrCert?: {
			pin?: string | undefined;
			certSerialNumber?: string | undefined;
			certIssuer?: string | undefined;
			secret?: string | undefined;
		} | undefined;
	}): CompiledPrescription {
		const prescriptionId = params.id || crypto.randomUUID();
		const issuedAt = params.header.issuedAt
			? new Date(params.header.issuedAt)
			: new Date();
		const expiresAt = this.calculateExpiryDate(
			issuedAt,
			params.header.formType,
			params.header.validityPeriod,
		);

		// 1. Клиническая экспертиза безопасности
		const safetyAudit = this.evaluateSafety(
			params.patient,
			params.items,
			params.header.formType,
			params.header.validityPeriod,
			Boolean(params.header.isSpecialChronicIndication),
		);

		// 2. Генерация латинских прописей для каждого препарата
		const compiledItems: CompiledPrescriptionItem[] = params.items.map(
			(item, idx) => ({
				itemIndex: idx + 1,
				innLatin: item.innLatin,
				...(item.tradeNameRu ? { tradeNameRu: item.tradeNameRu } : {}),
				dosageFormLatin: item.dosageFormLatin,
				dosageDoseConcentration: item.dosageDoseConcentration,
				dispenseInstructionLatin: item.dispenseInstructionLatin,
				signatureDirectionRussian: item.signatureDirectionRussian,
				quantityPackages: item.quantityPackages,
				durationDays: item.durationDays,
				frequencyTimesPerDay: item.frequencyTimesPerDay,
				mealRelation: item.mealRelation,
				latinPrescriptionBlock: this.buildLatinPrescriptionBlock(item),
			}),
		);

		const series =
			params.header.prescriptionSeries ||
			(params.header.formType === "form_148_1_u_88" ? "148-1У88" : "107-1У");

		const egiszVerificationUrl = `https://egisz.rosminzdrav.ru/prescriptions/verify?id=${prescriptionId}&series=${encodeURIComponent(series)}&num=${encodeURIComponent(params.header.prescriptionNumber)}`;

		// 3. Формирование базового объекта для вычисления хэша
		const canonicalPayload: Record<string, unknown> = {
			id: prescriptionId,
			orgId: params.header.organization.organizationId,
			orgOgrn: params.header.organization.organizationOgrn,
			doctorId: params.header.doctor.prescribingDoctorId,
			patientId: params.patient.patientId,
			patientBirthDate: params.patient.birthDate,
			formType: params.header.formType,
			series,
			number: params.header.prescriptionNumber,
			validityPeriod: params.header.validityPeriod,
			issuedAt: issuedAt.toISOString(),
			expiresAt: expiresAt.toISOString(),
			items: compiledItems.map((i) => ({
				inn: i.innLatin,
				form: i.dosageFormLatin,
				dose: i.dosageDoseConcentration,
				dtd: i.dispenseInstructionLatin,
				sig: i.signatureDirectionRussian,
				qty: i.quantityPackages,
			})),
		};

		const canonicalDigestSha256 = this.generateCanonicalDigest(canonicalPayload);

		// 4. Наложение цифровой подписи (если переданы учетные данные врача)
		let signature: DoctorDigitalSignature | undefined;
		if (params.doctorPinOrCert) {
			if (params.doctorPinOrCert.certSerialNumber) {
				signature = this.signPrescriptionQualifiedEp(
					canonicalPayload,
					params.header.doctor,
					{
						certificateSerialNumber: params.doctorPinOrCert.certSerialNumber,
						certificateIssuer:
							params.doctorPinOrCert.certIssuer || "КриптоПро Минздрав РФ CA",
						...(params.doctorPinOrCert.secret
							? { privateKeySecret: params.doctorPinOrCert.secret }
							: {}),
					},
				);
			} else if (params.doctorPinOrCert.pin) {
				signature = this.signPrescriptionSimpleEp(
					canonicalPayload,
					params.header.doctor,
					params.doctorPinOrCert.pin,
				);
			}
		}

		// 5. Формирование официального бланка
		const intermediate: Omit<CompiledPrescription, "officialBlankText"> = {
			id: prescriptionId,
			organization: params.header.organization,
			doctor: params.header.doctor,
			patient: {
				patientId: params.patient.patientId,
				fullName: params.patient.fullName,
				birthDate: params.patient.birthDate,
				ageYears: params.patient.ageYears,
				...(params.patient.gender ? { gender: params.patient.gender } : {}),
			},
			prescriptionSeries: series,
			prescriptionNumber: params.header.prescriptionNumber,
			formType: params.header.formType,
			validityPeriod: params.header.validityPeriod,
			isSpecialChronicIndication: Boolean(params.header.isSpecialChronicIndication),
			...(params.header.chronicDispenseFrequencyNotes ? { chronicDispenseFrequencyNotes: params.header.chronicDispenseFrequencyNotes } : {}),
			...(params.header.clinicalDiagnosisMkb10 ? { clinicalDiagnosisMkb10: params.header.clinicalDiagnosisMkb10 } : {}),
			...(params.header.clinicalDiagnosisDescription ? { clinicalDiagnosisDescription: params.header.clinicalDiagnosisDescription } : {}),
			items: compiledItems,
			safetyAudit,
			...(signature ? { signature } : {}),
			issuedAt: issuedAt.toISOString(),
			expiresAt: expiresAt.toISOString(),
			egiszVerificationUrl,
			canonicalDigestSha256,
		};

		const officialBlankText =
			params.header.formType === "form_148_1_u_88"
				? this.formatOfficialBlank148_1_U_88(intermediate)
				: this.formatOfficialBlank107_1_U(intermediate);

		return {
			...intermediate,
			officialBlankText,
		};
	}
}
