/**
 * Layer 1: Утилиты, пресеты и расчетные функции для ИИ-персонализации и стилей врача.
 */

import type {
	AiPersonalizeState,
	AiProtocolPromptSettings,
	AiProtocolTemplate,
	DoctorVoiceSettings,
	PlanItem,
	Scenario,
} from "./types";

export const DEFAULT_DOCTOR_VOICE_SETTINGS: DoctorVoiceSettings = {
	conciseness: "standard",
	xrayDetail: "detailed",
	mkb10Mode: "require_confirm",
	tone: "clinical_partner",
	autoComplaintsExtraction: true,
	highlightAllergies: true,
};

export const STANDARD_PROTOCOL_TEMPLATES: AiProtocolTemplate[] = [
	{
		id: "therapy_caries",
		title: "Терапия: Лечение кариеса",
		specialty: "therapy",
		promptText:
			"Описывать глубину поражения по Блэку, тип изолирующей и лечебной прокладки, цвет и марку светоотверждаемого композита, полировку по окклюзии.",
		triggers: [
			"кариес",
			"полость",
			"эмаль",
			"дентин",
			"пломба",
			"реставрация",
		],
	},
	{
		id: "endo_pulpitis",
		title: "Эндодонтия: Пульпит и периодонтит",
		specialty: "endodontics",
		promptText:
			"Фиксировать рабочую длину каналов по апекслокатору, тип машинных Ni-Ti файлов, концентрацию антисептика для ирригации, методику обтурации гуттаперчей с силером.",
		triggers: [
			"пульпит",
			"периодонтит",
			"каналы",
			"апекслокатор",
			"обтурация",
			"гуттаперча",
		],
	},
	{
		id: "surgery_extraction",
		title: "Хирургия: Простое и сложное удаление",
		specialty: "surgery",
		promptText:
			"Указывать вид анестезии и дозировку, анатомические особенности корней, ревизию лунки, гемостаз, наложение швов и рекомендации по охлаждению.",
		triggers: [
			"удаление",
			"элеватор",
			"щипцы",
			"лунка",
			"гемостаз",
			"шов",
			"альвеолит",
		],
	},
	{
		id: "ortho_crown",
		title: "Ортопедия: Коронки и мостовидные протезы",
		specialty: "prosthetics",
		promptText:
			"Фиксировать вид уступа (круговой/со скосом), ретракцию десны, материал временной коронки, оттискную массу или скан, тип фиксирующего цемента.",
		triggers: [
			"коронка",
			"препарирование",
			"уступ",
			"слепок",
			"сканирование",
			"цемент",
			"окклюзия",
		],
	},
];

export const DEFAULT_PROMPT_SETTINGS: AiProtocolPromptSettings = {
	systemInstructions:
		"Формулировать протокол строго по стандартам клинических рекомендаций СтАР. Сохранять врачебную автономию и точность анатомических терминов.",
	clinicalTriggers:
		"боль при накусывании, термопроба положительна, перкуссия безболезненна, дефект пломбы",
	activeTemplateId: "therapy_caries",
	customVocabulary: "эмалево-дентинная граница, коффердам, оптрагейт, композит светового отверждения",
};

const STORAGE_KEY = "dente_clinical_ai_personalize_settings";

export function loadDoctorAiPersonalizeSettings(): AiPersonalizeState {
	if (typeof window === "undefined" || !window.localStorage) {
		return {
			doctorVoice: { ...DEFAULT_DOCTOR_VOICE_SETTINGS },
			promptSettings: { ...DEFAULT_PROMPT_SETTINGS },
		};
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return {
				doctorVoice: { ...DEFAULT_DOCTOR_VOICE_SETTINGS },
				promptSettings: { ...DEFAULT_PROMPT_SETTINGS },
			};
		}
		const parsed = JSON.parse(raw);
		return {
			doctorVoice: {
				...DEFAULT_DOCTOR_VOICE_SETTINGS,
				...(parsed.doctorVoice || {}),
			},
			promptSettings: {
				...DEFAULT_PROMPT_SETTINGS,
				...(parsed.promptSettings || {}),
			},
		};
	} catch {
		return {
			doctorVoice: { ...DEFAULT_DOCTOR_VOICE_SETTINGS },
			promptSettings: { ...DEFAULT_PROMPT_SETTINGS },
		};
	}
}

export function saveDoctorAiPersonalizeSettings(
	state: AiPersonalizeState,
): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (e) {
		console.warn("[ClinicalAiPersonalize] Failed to persist settings", e);
	}
}

export function resetDoctorAiPersonalizeSettings(): AiPersonalizeState {
	const initial: AiPersonalizeState = {
		doctorVoice: { ...DEFAULT_DOCTOR_VOICE_SETTINGS },
		promptSettings: { ...DEFAULT_PROMPT_SETTINGS },
	};
	saveDoctorAiPersonalizeSettings(initial);
	return initial;
}

export function readServerMessage(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const rec = payload as Record<string, unknown>;
	for (const key of ["message", "error"]) {
		const value = rec[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return null;
}

export function failureText(
	status: number,
	serverMessage: string | null,
	kind: "plan" | "post",
): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403)
		return "Нет прав на ИИ-персонализацию: доступ закрыт или истёк вход в программу.";
	if (status === 400)
		return kind === "plan"
			? "Не удалось собрать план для персонализации: проверьте позиции плана и диагноз."
			: "Не удалось собрать параметры памятки после приёма.";
	if (status === 404) return "Сервис ИИ-персонализации не отвечает.";
	if (status >= 500)
		return "Сбой на сервере клиники: персонализация не собрана.";
	return `Программа не смогла получить ответ ИИ (код ${status}).`;
}

export function todayDateLike(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function moneyLine(amount: number | null | undefined): number {
	if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)
		return 0;
	return Math.round(amount * 100) / 100;
}

export function lineTotal(item: PlanItem): number {
	const unit = moneyLine(item.unitPriceRub);
	const discount = moneyLine(item.discountRub);
	const qty = item.quantity;
	if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0) return 0;
	return moneyLine(Math.max(0, unit * qty - discount));
}

export function inferCareTopic(items: PlanItem[], procedureHint: string): string {
	const blob = [
		procedureHint ?? "",
		...(items ?? []).map(
			(i) =>
				`${i?.snapshotServiceName ?? ""} ${i?.snapshotServiceCategory ?? ""}`,
		),
	]
		.join(" ")
		.toLowerCase();

	const rules: Array<[RegExp, string]> = [
		[/гигиен|hygiene|air.?flow|скейлинг|professional\s*clean/i, "hygiene"],
		[/удален|экстрак|extraction|tooth\s*remov/i, "extraction"],
		[/имплант|остеопласт|костн|implantation/i, "implantation"],
		[/канал|эндодонт|пульп|периодонт.*зуб|endo/i, "endo"],
		[/пародонт|кюретаж|вектор|десн/i, "periodontology"],
		[/брекет|элайнер|ортодонт/i, "orthodontics"],
		[/коронк|винир|протез|мост|ортопед/i, "prosthetics"],
		[/хирург|операц|резекц|цистэкто/i, "surgery"],
		[/пломб|реставр|кариес|композит|filling|restoration/i, "filling"],
		[/анестез/i, "anesthesia"],
	];
	for (const [re, topic] of rules) {
		if (re.test(blob)) return topic;
	}
	return "other";
}

export function buildTreatmentPlanPayload(input: {
	items: PlanItem[];
	scenarios: Scenario[];
	complaint: string | null;
	diagnosis: string | null;
	treatmentPlanText: string | null;
	doctorFullName: string | null;
}): Record<string, unknown> | { error: string } {
	const activeItems = (input?.items ?? []).filter(
		(i) => i?.status !== "cancelled",
	);
	const activeScenarios = (input?.scenarios ?? []).filter(
		(s) => s?.active !== false,
	);

	const plannedStages: Array<Record<string, unknown>> = [];

	for (const item of activeItems) {
		const name = (item.snapshotServiceName || "").trim() || "Услуга плана";
		const tooth = (item.toothCode || "").trim();
		plannedStages.push({
			stageName: tooth ? `${name} (зуб ${tooth})` : name,
			plannedServices: name,
			plannedTiming:
				item.status === "completed"
					? "Выполнено"
					: item.status === "in_progress"
						? "В работе"
						: "По плану",
			clinicalNotes: item.notes?.trim() || null,
			estimatedAmountRub: lineTotal(item),
		});
	}

	if (plannedStages.length === 0) {
		for (const sc of activeScenarios) {
			const phases = Array.isArray(sc.phases) ? sc.phases : [];
			if (phases.length > 0) {
				for (const ph of phases) {
					plannedStages.push({
						stageName:
							(ph.title || sc.title || "Этап сценария").trim() || "Этап",
						plannedServices:
							(ph.focus || sc.title || "По сценарию лечения").trim() ||
							"По сценарию",
						plannedTiming: (ph.window || "По графику").trim() || "По графику",
						clinicalNotes: null,
						estimatedAmountRub: moneyLine(ph.amountRub),
					});
				}
			} else if (sc.title) {
				plannedStages.push({
					stageName: sc.title,
					plannedServices: sc.title,
					plannedTiming: "По сценарию",
					clinicalNotes: null,
					estimatedAmountRub: moneyLine(sc.totalRub),
				});
			}
		}
	}

	const planText = (input.treatmentPlanText || "").trim();
	if (plannedStages.length === 0 && planText) {
		plannedStages.push({
			stageName: "План лечения",
			plannedServices: planText.slice(0, 500),
			plannedTiming: "В ближайшее время",
			clinicalNotes: null,
			estimatedAmountRub: 0,
		});
	}

	if (plannedStages.length === 0) {
		return {
			error:
				"Нет позиций плана лечения и текста плана в заметке. Добавьте услуги в план пациента — тогда можно объяснить план.",
		};
	}

	const teeth = Array.from(
		new Set(
			activeItems
				.map((i) => (i.toothCode || "").trim())
				.filter((t) => t.length > 0),
		),
	);
	const teethOrArea = teeth.length > 0 ? teeth.join(", ") : "Полость рта";

	const clinicalReason =
		(input.complaint || "").trim() ||
		(activeItems[0]?.notes || "").trim() ||
		"План лечения по показаниям";
	const diagnosisSummary =
		(input.diagnosis || "").trim() ||
		activeItems
			.map((i) => i.snapshotServiceName)
			.filter(Boolean)
			.slice(0, 3)
			.join("; ") ||
		"По плану лечения";

	const clinicalToothRows =
		teeth.length > 0
			? teeth.slice(0, 16).map((tooth) => {
					const related = activeItems.find(
						(i) => (i.toothCode || "").trim() === tooth,
					);
					const svc = (
						related?.snapshotServiceName || "Лечение по плану"
					).trim();
					return {
						toothOrArea: tooth,
						surfaces: ["not_applicable"],
						status: "planned",
						diagnosisOrFinding: diagnosisSummary.slice(0, 500),
						indication: svc.slice(0, 500),
						plannedAction: svc.slice(0, 500),
						prognosis: null,
						periodontalStatus: null,
						implantOrProstheticNotes: null,
						orthodonticNotes: null,
					};
				})
			: [
					{
						toothOrArea: teethOrArea.slice(0, 80) || "Полость рта",
						surfaces: ["not_applicable"],
						status: "planned",
						diagnosisOrFinding: diagnosisSummary.slice(0, 500),
						indication: "Лечение по утверждённому плану",
						plannedAction: String(
							plannedStages[0]?.plannedServices ?? "Лечение",
						).slice(0, 500),
						prognosis: null,
						periodontalStatus: null,
						implantOrProstheticNotes: null,
						orthodonticNotes: null,
					},
				];

	const goalsFromScenarios = activeScenarios
		.flatMap((s) => (Array.isArray(s.pros) ? s.pros : []))
		.map((g) => String(g).trim())
		.filter(Boolean);
	const treatmentGoals =
		goalsFromScenarios.length > 0
			? goalsFromScenarios.slice(0, 12)
			: ["Устранить причину обращения и стабилизировать результат лечения"];

	const alternativesFromScenarios = activeScenarios
		.flatMap((s) => (Array.isArray(s.tradeoffs) ? s.tradeoffs : []))
		.map((a) => String(a).trim())
		.filter(Boolean);
	const alternatives =
		alternativesFromScenarios.length > 0
			? alternativesFromScenarios.slice(0, 12)
			: [
					"Наблюдение с контрольным осмотром без активного вмешательства на этом этапе",
				];

	const risksFromScenarios = activeScenarios
		.flatMap((s) =>
			Array.isArray(s.clinicalWarnings) ? s.clinicalWarnings : [],
		)
		.map((r) => String(r).trim())
		.filter(Boolean);
	const risksAndLimitations =
		risksFromScenarios.length > 0
			? risksFromScenarios.slice(0, 16)
			: [
					"Результат зависит от домашней гигиены и явки на контрольные визиты",
					"Возможна временная чувствительность после вмешательства",
				];

	const estimatedTotalRub = moneyLine(
		(plannedStages ?? []).reduce(
			(sum, st) => sum + moneyLine((st?.estimatedAmountRub ?? 0) as number),
			0,
		),
	);

	return {
		clinicalReason: clinicalReason.slice(0, 700),
		diagnosisSummary: diagnosisSummary.slice(0, 700),
		teethOrArea: teethOrArea.slice(0, 240),
		clinicalToothRows,
		treatmentGoals,
		plannedStages: (plannedStages ?? []).slice(0, 24),
		estimatedTotalRub,
		alternatives,
		risksAndLimitations,
		prognosisAndLimits: null,
		controlPlan: null,
		doctorFullName: (input?.doctorFullName || "").trim().slice(0, 240) || null,
		plannedAt: todayDateLike(),
		patientQuestionsAnswered: true,
		planRequiresSeparateConsent: true,
		planRequiresNewApprovalOnChange: true,
	};
}
