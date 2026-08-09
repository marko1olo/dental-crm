/**
 * ИИ-персонализация плана лечения и памятки после приёма.
 *
 * БЫЛО: POST /api/ai/treatment-plan-personalize и POST /api/ai/post-visit-personalize
 * уже отдавали русский текст для пациента (rule fallback + optional neural),
 * но ни один экран их не звал. Врач закрывал приём — а объяснить план
 * «человеческим языком» и выдать памятку можно было только вручную.
 *
 * ТЕПЕРЬ: на приёме и в кассе кнопка собирает payload из позиций плана
 * пациента (dashboard.treatmentPlanItems) и живых полей заметки приёма,
 * дергает оба эндпоинта и показывает результат рядом с клиническим блоком.
 *
 * Панель самодостаточная (как ClinicalTasksPanel / ClinicalRulePanel):
 * auth + dashboard из useAppLogicContext, минимум props.
 */

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { showToast } from "./components/GlobalToast";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { actionFailureToast } from "./lib/panelStateText";

type PersonalizedPlanResult = {
	patientFriendlyExplanation: string;
	patientHygieneAdvice: string;
	alternatives?: string[];
	risksAndLimitations?: string[];
	prognosisAndLimits?: string;
	controlPlan?: string;
};

type PostVisitPersonalizedResult = {
	allowedAfter: string[];
	temporaryRestrictions: string[];
	medicationAndRinsePlan: string[];
	hygieneInstructions: string[];
	nutritionInstructions: string[];
	urgentWarningSigns: string[];
	telegramSummary: string;
};

export type ClinicalAiPersonalizePanelProps = {
	patientId?: string | null;
	/** ФИО врача для памятки и подписи плана. */
	doctorFullName?: string | null;
	/** Повод / жалоба из заметки приёма — если есть. */
	complaint?: string | null;
	/** Диагноз из заметки приёма — если есть. */
	diagnosis?: string | null;
	/** Текст плана из заметки — запасной этап, если позиций в плане нет. */
	treatmentPlanText?: string | null;
	/** Контекст экрана — только подпись, логика одна. */
	context?: "visit" | "finance";
};

type PlanItem = {
	patientId?: string;
	status?: string;
	serviceId?: string;
	snapshotServiceName?: string;
	snapshotServiceCategory?: string | null;
	toothCode?: string | null;
	unitPriceRub?: number;
	discountRub?: number;
	quantity?: number;
	notes?: string | null;
};

type Scenario = {
	patientId?: string;
	active?: boolean;
	title?: string;
	phases?: Array<{
		title?: string;
		window?: string;
		amountRub?: number;
		focus?: string;
	}>;
	pros?: string[];
	tradeoffs?: string[];
	clinicalWarnings?: string[];
	totalRub?: number;
};

function readServerMessage(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const rec = payload as Record<string, unknown>;
	for (const key of ["message", "error"]) {
		const value = rec[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return null;
}

function failureText(
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

function todayDateLike(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function moneyLine(amount: number | null | undefined): number {
	if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)
		return 0;
	// копейки: округление до 0.01
	return Math.round(amount * 100) / 100;
}

/**
 * Итог строки плана: `цена × количество − скидка`, не ниже нуля.
 *
 * КОЛИЧЕСТВО БОЛЬШЕ НЕ ПОДМЕНЯЕТСЯ ЕДИНИЦЕЙ. Здесь стояло
 * `item.quantity > 0 ? item.quantity : 1`, то есть строка без объёма считалась
 * за одну услугу и уходила суммой в payload ИИ, а оттуда — в текст, который
 * читает пациент. Это та же тихая догадка, что стояла в SQL отчётов
 * руководителя (`services/reports/managerReports.ts`), и убрана она по тому же
 * основанию:
 *
 *  • Данные сюда приходят из `dashboard.treatmentPlanItems`, а их контракт
 *    объявляет `quantity: z.number().int().positive()`
 *    (`packages/shared/src/index.ts`). Ветка «количество ≤ 0» защищала от
 *    состояния, которого контракт не допускает, и тем врала о модели угроз.
 *  • Канон (`apps/api/src/money/patientDebt.ts`, `assertContractQuantity`) на
 *    количестве ≤ 0 ОТКАЗЫВАЕТ дословно со словами «позицию без объёма надо
 *    отменять статусом cancelled, а не считать как одну единицу». Бросить
 *    исключение посреди сборки payload нельзя — панель обязана отрисоваться, —
 *    но выставлять счёт за единицу, которой нет, тем более нельзя. Поэтому
 *    строка без законного объёма даёт 0: за неё не выставляется ничего, ровно
 *    как решил канон.
 *
 * Дробное количество отвергается по той же причине: колонка `numeric(10, 2)`
 * его физически пропускает, а канон на нём отказывает, потому что три
 * существующих расчёта округляли его по-разному.
 */
function lineTotal(item: PlanItem): number {
	const unit = moneyLine(item.unitPriceRub);
	const discount = moneyLine(item.discountRub);
	const qty = item.quantity;
	if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0) return 0;
	return moneyLine(Math.max(0, unit * qty - discount));
}

/**
 * Тема ухода для post-visit: по категории/названию услуги, иначе universal fallback на бэке.
 */
function inferCareTopic(items: PlanItem[], procedureHint: string): string {
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

function buildTreatmentPlanPayload(input: {
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

	// Сценарии — дополнительные этапы, если позиций мало
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

function ListBlock({
	title,
	items,
}: {
	title: string;
	items: string[] | undefined;
}) {
	if (!items || items.length === 0) return null;
	return (
		<div className="ops-block" style={{ marginTop: "0.75rem" }}>
			<strong>{title}</strong>
			<ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem" }}>
				{(items ?? []).map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</div>
	);
}

function MarkdownishText({ text }: { text: string }) {
	// Простой рендер: сохраняем переносы, **жирный** → <strong>
	const parts = (text ?? "").split(/(\*\*[^*]+\*\*)/g);
	return (
		<div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
			{(parts ?? []).map((part) => {
				if (part?.startsWith("**") && part?.endsWith("**") && part.length > 4) {
					return <strong key={`bold-${part}`}>{part.slice(2, -2)}</strong>;
				}
				return <span key={`text-${part}`}>{part}</span>;
			})}
		</div>
	);
}

export const ClinicalAiPersonalizePanel: React.FC<
	ClinicalAiPersonalizePanelProps
> = ({
	patientId = null,
	doctorFullName = null,
	complaint = null,
	diagnosis = null,
	treatmentPlanText = null,
	context = "visit",
}) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = (appLogic as { dashboard?: Record<string, unknown> } | null)
		?.dashboard;

	const [planResult, setPlanResult] = useState<PersonalizedPlanResult | null>(
		null,
	);
	const [postResult, setPostResult] =
		useState<PostVisitPersonalizedResult | null>(null);
	const [planError, setPlanError] = useState<string | null>(null);
	const [postError, setPostError] = useState<string | null>(null);
	const [planLoading, setPlanLoading] = useState(false);
	const [postLoading, setPostLoading] = useState(false);
	const [copied, setCopied] = useState<string | null>(null);

	const patientItems = useMemo(() => {
		if (!patientId || !dashboard) return [] as PlanItem[];
		const raw = (dashboard as { treatmentPlanItems?: PlanItem[] })
			.treatmentPlanItems;
		if (!Array.isArray(raw)) return [];
		return raw.filter((item) => item?.patientId === patientId);
	}, [dashboard, patientId]);

	const patientScenarios = useMemo(() => {
		if (!patientId || !dashboard) return [] as Scenario[];
		const raw = (dashboard as { treatmentPlanScenarios?: Scenario[] })
			.treatmentPlanScenarios;
		if (!Array.isArray(raw)) return [];
		return raw.filter((s) => s?.patientId === patientId);
	}, [dashboard, patientId]);

	const resolvedDoctorName = useMemo(() => {
		const fromProp = (doctorFullName || "").trim();
		if (fromProp) return fromProp;
		const doc = (
			appLogic as { activeDoctor?: { fullName?: string; name?: string } } | null
		)?.activeDoctor;
		const name = (doc?.fullName || doc?.name || "").trim();
		return name || "Лечащий врач";
	}, [appLogic, doctorFullName]);

	const copyText = useCallback(async (label: string, text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(label);
			window.setTimeout(
				() => setCopied((cur) => (cur === label ? null : cur)),
				2000,
			);
		} catch {
			setCopied(null);
		}
	}, []);

	const runPlanPersonalize = useCallback(async () => {
		if (!patientId) {
			setPlanError(
				"Сначала выберите пациента — без карты план собрать нельзя.",
			);
			return;
		}
		const payloadOrError = buildTreatmentPlanPayload({
			items: patientItems,
			scenarios: patientScenarios,
			complaint,
			diagnosis,
			treatmentPlanText,
			doctorFullName: resolvedDoctorName,
		});
		if ("error" in payloadOrError) {
			setPlanError(String(payloadOrError.error));
			setPlanResult(null);
			return;
		}

		setPlanLoading(true);
		setPlanError(null);
		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders({
							"Content-Type": "application/json",
						})
					: { "Content-Type": "application/json" };
			const response = await fetch("/api/ai/treatment-plan-personalize", {
				method: "POST",
				headers,
				body: JSON.stringify(payloadOrError),
			});
			const body = (await response.json()) as unknown;
			if (!response.ok) {
				setPlanResult(null);
				setPlanError(
					failureText(response.status, readServerMessage(body), "plan"),
				);
				return;
			}
			const result = body as PersonalizedPlanResult;
			if (
				!result ||
				typeof result.patientFriendlyExplanation !== "string" ||
				typeof result.patientHygieneAdvice !== "string"
			) {
				setPlanResult(null);
				setPlanError(
					"Сервер вернул ответ без текста для пациента. Попробуйте ещё раз.",
				);
				return;
			}
			setPlanResult(result);
		} catch (error) {
			setPlanResult(null);
			showToast(
				actionFailureToast(
					"Персонализация плана",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPlanError(
				"Сеть недоступна: персонализация плана не получена. Проверьте связь и повторите.",
			);
		} finally {
			setPlanLoading(false);
		}
	}, [
		auth,
		complaint,
		diagnosis,
		patientId,
		patientItems,
		patientScenarios,
		resolvedDoctorName,
		treatmentPlanText,
	]);

	const runPostVisitPersonalize = useCallback(async () => {
		if (!patientId) {
			setPostError(
				"Сначала выберите пациента — без карты памятку собрать нельзя.",
			);
			return;
		}

		const activeItems = (patientItems ?? []).filter(
			(i) => i?.status !== "cancelled",
		);
		const primary =
			activeItems.find((i) => i?.status === "completed") ||
			activeItems.find((i) => i?.status === "in_progress") ||
			activeItems[0];
		const procedureName =
			(primary?.snapshotServiceName || "").trim() ||
			(treatmentPlanText || "").trim().slice(0, 120) ||
			"Стоматологический приём";
		const toothOrArea =
			(primary?.toothCode || "").trim() ||
			Array.from(
				new Set(
					activeItems.map((i) => (i?.toothCode || "").trim()).filter(Boolean),
				),
			).join(", ") ||
			"Полость рта";
		const careTopic = inferCareTopic(activeItems, procedureName);

		setPostLoading(true);
		setPostError(null);
		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders({
							"Content-Type": "application/json",
						})
					: { "Content-Type": "application/json" };
			const response = await fetch("/api/ai/post-visit-personalize", {
				method: "POST",
				headers,
				body: JSON.stringify({
					careTopic,
					procedureName: procedureName.slice(0, 240),
					toothOrArea: toothOrArea.slice(0, 240),
					doctorFullName: resolvedDoctorName.slice(0, 240),
				}),
			});
			const body = (await response.json()) as unknown;
			if (!response.ok) {
				setPostResult(null);
				setPostError(
					failureText(response.status, readServerMessage(body), "post"),
				);
				return;
			}
			const result = body as PostVisitPersonalizedResult;
			if (
				!result ||
				!Array.isArray(result.allowedAfter) ||
				typeof result.telegramSummary !== "string"
			) {
				setPostResult(null);
				setPostError("Сервер вернул неполную памятку. Попробуйте ещё раз.");
				return;
			}
			setPostResult(result);
		} catch (error) {
			setPostResult(null);
			showToast(
				actionFailureToast(
					"Сборка памятки",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPostError(
				"Сеть недоступна: памятка после приёма не получена. Проверьте связь и повторите.",
			);
		} finally {
			setPostLoading(false);
		}
	}, [auth, patientId, patientItems, resolvedDoctorName, treatmentPlanText]);

	if (!patientId) {
		return (
			<section
				className="panel ops-panel"
				data-testid="clinical-ai-personalize-panel"
			>
				<div className="panel-heading">
					<h2>Пациенту простым языком</h2>
				</div>
				<p className="ops-hint">
					Выберите пациента — тогда можно объяснить план лечения и собрать
					памятку после приёма.
				</p>
			</section>
		);
	}

	const planCount = (patientItems ?? []).filter(
		(i) => i?.status !== "cancelled",
	).length;
	const contextHint =
		context === "finance"
			? "В кассе удобно показать пациенту объяснение сметы и выдать памятку при оплате."
			: "На приёме — объяснить план до согласия и выдать памятку перед уходом.";

	return (
		<section
			className="panel ops-panel"
			data-testid="clinical-ai-personalize-panel"
		>
			<div className="panel-heading">
				<h2>Пациенту простым языком</h2>
				<span className="status-pill status-planned">{planCount} усл.</span>
			</div>

			<p className="ops-hint">
				{contextHint} Текст собирается из плана пациента
				{planCount > 0 ? ` (${planCount} поз.)` : ""} и полей приёма. Без
				нейросети сработает клинический шаблон клиники DENTE.
			</p>

			<div
				className="ops-actions"
				style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
			>
				<button
					type="button"
					className="primary-button"
					onClick={() => void runPlanPersonalize()}
					disabled={planLoading || postLoading}
					data-testid="ai-personalize-plan-btn"
				>
					{planLoading ? "Собираю объяснение…" : "Объяснить план пациенту"}
				</button>
				<button
					type="button"
					className="secondary-button"
					onClick={() => void runPostVisitPersonalize()}
					disabled={planLoading || postLoading}
					data-testid="ai-personalize-post-btn"
				>
					{postLoading ? "Собираю памятку…" : "Памятка после приёма"}
				</button>
			</div>

			{planError ? (
				<div
					className="ops-notice ops-notice--error"
					role="alert"
					style={{ marginTop: "0.75rem" }}
				>
					<p>{planError}</p>
				</div>
			) : null}

			{postError ? (
				<div
					className="ops-notice ops-notice--error"
					role="alert"
					style={{ marginTop: "0.75rem" }}
				>
					<p>{postError}</p>
				</div>
			) : null}

			{planResult ? (
				<div
					className="ops-block"
					style={{ marginTop: "1rem" }}
					data-testid="ai-plan-result"
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "0.5rem",
							flexWrap: "wrap",
						}}
					>
						<strong>Объяснение плана</strong>
						<button
							type="button"
							className="secondary-button"
							onClick={() =>
								void copyText(
									"plan",
									`${planResult.patientFriendlyExplanation}\n\n---\n\n${planResult.patientHygieneAdvice}`,
								)
							}
						>
							{copied === "plan" ? "Скопировано" : "Копировать всё"}
						</button>
					</div>
					<div style={{ marginTop: "0.5rem" }}>
						<MarkdownishText text={planResult.patientFriendlyExplanation} />
					</div>
					<div style={{ marginTop: "0.85rem" }}>
						<strong>Гигиена дома</strong>
						<div style={{ marginTop: "0.35rem" }}>
							<MarkdownishText text={planResult.patientHygieneAdvice} />
						</div>
					</div>
				</div>
			) : null}

			{postResult ? (
				<div
					className="ops-block"
					style={{ marginTop: "1rem" }}
					data-testid="ai-post-result"
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "0.5rem",
							flexWrap: "wrap",
						}}
					>
						<strong>Памятка после приёма</strong>
						<button
							type="button"
							className="secondary-button"
							onClick={() => void copyText("post", postResult.telegramSummary)}
						>
							{copied === "post" ? "Скопировано" : "Копировать для мессенджера"}
						</button>
					</div>
					{postResult.telegramSummary ? (
						<p className="ops-hint" style={{ marginTop: "0.5rem" }}>
							{postResult.telegramSummary}
						</p>
					) : null}
					<ListBlock
						title="Можно после процедуры"
						items={postResult.allowedAfter}
					/>
					<ListBlock
						title="Временные ограничения"
						items={postResult.temporaryRestrictions}
					/>
					<ListBlock
						title="Лекарства и полоскания"
						items={postResult.medicationAndRinsePlan}
					/>
					<ListBlock title="Гигиена" items={postResult.hygieneInstructions} />
					<ListBlock title="Питание" items={postResult.nutritionInstructions} />
					<ListBlock
						title="Срочно к врачу, если"
						items={postResult.urgentWarningSigns}
					/>
				</div>
			) : null}
		</section>
	);
};

export default ClinicalAiPersonalizePanel;
