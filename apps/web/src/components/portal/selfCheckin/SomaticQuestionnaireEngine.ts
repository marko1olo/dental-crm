/**
 * Somatic Questionnaire Engine
 * Standardized somatic risk assessment for patient check-in and doctor's clinical chart
 */

export interface SomaticAllergiesSection {
	hasAllergies: boolean;
	sulfiteAllergy?: boolean;
	localAnestheticsAllergy?: boolean;
	antibioticsAllergy?: boolean;
	latexAllergy?: boolean;
	drugList?: string[];
	details?: string;
}

export interface SomaticCardiovascularSection {
	hasRisk: boolean;
	hypertension?: boolean;
	arrhythmia?: boolean;
	ischemicHeartDisease?: boolean;
	heartAttackHistory?: boolean;
	pacemaker?: boolean;
	details?: string;
}

export interface SomaticDiabetesSection {
	hasDiabetes: boolean;
	type?: "type1" | "type2";
	glucoseLevel?: string;
	insulinDependent?: boolean;
	details?: string;
}

export interface SomaticCoagulationSection {
	hasBleedingDisorder: boolean;
	onAnticoagulants: boolean;
	anticoagulantName?: string;
	hemophilia?: boolean;
	details?: string;
}

export interface SomaticPregnancySection {
	isPregnantOrLactating: boolean;
	trimester?: number;
	weeks?: number;
	lactating?: boolean;
}

export interface SomaticRespiratorySection {
	bronchialAsthma?: boolean;
	copd?: boolean;
	details?: string;
}

export interface SomaticInfectiousSection {
	hepatitisBOrC?: boolean;
	hiv?: boolean;
	tuberculosis?: boolean;
	details?: string;
}

export interface SomaticQuestionnaireData {
	allergies: SomaticAllergiesSection;
	cardiovascular: SomaticCardiovascularSection;
	diabetes: SomaticDiabetesSection;
	coagulation: SomaticCoagulationSection;
	pregnancy: SomaticPregnancySection;
	respiratory: SomaticRespiratorySection;
	infectious: SomaticInfectiousSection;
	currentMedications: string[];
	additionalNotes: string;
}

export interface SomaticRiskAlert {
	id: string;
	severity: "danger" | "warning" | "caution" | "info";
	title: string;
	message: string;
	recommendedAction: string;
	category: "allergy" | "cardio" | "hemostasis" | "metabolic" | "pregnancy" | "general";
}

export interface SomaticHealthProfile {
	hasCardiovascularRisk: boolean;
	hasSulfiteAllergy: boolean;
	hasLocalAnestheticsAllergy: boolean;
	hasBronchialAsthma: boolean;
	hasBleedingDisorder: boolean;
	hasDiabetes: boolean;
	isPregnantOrLactating: boolean;
	customNotes?: string;
}

export const INITIAL_SOMATIC_QUESTIONNAIRE: SomaticQuestionnaireData = {
	allergies: {
		hasAllergies: false,
		sulfiteAllergy: false,
		localAnestheticsAllergy: false,
		antibioticsAllergy: false,
		latexAllergy: false,
		drugList: [],
		details: "",
	},
	cardiovascular: {
		hasRisk: false,
		hypertension: false,
		arrhythmia: false,
		ischemicHeartDisease: false,
		heartAttackHistory: false,
		pacemaker: false,
		details: "",
	},
	diabetes: {
		hasDiabetes: false,
		type: "type2",
		insulinDependent: false,
		glucoseLevel: "",
		details: "",
	},
	coagulation: {
		hasBleedingDisorder: false,
		onAnticoagulants: false,
		anticoagulantName: "",
		hemophilia: false,
		details: "",
	},
	pregnancy: {
		isPregnantOrLactating: false,
		trimester: 2,
		weeks: 20,
		lactating: false,
	},
	respiratory: {
		bronchialAsthma: false,
		copd: false,
		details: "",
	},
	infectious: {
		hepatitisBOrC: false,
		hiv: false,
		tuberculosis: false,
		details: "",
	},
	currentMedications: [],
	additionalNotes: "",
};

/**
 * Calculates somatic risk alerts and risk level from patient questionnaire responses
 */
export function evaluateSomaticRisks(data: SomaticQuestionnaireData): {
	alerts: SomaticRiskAlert[];
	riskLevel: "high" | "moderate" | "low";
	profile: SomaticHealthProfile;
} {
	const alerts: SomaticRiskAlert[] = [];
	const allergies = data.allergies || {};
	const cardio = data.cardiovascular || {};
	const diabetes = data.diabetes || {};
	const coagulation = data.coagulation || {};
	const pregnancy = data.pregnancy || {};
	const respiratory = data.respiratory || {};

	const hasSulfiteAllergy = Boolean(
		allergies.sulfiteAllergy ||
			(allergies.details && /сульфит|метабисульфит/i.test(allergies.details)),
	);
	const hasLocalAnestheticsAllergy = Boolean(
		allergies.localAnestheticsAllergy ||
			(allergies.details &&
				/анестетик|новокаин|лидокаин|ультракаин|септанест/i.test(allergies.details)),
	);
	const hasBronchialAsthma = Boolean(
		respiratory.bronchialAsthma ||
			(allergies.details && /астма/i.test(allergies.details)),
	);
	const hasCardio = Boolean(
		cardio.hasRisk ||
			cardio.hypertension ||
			cardio.arrhythmia ||
			cardio.ischemicHeartDisease ||
			cardio.heartAttackHistory ||
			cardio.pacemaker,
	);
	const hasCoagulation = Boolean(
		coagulation.hasBleedingDisorder ||
			coagulation.onAnticoagulants ||
			coagulation.hemophilia,
	);
	const hasDiabetes = Boolean(diabetes.hasDiabetes);
	const isPregnantOrLactating = Boolean(pregnancy.isPregnantOrLactating);

	// 1. Sulfite Allergy / Bronchial Asthma (Danger)
	if (hasSulfiteAllergy || (hasBronchialAsthma && hasSulfiteAllergy)) {
		alerts.push({
			id: "alert_sulfite_asthma",
			severity: "danger",
			category: "allergy",
			title: "АЛЛЕРГИЯ НА СУЛЬФИТЫ / БРОНХИАЛЬНАЯ АСТМА",
			message:
				"Высокий риск бронхоспазма и анафилактической реакции на консервант метабисульфит натрия в вазоконстрикторных анестетиках (Ультракаин Д-С, Септанест).",
			recommendedAction:
				"Категорически противопоказаны анестетики с сульфитами. Препарат выбора — Скандонест 3% (Мепивакаин без адреналина).",
		});
	}

	// 2. Local Anesthetics Allergy (Danger)
	if (hasLocalAnestheticsAllergy) {
		alerts.push({
			id: "alert_local_anesthetic",
			severity: "danger",
			category: "allergy",
			title: "НЕПЕРЕНОСИМОСТЬ МЕСТНЫХ АНЕСТЕТИКОВ",
			message:
				"Пациент сообщает об аллергической реакции на местные анестетики в анамнезе (отек Квинке, крапивница, коллапс).",
			recommendedAction:
				"Провести аллергологический скрининг (кожные пробы / IgE), консультация аллерголога, наличие противошоковой укладки.",
		});
	}

	// 3. Blood Coagulation / Anticoagulants (Danger)
	if (hasCoagulation) {
		alerts.push({
			id: "alert_coagulation_risk",
			severity: "danger",
			category: "hemostasis",
			title: "НАРУШЕНИЕ СВЕРТЫВАЕМОСТИ КРОВИ / АНТИКОАГУЛЯНТЫ",
			message:
				"Пациент принимает антикоагулянты (Ксарелто, Варфарин, Эликвис, Аспирин) или имеет коагулопатию. Риск профузного интра- и постоперационного кровотечения.",
			recommendedAction:
				"Обязательный локальный гемостаз (коллагеновый конус, ушивание лунки, гемостатическая губка), контроль МНО/АЧТВ перед сложными операциями.",
		});
	}

	// 4. Cardiovascular Risk (Warning)
	if (hasCardio) {
		alerts.push({
			id: "alert_cardiovascular",
			severity: "warning",
			category: "cardio",
			title: "СЕРДЕЧНО-СОСУДИСТАЯ ПАТОЛОГИЯ",
			message:
				"Артериальная гипертензия / ИБС / нарушение ритма. Доза эпинефрина строго ограничена (максимум 0.04 мг = 2 карпулы 1:100 000 или 4 карпулы 1:200 000).",
			recommendedAction:
				"Измерение АД и пульса перед анестезией. При кризе — перенос приема или Скандонест 3% без адреналина.",
		});
	}

	// 5. Pregnancy / Lactation (Warning)
	if (isPregnantOrLactating) {
		alerts.push({
			id: "alert_pregnancy",
			severity: "warning",
			category: "pregnancy",
			title: "БЕРЕМЕННОСТЬ / ПЕРИОД ЛАКТАЦИИ",
			message:
				"Требуется максимальная безопасность плода. Препарат выбора — Ультракаин Д-С (Артикаин 1:200 000) с высоким связыванием с белками (95%).",
			recommendedAction:
				"Применять Ультракаин Д-С 1:200 000 в минимальной дозе. Оптимальный период плановой санации — 2-й триместр (14–26 недель).",
		});
	}

	// 6. Diabetes (Warning)
	if (hasDiabetes) {
		alerts.push({
			id: "alert_diabetes",
			severity: "warning",
			category: "metabolic",
			title: "САХАРНЫЙ ДИАБЕТ",
			message:
				"Микроангиопатия, замедленная регенерация тканей и остеоинтеграция, повышенная восприимчивость к бактериальным инфекциям пародонта.",
			recommendedAction:
				"Антисептическая защита операционного поля, щадящая препаровка, контроль гликемии.",
		});
	}

	// 7. Pacemaker (Caution)
	if (cardio.pacemaker) {
		alerts.push({
			id: "alert_pacemaker",
			severity: "caution",
			category: "cardio",
			title: "НАЛИЧИЕ ЭЛЕКТРОКАРДИОСТИМУЛЯТОРА (ЭКС)",
			message:
				"У пациента имплантирован кардиостимулятор. Риск электромагнитных наводок от аппаратуры.",
			recommendedAction:
				"Запрещено использование монополярных электрокоагуляторов и некоторых пьезохирургических аппаратов.",
		});
	}

	const hasDanger = alerts.some((a) => a.severity === "danger");
	const hasWarning = alerts.some((a) => a.severity === "warning");
	const riskLevel: "high" | "moderate" | "low" = hasDanger
		? "high"
		: hasWarning
			? "moderate"
			: "low";

	const profile: SomaticHealthProfile = {
		hasCardiovascularRisk: hasCardio,
		hasSulfiteAllergy,
		hasLocalAnestheticsAllergy,
		hasBronchialAsthma,
		hasBleedingDisorder: hasCoagulation,
		hasDiabetes,
		isPregnantOrLactating,
		customNotes: data.additionalNotes || undefined,
	};

	return {
		alerts,
		riskLevel,
		profile,
	};
}
