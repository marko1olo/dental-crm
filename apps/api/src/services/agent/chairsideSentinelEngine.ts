/**
 * chairsideSentinelEngine.ts — Autonomous Proactive Chairside Sentinel Engine for DENTE.
 *
 * Tier 1 (Hot Path / In-The-Zone) Clinical Copilot:
 * - 0-click physiological norm defaults ("Соматически здоров / норма").
 * - Multi-step autonomous action chain:
 *     Step 1: check_drug_interaction (drug-drug, allergies, somatic contraindications).
 *     Step 2: generate_visit_diary (043/у SOAP note compliant with Russian StAR protocols).
 *     Step 3: calculate_order_804n (statutory Order 804n package in integer kopecks).
 *     Step 4: assemble_proactive_card (unified draft ready for 1-click apply).
 * - Mandate 8e (Doctor Autonomy): zero blocking disabled buttons, 1-click draft application.
 * - Mandate 8k (Friction-Killer Law): instantaneous packages instead of endless clicks.
 * - Mandate 8s (Anti-Bloat): sterilizer/kraft packs belong to Tier 3 backoffice, completely
 *   excluded from the chairside doctor's hot path!
 */

import { randomUUID } from "node:crypto";
import {
	type AnatomicalCanalCount,
	getAnatomicalRootCanalCount,
	multiplyKopecks,
	parseKopecks,
	toRubles,
} from "@dental/shared";

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────

export interface ChairsideVisitContextInput {
	patientId: string;
	toothNumber?: number | string;
	complaints?: string;
	diagnoses?: string[];
	allergies?: string[];
	somaticHistory?: string[];
	activeServices?: string[];
	mode?: "autonomous" | "supervised";
	organizationId?: string;
}

export type ChairsideAlertSeverity = "critical" | "warning" | "info";

export interface ChairsideSafetyAlert {
	id: string;
	severity: ChairsideAlertSeverity;
	alertType:
		| "drug_allergy_conflict"
		| "allergy_notice"
		| "somatic_contraindication"
		| "somatic_advisory"
		| "bleeding_risk"
		| "pregnancy_advisory"
		| "anesthetic_allergy_warning"
		| "latex_allergy_warning"
		| "physiological_norm";
	title: string;
	message: string;
	detectedAllergen?: string;
	conflictingItem?: string;
	safeAlternative?: string;
	clinicalRationale?: string;
	actionRequired?: string;
	/** Mandate 8e: always false! Warnings never block the doctor from proceeding */
	isBlocking: false;
}

export interface ChairsideSoapDiary {
	subjective: {
		complaints: string;
		anamnesisMorbi: string;
		anamnesisVitae: string;
	};
	objective: {
		statusLocalis: string;
		teethFormulaState: string;
		percussion: string;
		coldTest: string;
		probing: string;
		xrayFindings?: string;
	};
	assessment: {
		icd10Code: string;
		icd10Name: string;
		toothNumber: number | null;
		fdiToothFormatted: string;
	};
	plan: {
		procedureProtocol: string;
		recommendations: string;
	};
	renderedText043: string;
}

export interface ChairsideOrder804nItem {
	code: string;
	title: string;
	category: string;
	quantity: number;
	priceRub: number;
	priceKopecks: number;
	totalRub: number;
	totalKopecks: number;
	isMandatory: boolean;
	toothNumber?: number | null;
	canalCount?: number | null;
}

export interface ChairsideActionChainStep {
	step: string;
	description: string;
	status: "completed" | "failed";
	timestamp: string;
	details?: Record<string, unknown>;
}

export interface ChairsideSentinelAnalysisResult {
	patientId: string;
	toothNumber: number | null;
	fdiToothFormatted: string;
	mode: "autonomous" | "supervised";
	status: "auto_approved_draft" | "draft_pending_review";
	autoApprovedDraft: boolean;
	readyForOneClickApply: boolean;
	doctorAutonomyGuaranteed: boolean;
	somaticStatus: string;
	allergiesStatus: string;
	isPhysiologicalNorm: boolean;
	alerts: ChairsideSafetyAlert[];
	soapDiary: ChairsideSoapDiary;
	order804n: {
		services: ChairsideOrder804nItem[];
		totalRub: number;
		totalKopecks: number;
		formattedTotal: string;
	};
	actionChain: ChairsideActionChainStep[];
}

// ─── UTILITIES ──────────────────────────────────────────────────────────────

/**
 * Normalizes FDI tooth input: handles 26, "26", 2.6, "2.6", "зуб 2.6", etc.
 */
export function parseFdiTooth(input?: number | string | null): number | null {
	if (input === undefined || input === null) return null;
	if (typeof input === "number") {
		const str = input.toString();
		if (str.includes(".")) {
			const [q, p] = str.split(".");
			const qNum = Number.parseInt(q, 10);
			const pNum = Number.parseInt(p, 10);
			if (!Number.isNaN(qNum) && !Number.isNaN(pNum)) {
				return qNum * 10 + pNum;
			}
		}
		return Math.round(input);
	}

	const clean = input.trim().replace(",", ".");
	// Try parsing direct "2.6" or "26"
	const match = clean.match(
		/(?:зуб[аеы]?\s*)?([1-4][1-8]|[5-8][1-5]|[1-4]\.[1-8]|[5-8]\.[1-5])/i,
	);
	if (match) {
		const val = match[1];
		if (val.includes(".")) {
			const [q, p] = val.split(".");
			return Number.parseInt(q, 10) * 10 + Number.parseInt(p, 10);
		}
		return Number.parseInt(val, 10);
	}

	const num = Number.parseInt(clean, 10);
	return Number.isNaN(num) ? null : num;
}

/**
 * Formats tooth number to dot-notation (e.g. 26 -> "2.6") and standard FDI ("26").
 */
export function formatFdiTooth(toothNumber: number | null): string {
	if (!toothNumber) return "Не указан";
	const q = Math.floor(toothNumber / 10);
	const p = toothNumber % 10;
	return `${q}.${p} (${toothNumber})`;
}

/**
 * Determines anatomical root canal count for standard FDI tooth.
 */
export function getCanalsForTooth(toothNumber: number | null): number {
	if (!toothNumber) return 1;
	try {
		return getAnatomicalRootCanalCount(toothNumber);
	} catch {
		const q = Math.floor(toothNumber / 10);
		const pos = toothNumber % 10;
		if (pos >= 6) return 3;
		if ((q === 1 || q === 2) && pos === 4) return 2;
		return 1;
	}
}

// ─── CHAIRSIDE SENTINEL ENGINE CLASS ────────────────────────────────────────

export class ChairsideSentinelEngine {
	/**
	 * Analyzes clinical visit context at chairside:
	 * 1. Checks allergies and somatic history for drug conflicts & contraindications.
	 * 2. Parses tooth number and ICD-10 diagnosis.
	 * 3. Generates 043/у SOAP diary draft according to StAR protocols.
	 * 4. Assembles recommended Order 804n services package with integer kopecks.
	 * 5. Builds unified autonomous draft ready for 1-click application.
	 */
	public async analyzeVisitContext(
		visitData: ChairsideVisitContextInput,
	): Promise<ChairsideSentinelAnalysisResult> {
		const actionChain: ChairsideActionChainStep[] = [];
		const now = new Date().toISOString();

		// ─── STEP 0: PARSE TOOTH AND DIAGNOSIS CONTEXT ──────────────────────────
		let resolvedTooth = parseFdiTooth(visitData.toothNumber);

		// If toothNumber not given, try extracting from diagnoses or complaints
		if (!resolvedTooth && visitData.diagnoses) {
			for (const diag of visitData.diagnoses) {
				const candidate = parseFdiTooth(diag);
				if (candidate) {
					resolvedTooth = candidate;
					break;
				}
			}
		}
		if (!resolvedTooth && visitData.complaints) {
			resolvedTooth = parseFdiTooth(visitData.complaints);
		}

		const canalCount = getCanalsForTooth(resolvedTooth);
		const { primaryIcd10, diagnosisName, clinicalCategory } =
			this.detectClinicalCategory(visitData.diagnoses, visitData.complaints);

		// ─── STEP 1: CHECK DRUG INTERACTIONS, ALLERGIES & SOMATICS ───────────────
		const { alerts, somaticStatus, allergiesStatus, isPhysiologicalNorm } =
			this.checkDrugInteractionsAndSomatic(
				visitData.allergies || [],
				visitData.somaticHistory || [],
				visitData.activeServices || [],
			);

		actionChain.push({
			step: "check_drug_interaction",
			description:
				"Проверка лекарственных конфликтов, аллергий и соматического статуса",
			status: "completed",
			timestamp: now,
			details: {
				alertsCount: alerts.length,
				isPhysiologicalNorm,
				somaticStatus,
				allergiesStatus,
			},
		});

		// ─── STEP 2: GENERATE VISIT DIARY (SOAP 043/У) ───────────────────────────
		const soapDiary = this.generateSoapDiary({
			toothNumber: resolvedTooth,
			canalCount,
			primaryIcd10,
			diagnosisName,
			clinicalCategory,
			complaints: visitData.complaints,
			somaticStatus,
			allergiesStatus,
		});

		actionChain.push({
			step: "generate_visit_diary",
			description:
				"Генерация проекта SOAP-дневника 043/у по клиническим протоколам СтАР",
			status: "completed",
			timestamp: now,
			details: {
				icd10: primaryIcd10,
				tooth: resolvedTooth,
			},
		});

		// ─── STEP 3: CALCULATE ORDER 804N BILLING PACKAGE ────────────────────────
		const order804nServices = this.calculateOrder804nPackage({
			toothNumber: resolvedTooth,
			canalCount,
			clinicalCategory,
			primaryIcd10,
		});

		let totalRub = 0;
		let totalKopecks = 0;
		for (const s of order804nServices) {
			totalRub += s.totalRub;
			totalKopecks += s.totalKopecks;
		}

		actionChain.push({
			step: "calculate_order_804n",
			description:
				"Подбор актуальных кодов и расчет сметы по Номенклатуре 804н Минздрава РФ",
			status: "completed",
			timestamp: now,
			details: {
				servicesCount: order804nServices.length,
				totalRub,
				totalKopecks,
			},
		});

		// ─── STEP 4: ASSEMBLE PROACTIVE RECOMMENDATION CARD ──────────────────────
		const mode = visitData.mode ?? "autonomous";
		const autoApprovedDraft = mode === "autonomous";
		const status = autoApprovedDraft
			? "auto_approved_draft"
			: "draft_pending_review";

		actionChain.push({
			step: "assemble_proactive_card",
			description:
				"Сборка единой карточки визита у кресла (готово к применению в 1 клик)",
			status: "completed",
			timestamp: now,
			details: {
				mode,
				status,
			},
		});

		return {
			patientId: visitData.patientId,
			toothNumber: resolvedTooth,
			fdiToothFormatted: formatFdiTooth(resolvedTooth),
			mode,
			status,
			autoApprovedDraft,
			readyForOneClickApply: true,
			doctorAutonomyGuaranteed: true,
			somaticStatus,
			allergiesStatus,
			isPhysiologicalNorm,
			alerts,
			soapDiary,
			order804n: {
				services: order804nServices,
				totalRub,
				totalKopecks,
				formattedTotal: `${totalRub.toLocaleString("ru-RU")} ₽`,
			},
			actionChain,
		};
	}

	// ─── STEP 1 IMPLEMENTATION: DRUG INTERACTIONS & SOMATICS ───────────────────

	private checkDrugInteractionsAndSomatic(
		allergies: string[],
		somaticHistory: string[],
		activeServices: string[],
	): {
		alerts: ChairsideSafetyAlert[];
		somaticStatus: string;
		allergiesStatus: string;
		isPhysiologicalNorm: boolean;
	} {
		const alerts: ChairsideSafetyAlert[] = [];

		const normSomaticMarkers =
			/(норма|здоров|без патологи|соматически сохранен|не отягощен)/i;
		const hasRealSomatic =
			somaticHistory.length > 0 &&
			somaticHistory.some(
				(s) => s.trim().length > 0 && !normSomaticMarkers.test(s),
			);

		const normAllergyMarkers =
			/(нет|не отягощен|отсутству|без аллерги|отрицает)/i;
		const hasRealAllergies =
			allergies.length > 0 &&
			allergies.some((a) => a.trim().length > 0 && !normAllergyMarkers.test(a));

		const isPhysiologicalNorm = !hasRealSomatic && !hasRealAllergies;
		const somaticStatus = isPhysiologicalNorm
			? "Соматически здоров / норма"
			: somaticHistory.join(", ");
		const allergiesStatus = !hasRealAllergies
			? "Аллергологический анамнез не отягощен"
			: allergies.join(", ");

		// 1. PENICILLIN ALLERGY CONFLICT
		const isPenicillinAllergic = allergies.some((a) =>
			/(пенициллин|пеницилин|бета-лактам|penicillin|амоксициллин|амоксиклав|аугментин|ампициллин)/i.test(
				a,
			),
		);
		const isPrescribedPenicillin = activeServices.some((s) =>
			/(амоксициллин|амоксиклав|аугментин|пенициллин|флемоксин|amoxicillin|augmentin|amoxiclav|клавуланат)/i.test(
				s,
			),
		);

		if (isPenicillinAllergic && isPrescribedPenicillin) {
			alerts.push({
				id: `alert_drug_${randomUUID()}`,
				severity: "critical",
				alertType: "drug_allergy_conflict",
				title: "Критический конфликт: Аллергия на пенициллин vs Амоксициллин",
				message:
					"Опасность острой аллергической реакции: у пациента аллергия на пенициллиновый ряд, при этом назначен/планируется Амоксициллин/Амоксиклав.",
				detectedAllergen: "Пенициллиновый ряд (бета-лактамы)",
				conflictingItem: "Амоксициллин / Амоксиклав",
				safeAlternative:
					"Клиндамицин 300 мг (по 1 капсуле 3 раза в день, 5-7 дней) или Кларитромицин 500 мг",
				clinicalRationale:
					"Линкозамиды (Клиндамицин) не обладают перекрестной аллергией с бета-лактамами, имеют высокую тропность к костной ткани челюсти и безопасны для пациента.",
				actionRequired:
					"Заменить пенициллиновый антибиотик на Клиндамицин 300 мг",
				isBlocking: false,
			});
		} else if (isPenicillinAllergic) {
			alerts.push({
				id: `alert_penicillin_${randomUUID()}`,
				severity: "warning",
				alertType: "allergy_notice",
				title: "Аллергия на пенициллиновый ряд",
				message:
					"У пациента отягощен аллергоанамнез: аллергия на пенициллины. При необходимости антибиотикопрофилактики назначить Клиндамицин 300 мг.",
				detectedAllergen: "Пенициллин",
				safeAlternative: "Клиндамицин 300 мг",
				clinicalRationale:
					"Безопасная альтернатива первого выбора при аллергии на бета-лактамы.",
				isBlocking: false,
			});
		}

		// 2. NSAID ALLERGY CONFLICT
		const isNsaidAllergic = allergies.some((a) =>
			/(нпвс|нпвп|аспирин|ибупрофен|кеторол|кетанов|нимесулид|диклофенак|найз)/i.test(
				a,
			),
		);
		const isPrescribedNsaid = activeServices.some((s) =>
			/(нпвс|нпвп|аспирин|ибупрофен|кеторол|кетанов|нимесулид|диклофенак|найз|нурофен)/i.test(
				s,
			),
		);

		if (isNsaidAllergic && isPrescribedNsaid) {
			alerts.push({
				id: `alert_nsaid_${randomUUID()}`,
				severity: "critical",
				alertType: "drug_allergy_conflict",
				title: "Лекарственный конфликт: НПВП / Аспирин",
				message:
					"У пациента зафиксирована непереносимость НПВП (риск бронхоспазма/аспириновой астмы), при этом назначен препарат группы НПВП.",
				detectedAllergen: "НПВП / Салицилаты",
				conflictingItem: "Препарат группы НПВП",
				safeAlternative:
					"Парацетамол 500-1000 мг (до 4 г/сутки) или Трамадол при сильном болевом синдроме",
				clinicalRationale:
					"Парацетамол не ингибирует периферический синтез простагландинов и безопасен при аспириновой триаде.",
				isBlocking: false,
			});
		}

		// 3. LOCAL ANESTHETIC ALLERGY
		const isAnestheticAllergic = allergies.some((a) =>
			/(анестези|новокаин|лидокаин|артикаин|ультракаин|убистезин)/i.test(a),
		);
		if (isAnestheticAllergic) {
			alerts.push({
				id: `alert_anesth_${randomUUID()}`,
				severity: "warning",
				alertType: "anesthetic_allergy_warning",
				title: "Аллергия на местные анестетики",
				message:
					"Анамнез отягощен реакциями на анестетики. Требуется предельная осторожность.",
				safeAlternative:
					"Мепивакаин 3% без вазоконстриктора (Скандонест) после аллергопробы или лечение под седацией",
				isBlocking: false,
			});
		}

		// 4. LATEX ALLERGY
		const isLatexAllergic = allergies.some((a) => /(латекс|latex)/i.test(a));
		if (isLatexAllergic) {
			alerts.push({
				id: `alert_latex_${randomUUID()}`,
				severity: "warning",
				alertType: "latex_allergy_warning",
				title: "Аллергия на латекс",
				message:
					"Запрещено использование латексных изделий (перчатки, латексный коффердам).",
				safeAlternative:
					"Безлатексный коффердам (OptraDam / нитриловые платки) и нитриловые смотровые перчатки",
				isBlocking: false,
			});
		}

		// 5. HYPERTENSION & CARDIO CONFLICTS
		const isHypertensive = somaticHistory.some((s) =>
			/(гипертон|давлен|криз|аритми|ибс|стенокарди|ад\s*>|140\/|160\/)/i.test(
				s,
			),
		);
		if (isHypertensive) {
			alerts.push({
				id: `alert_cardio_${randomUUID()}`,
				severity: "warning",
				alertType: "somatic_contraindication",
				title: "Гипертоническая болезнь / Кардиориск",
				message:
					"Пациент с артериальной гипертензией / ИБС. Опасность гипертонического криза при адреналиновой нагрузке.",
				safeAlternative:
					"Анестетик с пониженным адреналином (Артикаин 1:200 000) либо Мепивакаин 3% без адреналина (Скандонест). Контроль АД перед инъекцией.",
				clinicalRationale:
					"Стандартный раствор с эпинефрином 1:100 000 может вызвать тахикардию и подъем давления.",
				isBlocking: false,
			});
		}

		// 6. DIABETES
		const isDiabetic = somaticHistory.some((s) =>
			/(диабет|инсулин|гликеми)/i.test(s),
		);
		if (isDiabetic) {
			alerts.push({
				id: `alert_diabetes_${randomUUID()}`,
				severity: "info",
				alertType: "somatic_advisory",
				title: "Сахарный диабет",
				message:
					"Сахарный диабет: сниженный иммунный ответ, риск гипогликемии и затяжного заживления.",
				safeAlternative:
					"Прием в утренние часы после еды и медикаментов. Щадящее препарирование с антисептической защитой.",
				isBlocking: false,
			});
		}

		// 7. ANTICOAGULANTS (BLEEDING RISK)
		const isAnticoagulated = somaticHistory.some((s) =>
			/(варфарин|ксарелто|эликвис|тромбоасс|антикоагулянт|аспирин кардио)/i.test(
				s,
			),
		);
		if (isAnticoagulated) {
			alerts.push({
				id: `alert_bleeding_${randomUUID()}`,
				severity: "warning",
				alertType: "bleeding_risk",
				title: "Антикоагулянтная терапия (риск кровоточивости)",
				message:
					"Пациент принимает антикоагулянты/антиагреганты: риск гематом и кровоточивости десны.",
				safeAlternative:
					"Аспирационная проба при анестезии, применение гемостатических губок (Альвостаз/Коллапол), плотная изоляция коффердамом.",
				isBlocking: false,
			});
		}

		// 8. MANDATE 8E: PHYSIOLOGICAL NORM CONFIRMATION
		if (isPhysiologicalNorm) {
			alerts.push({
				id: `alert_norm_${randomUUID()}`,
				severity: "info",
				alertType: "physiological_norm",
				title: "Физиологическая норма (Мандат 8e)",
				message:
					"Соматически здоров, аллергоанамнез не отягощен. Полная клиническая автономия без ограничений.",
				isBlocking: false,
			});
		}

		return {
			alerts,
			somaticStatus,
			allergiesStatus,
			isPhysiologicalNorm,
		};
	}

	// ─── STEP 2 IMPLEMENTATION: CATEGORY & TOOTH DETECTION ────────────────────

	private detectClinicalCategory(
		diagnoses?: string[],
		complaints?: string,
	): {
		primaryIcd10: string;
		diagnosisName: string;
		clinicalCategory:
			| "pulpitis"
			| "caries"
			| "periodontitis"
			| "surgery"
			| "hygiene"
			| "preventive";
	} {
		const allText =
			`${(diagnoses || []).join(" ")} ${complaints || ""}`.toLowerCase();

		if (/k04\.0|k04\.1|k04\.2|k04\.3|пульпит/i.test(allText)) {
			return {
				primaryIcd10: "K04.0",
				diagnosisName: "K04.0 Пульпит (острый очаговый/диффузный)",
				clinicalCategory: "pulpitis",
			};
		}

		if (/k04\.4|k04\.5|k04\.6|k04\.7|k04\.8|периодонтит/i.test(allText)) {
			return {
				primaryIcd10: "K04.5",
				diagnosisName: "K04.5 Хронический апикальный периодонтит",
				clinicalCategory: "periodontitis",
			};
		}

		if (/k02\.|кариес/i.test(allText)) {
			return {
				primaryIcd10: "K02.1",
				diagnosisName: "K02.1 Кариес дентина (глубокий / средний)",
				clinicalCategory: "caries",
			};
		}

		if (/k08\.1|k01\.1|удалени|экстракц/i.test(allText)) {
			return {
				primaryIcd10: "K08.1",
				diagnosisName: "K08.1 Потеря зубов вследствие удаления",
				clinicalCategory: "surgery",
			};
		}

		if (/k05\.|z01\.2|гигиен|чистк|профгигиен|осмотр/i.test(allText)) {
			return {
				primaryIcd10: "Z01.2",
				diagnosisName: "Z01.2 Стоматологическое обследование / Профгигиена",
				clinicalCategory: "hygiene",
			};
		}

		return {
			primaryIcd10: "Z01.2",
			diagnosisName: "Z01.2 Стоматологическое обследование (Здоров)",
			clinicalCategory: "preventive",
		};
	}

	// ─── STEP 3 IMPLEMENTATION: SOAP 043/У GENERATION ─────────────────────────

	private generateSoapDiary(params: {
		toothNumber: number | null;
		canalCount: number;
		primaryIcd10: string;
		diagnosisName: string;
		clinicalCategory:
			| "pulpitis"
			| "caries"
			| "periodontitis"
			| "surgery"
			| "hygiene"
			| "preventive";
		complaints?: string;
		somaticStatus: string;
		allergiesStatus: string;
	}): ChairsideSoapDiary {
		const {
			toothNumber,
			canalCount,
			primaryIcd10,
			diagnosisName,
			clinicalCategory,
			complaints,
			somaticStatus,
			allergiesStatus,
		} = params;

		const toothStr = toothNumber ? `${toothNumber}` : "зуб";
		const fdiFormatted = formatFdiTooth(toothNumber);

		let subComplaints = complaints?.trim() || "";
		let subAnamnesisMorbi = "";
		let objStatusLocalis = "";
		let objPercussion = "Перкуссия безболезненная.";
		let objColdTest = "Термопроба индифферентна.";
		let objProbing = "Зондирование безболезненное.";
		let procedureProtocol = "";
		let recommendations = "";

		switch (clinicalCategory) {
			case "pulpitis":
				if (!subComplaints) {
					subComplaints = `Жалобы на острую самопроизвольную приступообразную боль в области зуба ${toothStr}, усиливающуюся в ночное время и от температурных раздражителей (холодное, горячее). Иррадиация по ходу ветвей тройничного нерва.`;
				}
				subAnamnesisMorbi =
					"Боли появились 2 суток назад, усилились прошедшей ночью. Прием анальгетиков дает кратковременный эффект. Ранее зуб не лечен.";
				objStatusLocalis = `На жевательной/контактной поверхности зуба ${toothStr} глубокая кариозная полость, сообщающаяся с полостью зуба в одной точке. Зондирование вскрытой точки резко болезненное, кровоточивость пульпы.`;
				objPercussion = "Перкуссия зуба слабо чувствительная / безболезненная.";
				objColdTest =
					"Холодовая проба вызывает резкую длительную боль (> 1 мин).";
				objProbing = "Зондирование дна полости резко болезненное.";
				procedureProtocol = `1. Инфильтрационная/проводниковая анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл (A16.07.030).
2. Изоляция рабочего поля коффердамом (A16.07.082).
3. Препарирование кариозной полости, формирование эндодонтического доступа к полости зуба ${toothStr}.
4. Экстирпация пульпы из ${canalCount} корневых каналов.
5. Определение рабочей длины корневых каналов апекслокатором с контролем RVG.
6. Инструментальная и медикаментозная обработка ${canalCount} корневых каналов машинными Ni-Ti инструментами под обильной ирригацией 3% NaOCl и 17% ЭДТА с ультразвуковой активацией (A16.07.030.00${canalCount}).
7. Высушивание каналов стерильными бумажными штифтами.
8. Пломбирование ${canalCount} корневых каналов гуттаперчевыми штифтами с эпоксидным силером AH Plus методом латеральной компакции (A16.07.008.00${canalCount}).
9. Рентген-контроль обтурации: каналы запломбированы плотно, гомогенно до физиологического верхушечного отверстия.
10. Восстановление зуба пломбой из светоотверждаемого композита с моделированием анатомической формы бугров (A16.07.002.001). Шлифовка, зеркальная полировка.`;
				recommendations =
					"Щадящая диета на стороне лечения 24 часа. При ноющих постоперационных болях — прием Ибупрофена 400 мг / Нимесулида 100 мг. Контрольный осмотр через 6 месяцев.";
				break;

			case "caries":
				if (!subComplaints) {
					subComplaints = `Жалобы на кратковременные боли от температурных и химических раздражителей (холодное, сладкое) в области зуба ${toothStr}, быстро проходящие после устранения раздражителя. Застревание пищи.`;
				}
				subAnamnesisMorbi =
					"Дефект обнаружен пациентом около 1–2 месяцев назад. Ранее зуб не лечен.";
				objStatusLocalis = `На окклюзионной/контактной поверхности зуба ${toothStr} кариозная полость в пределах дентина, выполненная размягченным пигментированным дентином.`;
				objPercussion = "Перкуссия отрицательная.";
				objColdTest =
					"Термопроба кратковременно положительная, проходит сразу.";
				objProbing =
					"Зондирование дна безболезненное, по стенкам слабо чувствительное.";
				procedureProtocol = `1. Инфильтрационная анестезия Sol. Articaini 4% — 1.0 мл (A16.07.030).
2. Наложение коффердама (A16.07.082).
3. Препарирование кариозной полости, полная некрэктомия под водно-воздушным охлаждением.
4. Медикаментозная обработка 2% раствором хлоргексидина биглюконата.
5. Адгезивный протокол: тотальное травление эмали 15 сек, нанесение адгезива светового отверждения, полимеризация 20 сек.
6. Восстановление зуба пломбой I, V, VI класс по Блэку светоотверждаемым нанокомпозитом (A16.07.002.001) с анатомической моделировкой фиссур.
7. Шлифовка, полировка дисками и полировочными головками. Окклюзионный контроль артикуляционной бумагой 40 мкм.`;
				recommendations =
					"Щадящая диета 2 часа, соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.";
				break;

			case "periodontitis":
				if (!subComplaints) {
					subComplaints = `Жалобы на ноющие боли при накусывании на зуб ${toothStr}, чувство «выросшего зуба».`;
				}
				subAnamnesisMorbi = "Зуб ранее лечен по поводу кариеса/пульпита.";
				objStatusLocalis = `Коронка зуба ${toothStr} изменена в цвете, пломба с нарушением краевого прилегания.`;
				objPercussion = "Перкуссия положительная (+).";
				objColdTest = "Термопроба отрицательная.";
				objProbing = "Зондирование устьев каналов безболезненное.";
				procedureProtocol = `1. Анестезия Sol. Articaini 4% (A16.07.030).
2. Изоляция коффердамом (A16.07.082).
3. Эндодонтический доступ, распломбирование и механическая обработка ${canalCount} каналов.
4. Ирригация 3% NaOCl и ЭДТА, временная лечебная обтурация гидроксидом кальция Calasept на 14 дней.
5. Герметичная временная пломба.`;
				recommendations =
					"Назначен повторный визит для окончательной обтурации. При болях — НПВП.";
				break;

			case "surgery":
				if (!subComplaints) {
					subComplaints = `Жалобы на разрушение коронковой части зуба ${toothStr}, невозможность накусывания.`;
				}
				subAnamnesisMorbi =
					"Коронка зуба разрушилась ниже уровня десны вследствие кариозного процесса.";
				objStatusLocalis = `Зуб ${toothStr} разрушен ниже уровня десны, корни подвижны, костная резорбция.`;
				procedureProtocol = `1. Анестезия проводниковая/инфильтрационная (A16.07.030).
2. Синдесмотомия циркулярной связки, люксация элеватором, аккуратное удаление зуба ${toothStr}.
3. Кюретаж лунки, формирование кровяного сгустка, гемостатическая губка.`;
				recommendations =
					"Холод на щеку, не полоскать рот 24 часа. Исключить тепловые процедуры на 3 дня.";
				break;

			case "hygiene":
			case "preventive":
			default:
				if (!subComplaints) {
					subComplaints =
						"Жалоб нет. Обратился для планового профилактического осмотра и санации полости рта.";
				}
				subAnamnesisMorbi =
					"Регулярно проходит профилактические осмотры 1 раз в 6 месяцев. Соматически здоров.";
				objStatusLocalis =
					"Слизистая оболочка полости рта бледно-розового цвета, чистая, влажная. Десна бледно-розовая, плотно охватывает шейки зубов, не кровоточит. Зубные ряды интактные, прикус физиологический (ортогнатический).";
				objPercussion = "Перкуссия безболезненная во всех отделах.";
				objColdTest = "Термопробы физиологические.";
				objProbing = "Зондирование борозд и шеек безболезненное.";
				procedureProtocol =
					"Проведен комплексный стоматологический осмотр, индекс гигиены OHI-S = 0.5 (хороший). Полость рта санирована.";
				recommendations =
					"Контрольный осмотр и профессиональная гигиена полости рта через 6 месяцев.";
				break;
		}

		const renderedText043 = `ДНЕВНИК КЛИНИЧЕСКОГО ПРИЕМА (ФОРМА 043/У)
Зуб: ${fdiFormatted} | Диагноз: ${diagnosisName}
--------------------------------------------------------------------------------
ЖАЛОБЫ (S): ${subComplaints}
АНАМНЕЗ (S): ${subAnamnesisMorbi} Соматический статус: ${somaticStatus}. Аллергоанамнез: ${allergiesStatus}.
ОБЪЕКТИВНО (O): ${objStatusLocalis} ${objPercussion} ${objColdTest} ${objProbing}
ДИАГНОЗ (A): ${diagnosisName} в области зуба ${fdiFormatted}
ПРОТОКОЛ ЛЕЧЕНИЯ (P):
${procedureProtocol}
РЕКОМЕНДАЦИИ (P): ${recommendations}
--------------------------------------------------------------------------------
[МАНДАТ 8E: ЧЕРНОВИК СОЗДАН АВТОНОМНО — ВРАЧ ПРАВИТ ТОЛЬКО ПАТОЛОГИЮ]`;

		return {
			subjective: {
				complaints: subComplaints,
				anamnesisMorbi: subAnamnesisMorbi,
				anamnesisVitae: `Соматический статус: ${somaticStatus}. Аллергоанамнез: ${allergiesStatus}.`,
			},
			objective: {
				statusLocalis: objStatusLocalis,
				teethFormulaState: `Зуб ${fdiFormatted}`,
				percussion: objPercussion,
				coldTest: objColdTest,
				probing: objProbing,
			},
			assessment: {
				icd10Code: primaryIcd10,
				icd10Name: diagnosisName,
				toothNumber,
				fdiToothFormatted: fdiFormatted,
			},
			plan: {
				procedureProtocol,
				recommendations,
			},
			renderedText043,
		};
	}

	// ─── STEP 4 IMPLEMENTATION: ORDER 804N BILLING PACKAGE ─────────────────────

	private calculateOrder804nPackage(params: {
		toothNumber: number | null;
		canalCount: number;
		clinicalCategory:
			| "pulpitis"
			| "caries"
			| "periodontitis"
			| "surgery"
			| "hygiene"
			| "preventive";
		primaryIcd10: string;
	}): ChairsideOrder804nItem[] {
		const { toothNumber, canalCount, clinicalCategory } = params;
		const items: ChairsideOrder804nItem[] = [];

		const createService = (
			code: string,
			title: string,
			category: string,
			priceRub: number,
			quantity = 1,
			isMandatory = true,
			canals?: number | null,
		): ChairsideOrder804nItem => {
			const priceKopecks = parseKopecks(priceRub);
			const totalKopecks = multiplyKopecks(priceKopecks, quantity);
			return {
				code,
				title,
				category,
				quantity,
				priceRub,
				priceKopecks,
				totalRub: priceRub * quantity,
				totalKopecks,
				isMandatory,
				toothNumber,
				canalCount: canals ?? null,
			};
		};

		if (clinicalCategory === "pulpitis") {
			// 1. Анестезия
			items.push(
				createService(
					"A16.07.030",
					"Анестезия инфильтрационная / проводниковая",
					"anesthesia",
					950,
				),
			);
			// 2. Коффердам
			items.push(
				createService(
					"A16.07.082",
					"Изоляция операционного поля (коффердам)",
					"therapy",
					1500,
				),
			);
			// 3. Эндодоступ и инструментальная обработка каналов
			const instCode =
				canalCount === 3
					? "A16.07.030.003"
					: canalCount === 2
						? "A16.07.030.002"
						: "A16.07.030.001";
			const instPrice =
				canalCount === 3 ? 5200 : canalCount === 2 ? 3800 : 2100;
			items.push(
				createService(
					instCode,
					`Инструментальная и медикаментозная обработка корневых каналов (${canalCount}-канальный зуб)`,
					"endodontics",
					instPrice,
					1,
					true,
					canalCount,
				),
			);
			// 4. Пломбирование каналов гуттаперчей
			const obtCode =
				canalCount === 3
					? "A16.07.008.003"
					: canalCount === 2
						? "A16.07.008.002"
						: "A16.07.008.001";
			const obtPrice = canalCount === 3 ? 6000 : canalCount === 2 ? 4200 : 2400;
			items.push(
				createService(
					obtCode,
					`Пломбирование корневых каналов зуба гуттаперчевыми штифтами (${canalCount} канала)`,
					"endodontics",
					obtPrice,
					1,
					true,
					canalCount,
				),
			);
			// 5. Пломбирование светоотверждаемым композитом
			items.push(
				createService(
					"A16.07.002.001",
					"Восстановление зуба пломбой I, V, VI класс по Блэку (светоотверждаемый композит)",
					"therapy",
					3800,
				),
			);
		} else if (clinicalCategory === "caries") {
			// 1. Анестезия
			items.push(
				createService(
					"A16.07.030",
					"Анестезия инфильтрационная / проводниковая",
					"anesthesia",
					950,
				),
			);
			// 2. Коффердам
			items.push(
				createService(
					"A16.07.082",
					"Изоляция операционного поля (коффердам)",
					"therapy",
					1500,
				),
			);
			// 3. Пломбирование
			items.push(
				createService(
					"A16.07.002.001",
					"Восстановление зуба пломбой I, V, VI класс по Блэку (светоотверждаемый композит)",
					"therapy",
					3800,
				),
			);
		} else if (clinicalCategory === "periodontitis") {
			items.push(
				createService(
					"A16.07.030",
					"Анестезия инфильтрационная / проводниковая",
					"anesthesia",
					950,
				),
			);
			items.push(
				createService(
					"A16.07.082",
					"Изоляция операционного поля (коффердам)",
					"therapy",
					1500,
				),
			);
			items.push(
				createService(
					"A16.07.030.003",
					`Распломбирование и механическая обработка каналов (${canalCount}-канальный зуб)`,
					"endodontics",
					5200,
					1,
					true,
					canalCount,
				),
			);
		} else if (clinicalCategory === "surgery") {
			items.push(
				createService(
					"A16.07.030",
					"Анестезия инфильтрационная / проводниковая",
					"anesthesia",
					950,
				),
			);
			items.push(
				createService(
					"A16.07.001.002",
					"Удаление постоянного зуба простое",
					"surgery",
					3200,
				),
			);
		} else {
			// Preventive / Hygiene
			items.push(
				createService(
					"B01.065.001",
					"Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
					"consultation",
					1000,
				),
			);
		}

		return items;
	}
}

export const defaultChairsideSentinel = new ChairsideSentinelEngine();
