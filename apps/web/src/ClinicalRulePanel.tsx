/**
 * Клинические правила на приёме и в кассе.
 *
 * БЫЛО: панель только рисовала `dashboard.clinicalRuleEvaluations` — снимок,
 * собранный при открытии дашборда. POST /api/clinical/rules/evaluate уже считал
 * правила по актуальному плану пациента (org-scoped, с enforceBlockers), но
 * ни один экран его не звал. Врач менял план, добавлял услугу-триггер — и
 * видел старые предупреждения, пока не перезагрузит всю смену.
 *
 * ТЕПЕРЬ: кнопка «Пересчитать по плану» собирает serviceIds из позиций плана
 * и активных сценариев пациента (как sampleData.buildClinicalRuleEvaluations)
 * и дергает живой evaluate. Снимок дашборда остаётся запасным, пока живой
 * ответ не пришёл.
 */

import type { Dashboard, StaffRole } from "@dental/shared";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "./contexts/AppLogicContext";

type ClinicalRuleEvaluation = Dashboard["clinicalRuleEvaluations"][number];
type ClinicalRuleSeverity = ClinicalRuleEvaluation["severity"];
type ClinicalRuleAction = ClinicalRuleEvaluation["action"];
type ClinicalRuleSummary = Dashboard["clinicalRuleSummary"];

type ClinicalRulePanelProps = {
	actionLabels: Record<ClinicalRuleAction, string>;
	context: "visit" | "finance";
	evaluations: ClinicalRuleEvaluation[];
	/**
	 * Пациент, по чьему плану пересчитываем правила.
	 * Без patientId кнопка живого evaluate скрыта — остаётся только снимок.
	 */
	patientId?: string | null;
	serviceTitle: (serviceId: string) => string;
	severityLabels: Record<ClinicalRuleSeverity, string>;
	staffRoleLabels: Record<StaffRole, string>;
	summary: ClinicalRuleSummary;
};

const EMPTY_SUMMARY: ClinicalRuleSummary = {
	activeRules: 0,
	evaluatedRules: 0,
	unresolved: 0,
	blockers: 0,
	warnings: 0,
	requiredServices: 0,
	coveredRules: 0,
};

function summarizeEvaluations(
	evaluations: ClinicalRuleEvaluation[],
	activeRulesFallback: number,
): ClinicalRuleSummary {
	const unresolvedList = evaluations.filter((e) => !e.resolved);
	return {
		activeRules: activeRulesFallback,
		evaluatedRules: evaluations.length,
		unresolved: unresolvedList.length,
		blockers: unresolvedList.filter((e) => e.severity === "blocker").length,
		warnings: unresolvedList.filter((e) => e.severity === "warning").length,
		requiredServices: unresolvedList.reduce(
			(acc, e) => acc + (e.missingRequiredServiceIds?.length ?? 0),
			0,
		),
		coveredRules: evaluations.filter((e) => e.resolved).length,
	};
}

function collectServiceIdsForPatient(
	dashboard: Dashboard | null | undefined,
	patientId: string,
): {
	serviceIds: string[];
	completedServiceIds: string[];
	scenarioId: string | null;
} {
	const planItems = (dashboard?.treatmentPlanItems ?? []).filter(
		(item) => item.patientId === patientId && item.status !== "cancelled",
	);
	const completedServiceIds = planItems
		.filter((item) => item.status === "completed")
		.map((item) => item.serviceId)
		.filter(Boolean);
	const scenarios = (dashboard?.treatmentPlanScenarios ?? []).filter(
		(scenario) => scenario.patientId === patientId && scenario.active,
	);
	const scenarioServiceIds = scenarios.flatMap(
		(scenario) => scenario.includedServiceIds ?? [],
	);
	const serviceIds = Array.from(
		new Set([
			...planItems.map((item) => item.serviceId).filter(Boolean),
			...scenarioServiceIds.filter(Boolean),
		]),
	);
	const scenarioId = scenarios.length === 1 ? (scenarios[0]?.id ?? null) : null;
	return { serviceIds, completedServiceIds, scenarioId };
}

export function ClinicalRulePanel({
	actionLabels,
	context,
	evaluations,
	patientId = null,
	serviceTitle,
	severityLabels,
	staffRoleLabels,
	summary,
}: ClinicalRulePanelProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const dashboard = appLogic?.dashboard as Dashboard | null | undefined;

	const [liveEvaluations, setLiveEvaluations] = useState<
		ClinicalRuleEvaluation[] | null
	>(null);
	const [liveSummary, setLiveSummary] = useState<ClinicalRuleSummary | null>(
		null,
	);
	const [liveAt, setLiveAt] = useState<string | null>(null);
	const [evaluating, setEvaluating] = useState(false);
	const [evaluateError, setEvaluateError] = useState<string | null>(null);
	const [evaluateNotice, setEvaluateNotice] = useState<string | null>(null);
	/** После смены пациента сбрасываем живой снимок — иначе чужие правила. */
	useEffect(() => {
		setLiveEvaluations(null);
		setLiveSummary(null);
		setLiveAt(null);
		setEvaluateError(null);
		setEvaluateNotice(null);
	}, [patientId]);

	const displayEvaluations = liveEvaluations ?? evaluations;
	const displaySummary = liveSummary ?? summary ?? EMPTY_SUMMARY;

	const unresolved = displayEvaluations.filter(
		(evaluation) => !evaluation.resolved,
	);
	const sourceEvaluations = unresolved.length ? unresolved : displayEvaluations;
	const visibleEvaluations = sourceEvaluations.slice(
		0,
		context === "visit" ? 1 : 4,
	);
	const emptyMessage =
		context === "visit"
			? "Активных клинических предупреждений нет. Можно продолжать прием."
			: "Все клинические правила закрыты. Риски для оплаты и плана лечения не найдены.";

	const planContext = useMemo(() => {
		if (!patientId) return null;
		return collectServiceIdsForPatient(dashboard, patientId);
	}, [dashboard, patientId]);

	const primaryRuleAction = (evaluation: ClinicalRuleEvaluation) => {
		if (evaluation.missingCompletedServiceIds.length) {
			return `Сначала завершить: ${evaluation.missingCompletedServiceIds.map(serviceTitle).join(", ")}`;
		}
		if (evaluation.missingRequiredServiceIds.length) {
			return `Добавить: ${evaluation.missingRequiredServiceIds.map(serviceTitle).join(", ")}`;
		}
		if (evaluation.blockedServiceIds.length) {
			return `Проверьте перед планированием: ${evaluation.blockedServiceIds.map(serviceTitle).join(", ")}`;
		}
		return evaluation.message;
	};

	const failureText = (
		status: number,
		serverMessage: string | null,
	): string => {
		if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
		if (status === 401 || status === 403)
			return "Нет прав проверять клинические правила: доступ закрыт или истёк вход в программу.";
		if (status === 404) return "Раздел клинических правил не отвечает.";
		if (status === 400)
			return "Не удалось пересчитать правила: проверьте, что у пациента есть услуги в плане.";
		if (status >= 500)
			return "Сбой на сервере клиники: правила не пересчитаны.";
		return `Программа не смогла пересчитать клинические правила (ответ ${status}).`;
	};

	const runLiveEvaluate = useCallback(
		async (enforceBlockers: boolean) => {
			if (!patientId) {
				setEvaluateError("Пациент не выбран — пересчитать правила не по кому.");
				return;
			}
			const ctx = collectServiceIdsForPatient(dashboard, patientId);
			if (!ctx.serviceIds.length) {
				setEvaluateError(
					"В плане лечения нет услуг для проверки. Добавьте позицию плана или активный сценарий — затем пересчитайте.",
				);
				setEvaluateNotice(null);
				return;
			}
			setEvaluating(true);
			setEvaluateError(null);
			setEvaluateNotice(null);
			try {
				let response: Response;
				try {
					response = await fetch("/api/clinical/rules/evaluate", {
						method: "POST",
						headers: auth
							? auth.denteClinicalReadHeaders({
									"Content-Type": "application/json",
								})
							: { "Content-Type": "application/json" },
						body: JSON.stringify({
							patientId,
							serviceIds: ctx.serviceIds,
							completedServiceIds: ctx.completedServiceIds,
							scenarioId: ctx.scenarioId,
							enforceBlockers,
						}),
					});
				} catch {
					setEvaluateError(
						"Нет связи с сервером клиники: пересчёт клинических правил не выполнен.",
					);
					return;
				}

				let payload: unknown = null;
				try {
					payload = await response.json();
				} catch {
					payload = null;
				}
				const body =
					payload && typeof payload === "object"
						? (payload as Record<string, unknown>)
						: null;
				const serverMessage =
					body && typeof body.message === "string" ? body.message : null;

				/**
				 * enforceBlockers=true при нерешённом blocker даёт 400 ClinicalRuleBlocker
				 * с одним evaluation в теле — это и есть ответ врачу, не «ошибка сети».
				 */
				if (
					response.status === 400 &&
					body &&
					(body.code === "ClinicalRuleBlocker" ||
						body.error === "ClinicalRuleBlocker") &&
					body.evaluation &&
					typeof body.evaluation === "object"
				) {
					const blocker = body.evaluation as ClinicalRuleEvaluation;
					const list = [blocker];
					setLiveEvaluations(list);
					setLiveSummary(
						summarizeEvaluations(
							list,
							dashboard?.clinicalRuleSummary?.activeRules ?? 0,
						),
					);
					setLiveAt(new Date().toISOString());
					setEvaluateError(serverMessage ?? blocker.message);
					setEvaluateNotice(null);
					return;
				}

				if (!response.ok) {
					setEvaluateError(failureText(response.status, serverMessage));
					return;
				}

				const nextEvaluations = Array.isArray(body?.evaluations)
					? (body!.evaluations as ClinicalRuleEvaluation[])
					: [];
				const nextSummary =
					body?.summary && typeof body.summary === "object"
						? (body.summary as ClinicalRuleSummary)
						: summarizeEvaluations(
								nextEvaluations,
								dashboard?.clinicalRuleSummary?.activeRules ?? 0,
							);
				setLiveEvaluations(nextEvaluations);
				setLiveSummary(nextSummary);
				setLiveAt(new Date().toISOString());
				const unresolvedCount = nextEvaluations.filter(
					(e) => !e.resolved,
				).length;
				setEvaluateNotice(
					unresolvedCount
						? `Пересчитано по плану: ${nextEvaluations.length} срабатываний, ${unresolvedCount} требуют внимания.`
						: `Пересчитано по плану: активных предупреждений нет (${nextEvaluations.length} проверок).`,
				);
			} finally {
				setEvaluating(false);
			}
		},
		[auth, dashboard, patientId],
	);

	const liveControls = patientId ? (
		<div
			className="clinical-rule-live-controls"
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: "0.5rem",
				alignItems: "center",
				marginBottom: context === "visit" ? "0.75rem" : "1rem",
			}}
			data-testid="clinical-rule-live-controls"
		>
			<button
				type="button"
				className="secondary-button"
				disabled={evaluating}
				onClick={() => void runLiveEvaluate(false)}
				aria-label="Пересчитать клинические правила по текущему плану лечения"
			>
				<RefreshCw aria-hidden="true" size={16} />
				{evaluating ? "Считаем…" : "Пересчитать по плану"}
			</button>
			{context === "visit" ? (
				<button
					type="button"
					className="secondary-button"
					disabled={evaluating}
					onClick={() => void runLiveEvaluate(true)}
					aria-label="Проверить план с остановкой на блокирующих правилах"
					title="Если есть блокирующее противопоказание — покажем его отдельно"
				>
					{evaluating ? "Считаем…" : "Проверить с блокировкой"}
				</button>
			) : null}
			{planContext && !planContext.serviceIds.length ? (
				<span className="ops-note">В плане пока нет услуг для проверки.</span>
			) : null}
			{liveAt ? (
				<span className="ops-note">
					Живой пересчёт:{" "}
					{new Date(liveAt).toLocaleTimeString("ru-RU", {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</span>
			) : (
				<span className="ops-note">
					Показан снимок смены — нажмите «Пересчитать по плану».
				</span>
			)}
		</div>
	) : null;

	const liveFeedback = (
		<>
			{evaluateError ? (
				<div
					className="ops-notice ops-notice--error"
					role="alert"
					style={{ marginBottom: "0.75rem" }}
				>
					{evaluateError}
				</div>
			) : null}
			{evaluateNotice ? (
				<div
					className="ops-notice"
					role="status"
					style={{ marginBottom: "0.75rem" }}
				>
					{evaluateNotice}
				</div>
			) : null}
		</>
	);

	const evaluationCardsVisit = visibleEvaluations.length ? (
		<div className="clinical-rule-grid">
			{visibleEvaluations.map((evaluation) => (
				<details
					className={`clinical-rule-card clinical-rule-quick severity-${evaluation.severity} ${evaluation.resolved ? "resolved" : ""}`}
					key={evaluation.id}
				>
					<summary>
						<AlertTriangle aria-hidden="true" />
						<div>
							<span>
								{severityLabels[evaluation.severity]} ·{" "}
								{staffRoleLabels[evaluation.ownerRole]}
							</span>
							<h3>{evaluation.title}</h3>
							<p>{primaryRuleAction(evaluation)}</p>
						</div>
					</summary>
					<div className="clinical-rule-detail">
						<p>{evaluation.message}</p>
						{evaluation.missingRequiredServiceIds.length ? (
							<small>
								Добавить:{" "}
								{evaluation.missingRequiredServiceIds
									.map(serviceTitle)
									.join(", ")}
							</small>
						) : null}
						{evaluation.missingCompletedServiceIds.length ? (
							<small>
								Сначала завершить:{" "}
								{evaluation.missingCompletedServiceIds
									.map(serviceTitle)
									.join(", ")}
							</small>
						) : null}
						{evaluation.blockedServiceIds.length ? (
							<small>
								Проверьте перед планированием:{" "}
								{evaluation.blockedServiceIds.map(serviceTitle).join(", ")}
							</small>
						) : null}
						<em>{evaluation.patientMessage}</em>
					</div>
				</details>
			))}
		</div>
	) : (
		<p className="clinical-rule-empty">{emptyMessage}</p>
	);

	const evaluationCardsFinance = visibleEvaluations.length ? (
		<div className="clinical-rule-grid">
			{visibleEvaluations.map((evaluation) => (
				<article
					className={`clinical-rule-card severity-${evaluation.severity} ${evaluation.resolved ? "resolved" : ""}`}
					key={evaluation.id}
				>
					<AlertTriangle aria-hidden="true" />
					<div>
						<span>
							{severityLabels[evaluation.severity]} ·{" "}
							{actionLabels[evaluation.action]} ·{" "}
							{staffRoleLabels[evaluation.ownerRole]}
						</span>
						<h3>{evaluation.title}</h3>
						<p>{evaluation.message}</p>
						{evaluation.missingRequiredServiceIds.length ? (
							<small>
								Добавить:{" "}
								{evaluation.missingRequiredServiceIds
									.map(serviceTitle)
									.join(", ")}
							</small>
						) : null}
						{evaluation.missingCompletedServiceIds.length ? (
							<small>
								Сначала завершить:{" "}
								{evaluation.missingCompletedServiceIds
									.map(serviceTitle)
									.join(", ")}
							</small>
						) : null}
						{evaluation.blockedServiceIds.length ? (
							<small>
								Проверьте перед планированием:{" "}
								{evaluation.blockedServiceIds.map(serviceTitle).join(", ")}
							</small>
						) : null}
						<em>{evaluation.patientMessage}</em>
					</div>
				</article>
			))}
		</div>
	) : (
		<p className="clinical-rule-empty">{emptyMessage}</p>
	);

	if (context === "visit") {
		return (
			<details
				className="clinical-rule-panel clinical-rule-panel-compact"
				aria-label="Клинические предупреждения"
				data-testid="clinical-rule-panel"
			>
				<summary className="clinical-rule-summary">
					<AlertTriangle aria-hidden="true" />
					<div>
						<h3>Клинические предупреждения</h3>
						<p>
							{displaySummary.unresolved} требуют внимания ·{" "}
							{displaySummary.coveredRules} закрыты
						</p>
					</div>
					<span
						className={
							displaySummary.unresolved
								? "status-pill status-planned"
								: "status-pill status-confirmed"
						}
					>
						{displaySummary.unresolved} предупр.
					</span>
				</summary>
				{liveControls}
				{liveFeedback}
				{evaluationCardsVisit}
				{sourceEvaluations.length > visibleEvaluations.length ? (
					<p className="clinical-rule-more">
						Еще {sourceEvaluations.length - visibleEvaluations.length} пунктов
						доступны в полном списке оплаты и настроек.
					</p>
				) : null}
			</details>
		);
	}

	return (
		<section
			className="clinical-rule-panel"
			aria-label="Клинические правила"
			data-testid="clinical-rule-panel"
		>
			<div className="panel-heading">
				<div>
					<h3>Клинические правила</h3>
					<p>
						{displaySummary.unresolved} требуют внимания ·{" "}
						{displaySummary.coveredRules} закрыты
					</p>
				</div>
				<span
					className={
						displaySummary.unresolved
							? "status-pill status-planned"
							: "status-pill status-confirmed"
					}
				>
					{displaySummary.unresolved} предупр.
				</span>
			</div>
			{liveControls}
			{liveFeedback}
			{evaluationCardsFinance}
		</section>
	);
}
