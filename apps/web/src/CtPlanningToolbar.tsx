import type { DicomViewerToolStateBundleResponse } from "@dental/shared";
import { useMemo } from "react";
import type {
	CtPlanningArtifactCommand,
	CtPlanningArtifactCommandState,
} from "./ctPlanningArtifactCommands";
import {
	type CtImplantLibraryItem,
	type CtPlanningQuickAction,
	ctImplantLibrary,
	ctPlanningMetrics,
	ctPlanningQuickActions,
	ctPlanningTools,
} from "./ctPlanningCatalog";
import type { CtPlanningExportPacket } from "./ctPlanningExport";
import {
	buildCtPlanningExportScenarioSummary,
	type CtPlanningExportScenarioArtifact,
	type CtPlanningExportScenarioSummary,
} from "./ctPlanningExportScenarioSummary";
import type { CtPlanningImplantFitPlan } from "./ctPlanningImplantFit";
import type {
	CtPlanningImplantModelPlan,
	CtPlanningLocal3DReadinessPlan,
} from "./ctPlanningImplantModel";
import type { CtPlanningMeasurementPlan } from "./ctPlanningMeasurementPlan";
import type { CtPlanningReconstructionPlan } from "./ctPlanningReconstruction";
import {
	buildCtPlanningReport,
	type CtPlanningReport,
} from "./ctPlanningReport";
import type { CtPlanningTaskSnapshot } from "./ctPlanningState";
import type { CtPlanningValidationSummary } from "./ctPlanningValidation";
import type { CtPlanningWorkflowPlan } from "./ctPlanningWorkflowPlan";

type CtPlanningArtifactPanelProps = {
	commands: CtPlanningArtifactCommandState[];
	onCreateArtifact?: (command: CtPlanningArtifactCommand) => void;
};

export function CtPlanningArtifactPanel({
	commands,
	onCreateArtifact,
}: CtPlanningArtifactPanelProps) {
	const readyCount = commands.filter((item) => item.status === "ready").length;
	const draftCount = commands.reduce((sum, item) => sum + item.draftCount, 0);
	const blockedCount = commands.filter(
		(item) => item.status === "blocked",
	).length;

	return (
		<div
			className="ct-planning-artifact-board"
			data-testid="ct-planning-artifact-board"
			aria-label="Создание разметок КТ-плана"
		>
			<article className="ct-planning-artifact-summary">
				<span>Разметки плана</span>
				<strong>
					{readyCount}/{commands.length} типов
				</strong>
				<p>
					{blockedCount > 0
						? "Часть разметок ждет готовую серию или выбранный имплант."
						: draftCount > 0
							? "Есть незавершенные разметки; добавьте точки в режиме КТ-срезов."
							: "Можно фиксировать клинические разметки как структурные данные."}
				</p>
			</article>
			<div className="ct-planning-artifact-grid">
				{commands.map((item) => (
					<article
						className={`ct-planning-artifact-card ${item.status}`}
						key={item.command.id}
					>
						<span>{item.statusLabel}</span>
						<strong>{item.command.title}</strong>
						<p>{item.command.detail}</p>
						<small>{item.blocker ?? item.command.result}</small>
						<button
							type="button"
							disabled={item.status === "blocked" || !onCreateArtifact}
							onClick={() => onCreateArtifact?.(item.command)}
							aria-label={`${item.actionLabel}: ${item.command.title}`}
						>
							{item.actionLabel}
						</button>
					</article>
				))}
			</div>
		</div>
	);
}

type CtPlanningExportPanelProps = {
	packet: CtPlanningExportPacket;
	implantFitPlan?: CtPlanningImplantFitPlan;
	scenarioArtifacts?: CtPlanningExportScenarioArtifact[];
};

type CtPlanningReleaseGate = {
	tone: CtPlanningExportPacket["status"];
	title: string;
	detail: string;
	action: string;
};

type CtPlanningImplantFitHandoff = CtPlanningReleaseGate & {
	value: string;
};

const exportOwnerLabels: Record<
	CtPlanningExportPacket["lanes"][number]["owner"],
	string
> = {
	doctor: "врач",
	admin: "админ",
	lab: "лаборатория",
};

function buildReleaseGate(
	packet: CtPlanningExportPacket,
): CtPlanningReleaseGate {
	const blockedFact = packet.clinicalFacts.find(
		(fact) => fact.tone === "blocked",
	);
	const warningFact = packet.clinicalFacts.find(
		(fact) => fact.tone === "warning",
	);
	const missingArtifact = packet.missingArtifacts[0];
	const scenario = packet.activeScenarioSummary;
	if (scenario?.status === "blocked") {
		return {
			tone: "blocked",
			title: "Сценарий заблокирован",
			detail: `${scenario.title}: ${scenario.detail}`,
			action: scenario.nextAction,
		};
	}
	if (scenario?.status === "warning" && packet.status !== "blocked") {
		return {
			tone: "warning",
			title: "Сначала закрыть сценарий",
			detail: `${scenario.title}: ${scenario.detail}`,
			action: scenario.nextAction,
		};
	}
	if (packet.status === "ready") {
		return {
			tone: "ready",
			title: "Можно фиксировать",
			detail: "Критические проверки закрыты, пакет можно привязать к приему.",
			action: "Сохранить пакет плана и передать по маршруту.",
		};
	}
	if (packet.status === "warning") {
		return {
			tone: "warning",
			title: "Только черновик",
			detail: warningFact
				? `${warningFact.title}: ${warningFact.value}`
				: (missingArtifact ?? "Есть незакрытые пункты плана."),
			action: packet.nextAction,
		};
	}
	return {
		tone: "blocked",
		title: "Передача заблокирована",
		detail: blockedFact
			? `${blockedFact.title}: ${blockedFact.value}`
			: (missingArtifact ??
				"Нет переносимого состояния или есть клинический блокер."),
		action: packet.nextAction,
	};
}

function buildImplantFitHandoff(
	plan: CtPlanningImplantFitPlan,
): CtPlanningImplantFitHandoff {
	const candidate =
		plan.candidates.find((item) => item.id === plan.selectedCandidateId) ??
		plan.candidates[0] ??
		null;
	if (!candidate) {
		return {
			tone:
				plan.status === "ready"
					? "ready"
					: plan.status === "blocked"
						? "blocked"
						: "warning",
			title: "Типоразмер не выбран",
			value: `${plan.score}%`,
			detail:
				plan.warnings[0] ?? "Нужно сверить библиотеку имплантов с линейками.",
			action: "Выбрать типоразмер после ширины, высоты и канала.",
		};
	}
	return {
		tone:
			candidate.status === "ready"
				? "ready"
				: candidate.status === "blocked"
					? "blocked"
					: "warning",
		title: candidate.selected ? "Выбранный типоразмер" : "Кандидат для сверки",
		value: `${candidate.sizeLabel} · ${candidate.score}%`,
		detail: candidate.decisionReasons.join(" · "),
		action: candidate.nextAction,
	};
}

function downloadCtPlanningReport(
	body: string,
	type: string,
	fileName: string,
) {
	const blob = new Blob([body], { type });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function printCtPlanningReport(report: CtPlanningReport) {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		downloadCtPlanningReport(
			report.text,
			"text/plain;charset=utf-8",
			report.textFileName,
		);
		return;
	}
	printWindow.opener = null;
	printWindow.document.write(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>DENTE CT planning report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      pre { white-space: pre-wrap; font: 14px/1.5 Arial, sans-serif; }
    </style>
  </head>
  <body>
    <pre>${escapeHtml(report.text)}</pre>
  </body>
</html>`);
	printWindow.document.close();
	printWindow.focus();
	printWindow.print();
}

export function CtPlanningExportPanel({
	packet,
	implantFitPlan,
	scenarioArtifacts = [],
}: CtPlanningExportPanelProps) {
	const report = useMemo(() => buildCtPlanningReport(packet), [packet]);
	const releaseGate = buildReleaseGate(packet);
	const implantFitHandoff = implantFitPlan
		? buildImplantFitHandoff(implantFitPlan)
		: null;
	return (
		<div
			className="ct-planning-export-board"
			data-testid="ct-planning-export-board"
			aria-label="Пакет передачи КТ-плана"
		>
			<article className={`ct-planning-export-summary ${packet.status}`}>
				<span>Пакет КТ-плана</span>
				<strong>
					{packet.score}% · {packet.title}
				</strong>
				<p>{packet.handoffSummary}</p>
				<small>{packet.nextAction}</small>
				<div
					className="ct-planning-export-actions"
					aria-label="Действия с отчетом КТ-плана"
				>
					<button
						className="text-button"
						type="button"
						onClick={() => printCtPlanningReport(report)}
						aria-label="Печать текстового отчета КТ-плана"
					>
						Печать отчета
					</button>
					<button
						className="text-button"
						type="button"
						onClick={() =>
							downloadCtPlanningReport(
								report.text,
								"text/plain;charset=utf-8",
								report.textFileName,
							)
						}
						aria-label="Скачать текстовый отчет КТ-плана"
					>
						Скачать текст
					</button>
					<button
						className="text-button"
						type="button"
						onClick={() =>
							downloadCtPlanningReport(
								JSON.stringify(report.sidecar, null, 2),
								"application/json;charset=utf-8",
								report.jsonFileName,
							)
						}
						aria-label="Скачать JSON-сводку КТ-плана"
					>
						Скачать JSON
					</button>
				</div>
			</article>
			<article
				className={`ct-planning-export-release ${releaseGate.tone}`}
				data-testid="ct-planning-export-release"
				aria-label="Контроль передачи КТ-плана"
			>
				<span>Контроль передачи</span>
				<strong>{releaseGate.title}</strong>
				<p>{releaseGate.detail}</p>
				<small>{releaseGate.action}</small>
			</article>
			<CtPlanningExportScenarioPanel
				packet={packet}
				artifacts={scenarioArtifacts}
			/>
			{implantFitHandoff ? (
				<article
					className={`ct-planning-export-fit ${implantFitHandoff.tone}`}
					data-testid="ct-planning-export-fit"
					aria-label="Скрининг типоразмера в пакете передачи"
				>
					<span>{implantFitHandoff.title}</span>
					<strong>{implantFitHandoff.value}</strong>
					<p>{implantFitHandoff.detail}</p>
					<small>{implantFitHandoff.action}</small>
				</article>
			) : null}
			<div
				className="ct-planning-export-facts"
				aria-label="Ключевые факты КТ-плана"
			>
				{packet.clinicalFacts.map((fact) => (
					<article
						className={`ct-planning-export-fact ${fact.tone}`}
						key={fact.id}
					>
						<span>{fact.title}</span>
						<strong>{fact.value}</strong>
						<p>{fact.detail}</p>
					</article>
				))}
			</div>
			<div className="ct-planning-export-lanes">
				{packet.lanes.map((lane) => (
					<article
						className={`ct-planning-export-card ${lane.status}`}
						key={lane.id}
					>
						<span>{exportOwnerLabels[lane.owner]}</span>
						<strong>{lane.title}</strong>
						<b>{lane.value}</b>
						<p>{lane.detail}</p>
						<small>{lane.nextAction}</small>
					</article>
				))}
			</div>
			{packet.missingArtifacts.length > 0 ? (
				<div
					className="ct-planning-export-missing"
					aria-label="Чего не хватает для передачи КТ-плана"
				>
					<span>Не хватает</span>
					<p>{packet.missingArtifacts.join(" · ")}</p>
				</div>
			) : null}
		</div>
	);
}

type CtPlanningExportScenarioPanelProps = {
	packet: CtPlanningExportPacket;
	artifacts?: CtPlanningExportScenarioArtifact[];
};

function scenarioIssueLabel(
	status: CtPlanningExportScenarioArtifact["status"],
) {
	if (status === "blocked") return "требует действия";
	if (status === "draft") return "черновик";
	return "готово";
}

function scenarioPanelArtifacts(
	summary: CtPlanningExportScenarioSummary,
	artifacts: CtPlanningExportScenarioArtifact[],
): CtPlanningExportScenarioArtifact[] {
	if (artifacts.length > 0) return artifacts;
	return [...summary.blockedArtifacts, ...summary.draftArtifacts].map(
		(artifact) => ({
			id: artifact.id,
			title: artifact.title,
			status: artifact.status,
			statusLabel: scenarioIssueLabel(artifact.status),
			blocker: artifact.blocker,
		}),
	);
}

export function CtPlanningExportScenarioPanel({
	packet,
	artifacts = [],
}: CtPlanningExportScenarioPanelProps) {
	const summary =
		packet.activeScenarioSummary ??
		buildCtPlanningExportScenarioSummary(packet, artifacts);
	if (!summary) return null;
	const displayArtifacts = scenarioPanelArtifacts(summary, artifacts);
	return (
		<article
			className={`ct-planning-export-focus ${summary.status}`}
			data-testid="ct-planning-export-focus"
			{...summary.bridge.attrs}
			aria-label="Текущий сценарий в пакете передачи КТ-плана"
		>
			<span>Текущий сценарий</span>
			<strong>{summary.title}</strong>
			<p>{summary.detail}</p>
			<small>
				{summary.route.ownerLabel}
				{" \u00b7 "}
				{summary.route.deliverable}
				{" \u00b7 "}
				{summary.route.confirmation}
			</small>
			<small>
				{summary.viewer.viewLabel}
				{" \u00b7 "}
				{summary.viewer.windowLabel}
				{" \u00b7 "}
				{summary.viewer.slabMm} мм
				{summary.viewer.requiresVolume ? "" : " · без объема"}
			</small>
			<small data-testid="ct-planning-viewer-bridge">
				{summary.bridge.label}
			</small>
			{displayArtifacts.length > 0 ? (
				<div
					className="ct-planning-export-scenario-artifacts"
					data-testid="ct-planning-export-scenario-artifacts"
				>
					{displayArtifacts.map((artifact) => (
						<em className={artifact.status} key={artifact.id}>
							{artifact.title}: {artifact.statusLabel}
						</em>
					))}
				</div>
			) : null}
			<small>{summary.nextAction}</small>
		</article>
	);
}

export type CtPlanningGeometryGridPanelProps = {
	planningSnapshot: CtPlanningTaskSnapshot;
};

export function CtPlanningGeometryGridPanel({
	planningSnapshot,
}: CtPlanningGeometryGridPanelProps) {
	if (planningSnapshot.geometrySummary.metrics.length === 0) {
		return null;
	}
	return (
		<div
			className="ct-planning-geometry-grid"
			data-testid="ct-planning-geometry-grid"
			aria-label="Расчетные измерения КТ-плана"
		>
			{planningSnapshot.geometrySummary.metrics.map((metric) => (
				<article
					className={`ct-planning-geometry-card ${metric.tone}`}
					key={metric.id}
				>
					<span>{metric.title}</span>
					<strong>{metric.valueLabel}</strong>
					<p>{metric.detail}</p>
					<small>{metric.source}</small>
				</article>
			))}
		</div>
	);
}

type CtPlanningImplantFitPanelProps = {
	plan: CtPlanningImplantFitPlan;
};

function marginLabel(value: number | null) {
	return value === null ? "нет" : `${value} мм`;
}

function sourceLabel(value: CtPlanningImplantFitPlan["widthSource"]) {
	if (value === "typed") return "подписана";
	if (value === "fallback") return "черновик";
	return "нет";
}

function fitStatusLabel(value: CtPlanningImplantFitPlan["status"]) {
	if (value === "ready") return "готов";
	if (value === "blocked") return "блокер";
	return "черновик";
}

export function CtPlanningImplantFitPanel({
	plan,
}: CtPlanningImplantFitPanelProps) {
	return (
		<section
			className="ct-planning-implant-fit-board"
			data-testid="ct-planning-implant-fit-board"
			aria-label="Скрининг типоразмера импланта по КТ-измерениям"
		>
			<article className={`ct-planning-implant-fit-summary ${plan.status}`}>
				<span>Скрининг библиотеки</span>
				<strong>{plan.score}%</strong>
				<p>{plan.summaryLabel}</p>
				<small>
					ширина {marginLabel(plan.ridgeWidthMm)} (
					{sourceLabel(plan.widthSource)}) · высота{" "}
					{marginLabel(plan.boneHeightMm)} ({sourceLabel(plan.heightSource)}) ·
					роли {plan.measurementRoleCount}/{plan.measurementSourceCount}
				</small>
			</article>
			<div className="ct-planning-implant-fit-grid">
				{plan.candidates.map((candidate) => (
					<article
						className={`ct-planning-implant-fit-card ${candidate.status} ${candidate.selected ? "selected" : ""}`}
						key={candidate.id}
					>
						<span>
							{candidate.selected ? "выбран" : fitStatusLabel(candidate.status)}
						</span>
						<strong>{candidate.sizeLabel}</strong>
						<p>{candidate.title}</p>
						<small>
							диам. {marginLabel(candidate.diameterMarginMm)} · длина{" "}
							{marginLabel(candidate.lengthMarginMm)} · канал{" "}
							{marginLabel(candidate.canalMarginMm)}
						</small>
						<div
							className="ct-planning-implant-fit-reasons"
							aria-label="Причины решения по типоразмеру"
						>
							{candidate.decisionReasons.map((reason) => (
								<em key={reason}>{reason}</em>
							))}
						</div>
						<p>{candidate.nextAction}</p>
					</article>
				))}
			</div>
			{plan.warnings.length > 0 ? (
				<div
					className="ct-planning-implant-fit-warnings"
					aria-label="Ограничения скрининга типоразмера импланта"
				>
					<span>Ограничения</span>
					<p>{plan.warnings.join(" · ")}</p>
				</div>
			) : null}
		</section>
	);
}

export type CtPlanningImplantLibraryPanelProps = {
	effectiveSelectedImplantId: string;
	setLocalSelectedImplantId: (id: string) => void;
	onSelectImplant?: ((implant: CtImplantLibraryItem) => void) | undefined;
};

export function CtPlanningImplantLibraryPanel({
	effectiveSelectedImplantId,
	setLocalSelectedImplantId,
	onSelectImplant,
}: CtPlanningImplantLibraryPanelProps) {
	return (
		<div
			className="ct-implant-library-strip"
			data-testid="ct-implant-library-strip"
			aria-label="Библиотека имплантов для КТ-планирования"
		>
			<div className="ct-implant-library-head">
				<strong>Библиотека имплантов</strong>
				<span>
					Универсальные типоразмеры; брендовые каталоги подключаются отдельно.
				</span>
			</div>
			<div className="ct-implant-library-grid">
				{ctImplantLibrary.map((implant) => (
					<button
						className={`ct-implant-library-card ${effectiveSelectedImplantId === implant.id ? "selected" : ""}`}
						key={implant.id}
						type="button"
						onClick={() => {
							setLocalSelectedImplantId(implant.id);
							onSelectImplant?.(implant);
						}}
						aria-pressed={effectiveSelectedImplantId === implant.id}
						aria-label={`Выбрать имплант ${implant.diameterMm} на ${implant.lengthMm} мм: ${implant.indication}`}
					>
						<span>{implant.system}</span>
						<strong>
							{implant.diameterMm} x {implant.lengthMm} мм
						</strong>
						<p>
							{implant.line} · {implant.platform}
						</p>
						<small>{implant.indication}</small>
					</button>
				))}
			</div>
		</div>
	);
}

type CtPlanningImplantModelPanelProps = {
	plan: CtPlanningImplantModelPlan;
	local3DReadinessPlan?: CtPlanningLocal3DReadinessPlan | null;
};

function buildLocal3DOperatorSummary(plan: CtPlanningLocal3DReadinessPlan) {
	const readyCount = plan.cards.filter(
		(card) => card.status === "ready",
	).length;
	const draftCards = plan.cards.filter((card) => card.status === "draft");
	const blockedCards = plan.cards.filter((card) => card.status === "blocked");
	const bridgeCards = plan.cards.filter((card) => card.requiresLocalBridge);
	const blockedTitles = blockedCards.map((card) => card.title).join(", ");
	const bridgeTitles = bridgeCards.map((card) => card.title).join(", ");
	const totalCount = plan.cards.length;

	if (blockedCards.length > 0) {
		return {
			status: "blocked" as const,
			value: `готово ${readyCount}/${totalCount}`,
			detail: `Проверьте модельные файлы кейса: ${blockedTitles}.`,
			nextAction:
				"CRM хранит только метаданные; поверхности, дуги, скан-боди и шаблон открываются вне браузера.",
		};
	}

	if (draftCards.length > 0) {
		return {
			status: "draft" as const,
			value: `готово ${readyCount}/${totalCount}`,
			detail:
				bridgeCards.length > 0
					? `Нужен доступный локальный 3D-модуль для: ${bridgeTitles}.`
					: "Кейс можно оставить как метаданные до лабораторной сверки.",
			nextAction:
				"Перед передачей в лабораторию подтвердите локальный 3D-модуль или внешний просмотр.",
		};
	}

	return {
		status: "ready" as const,
		value: `готово ${readyCount}/${totalCount}`,
		detail:
			bridgeCards.length > 0
				? "Локальный 3D-модуль подтвержден для нужных поверхностей."
				: "Метаданные поверхностей и дуг готовы для лабораторного маршрута.",
		nextAction:
			"Передайте лаборатории пакет готовности; CAD/STL выпускается вне CRM.",
	};
}

export function CtPlanningImplantModelPanel({
	plan,
	local3DReadinessPlan = null,
}: CtPlanningImplantModelPanelProps) {
	const local3DOperatorSummary = local3DReadinessPlan
		? buildLocal3DOperatorSummary(local3DReadinessPlan)
		: null;

	return (
		<div
			className="ct-planning-implant-board"
			data-testid="ct-planning-implant-board"
			aria-label="Моделирование импланта и хирургической втулки"
		>
			<article className={`ct-planning-implant-summary ${plan.status}`}>
				<span>Модель импланта</span>
				<strong>
					{plan.implantDiameterMm !== null && plan.implantLengthMm !== null
						? `${plan.implantDiameterMm} x ${plan.implantLengthMm} мм`
						: "нужен размер"}
				</strong>
				<p>
					{plan.hasAxis
						? `Апекс: ${plan.apexPointLabel}.`
						: "Выберите типоразмер и поставьте ось двумя точками."}
				</p>
				<small>{plan.modelingLabel}</small>
			</article>
			<div className="ct-planning-implant-grid">
				{plan.cards.map((card) => (
					<article
						className={`ct-planning-implant-card ${card.status}`}
						key={card.id}
					>
						<span>{card.title}</span>
						<strong>{card.value}</strong>
						<p>{card.detail}</p>
						<small>{card.nextAction}</small>
					</article>
				))}
			</div>
			{plan.warnings.length > 0 ? (
				<div
					className="ct-planning-implant-warnings"
					aria-label="Предупреждения по модели импланта"
				>
					<span>Контроль</span>
					<p>{plan.warnings.join(" · ")}</p>
				</div>
			) : null}
			{local3DReadinessPlan ? (
				<section
					className="ct-planning-implant-board ct-planning-local-3d-readiness"
					data-testid="ct-planning-local-3d-readiness"
					aria-label="Локальная 3D-готовность КТ-планирования"
				>
					<article className="ct-planning-implant-summary draft">
						<span>Локальный 3D-кейс</span>
						<strong>{local3DReadinessPlan.recommendedTargetLabel}</strong>
						<p>{local3DReadinessPlan.outputBoundarySummary}</p>
						<small>{local3DReadinessPlan.bridgeStatusLabel}</small>
					</article>
					<div className="ct-planning-implant-grid">
						{local3DOperatorSummary ? (
							<article
								className={`ct-planning-implant-card ${local3DOperatorSummary.status}`}
								data-testid="ct-planning-local-3d-next-action"
							>
								<span>Действие врача/лаборатории</span>
								<strong>{local3DOperatorSummary.value}</strong>
								<p>{local3DOperatorSummary.detail}</p>
								<small>{local3DOperatorSummary.nextAction}</small>
							</article>
						) : null}
						{local3DReadinessPlan.cards.map((card) => (
							<article
								className={`ct-planning-implant-card ${card.status}`}
								key={card.id}
								data-local-3d-role={card.id}
							>
								<span>{card.title}</span>
								<strong>{card.value}</strong>
								<p>{card.detail}</p>
								<small>{card.nextAction}</small>
							</article>
						))}
					</div>
					<div
						className="ct-planning-implant-warnings"
						aria-label="Граница локального 3D-кейса"
					>
						<span>Метаданные</span>
						<p>
							{local3DReadinessPlan.warnings.length
								? local3DReadinessPlan.warnings.join(" · ")
								: local3DReadinessPlan.nextAction}
						</p>
					</div>
				</section>
			) : null}
		</div>
	);
}

type CtPlanningMeasurementPanelProps = {
	plan: CtPlanningMeasurementPlan;
};

export function CtPlanningMeasurementPanel({
	plan,
}: CtPlanningMeasurementPanelProps) {
	return (
		<section
			className="ct-planning-measurement-board"
			data-testid="ct-planning-measurement-board"
			aria-label="Карта измерений КТ-плана"
		>
			<article className={`ct-planning-measurement-summary ${plan.status}`}>
				<span>Карта измерений</span>
				<strong>{plan.score}%</strong>
				<p>{plan.summaryLabel}</p>
				<small>
					Контуры {plan.roiAreaTotalLabel} / {plan.roiVolumeTotalLabel} ·
					плотность {plan.densityValueCount}/{plan.densityProbeCount}
				</small>
				<small>{plan.densityProtocolLabel}</small>
				<small>
					ширина/высота {plan.ridgeWidthCount}/{plan.boneHeightCount} · отступ{" "}
					{plan.clearanceRoleCount}
				</small>
			</article>
			<div className="ct-planning-measurement-grid">
				{plan.cards.map((card) => (
					<article
						className={`ct-planning-measurement-card ${card.status}`}
						key={card.id}
					>
						<span>{card.title}</span>
						<strong>{card.value}</strong>
						<p>{card.detail}</p>
						<small>{card.nextAction}</small>
					</article>
				))}
			</div>
			{plan.warnings.length > 0 ? (
				<div
					className="ct-planning-measurement-warnings"
					aria-label="Предупреждения по измерениям КТ"
				>
					{plan.warnings.map((warning) => (
						<span key={warning}>{warning}</span>
					))}
				</div>
			) : null}
		</section>
	);
}

export type CtPlanningMetricGridPanelProps = {
	canPlan: boolean;
};

export function CtPlanningMetricGridPanel({
	canPlan,
}: CtPlanningMetricGridPanelProps) {
	return (
		<div
			className="ct-planning-metric-grid"
			data-testid="ct-planning-metric-grid"
			aria-label="Измерения КТ-плана"
		>
			{ctPlanningMetrics.map((metric) => (
				<article className={canPlan ? "ready" : "locked"} key={metric.id}>
					<span>{metric.title}</span>
					<strong>{metric.value}</strong>
					<p>{metric.clinicalUse}</p>
					<small>{metric.source}</small>
				</article>
			))}
		</div>
	);
}

export type CtPlanningPlanBoardPanelProps = {
	canPlan: boolean;
	selectedImplant: CtImplantLibraryItem | null;
	activeQuickAction: CtPlanningQuickAction | null;
	activeActionArtifactStates: CtPlanningArtifactCommandState[];
	activeActionNextArtifact: CtPlanningArtifactCommandState | null;
	onCreateArtifact?: ((command: CtPlanningArtifactCommand) => void) | undefined;
	toolStateBundle: DicomViewerToolStateBundleResponse | null;
	bundleSummary: string;
};

const toolStateTargetLabels: Record<
	DicomViewerToolStateBundleResponse["target"],
	string
> = {
	cornerstone3d: "просмотрщик КТ",
	ohif: "OHIF",
	generic_json: "пакет состояния",
	external_viewer: "внешний просмотр",
};

export function CtPlanningPlanBoardPanel({
	canPlan,
	selectedImplant,
	activeQuickAction,
	activeActionArtifactStates,
	activeActionNextArtifact,
	onCreateArtifact,
	toolStateBundle,
	bundleSummary,
}: CtPlanningPlanBoardPanelProps) {
	const readyToolCount = ctPlanningTools.filter(
		(tool) => !tool.requiresVolume || canPlan,
	).length;

	return (
		<div
			className="ct-planning-plan-board"
			data-testid="ct-planning-plan-board"
			aria-label="Текущий КТ-план"
		>
			<article>
				<span>Инструменты</span>
				<strong>
					{readyToolCount}/{ctPlanningTools.length}
				</strong>
				<p>
					{canPlan
						? "Объемные инструменты доступны."
						: "Открыт справочник и план."}
				</p>
			</article>
			<article>
				<span>Имплант</span>
				<strong>
					{selectedImplant
						? `${selectedImplant.diameterMm} x ${selectedImplant.lengthMm} мм`
						: "не выбран"}
				</strong>
				<p>
					{selectedImplant
						? `${selectedImplant.line}, ${selectedImplant.platform}`
						: "Выберите типоразмер из библиотеки."}
				</p>
			</article>
			<article>
				<span>Действие</span>
				<strong>{activeQuickAction?.title ?? "не выбрано"}</strong>
				<p>
					{activeQuickAction
						? activeQuickAction.detail
						: "Выберите сценарий плоскости и инструмента."}
				</p>
				{activeActionArtifactStates.length > 0 ? (
					<div
						className="ct-planning-active-action-artifacts"
						data-testid="ct-planning-active-action-artifacts"
					>
						<div className="ct-planning-active-artifact-chips">
							{activeActionArtifactStates.map((item) => (
								<em className={item.status} key={item.command.id}>
									{item.command.title}: {item.statusLabel}
								</em>
							))}
						</div>
						{activeActionNextArtifact ? (
							<button
								type="button"
								disabled={
									activeActionNextArtifact.status === "blocked" ||
									!onCreateArtifact
								}
								onClick={() =>
									onCreateArtifact?.(activeActionNextArtifact.command)
								}
								aria-label={`${activeActionNextArtifact.actionLabel}: ${activeActionNextArtifact.command.title}`}
							>
								{activeActionNextArtifact.actionLabel}:{" "}
								{activeActionNextArtifact.command.title}
							</button>
						) : null}
					</div>
				) : null}
			</article>
			<article>
				<span>Пакет</span>
				<strong>
					{toolStateBundle
						? toolStateTargetLabels[toolStateBundle.target]
						: "не собран"}
				</strong>
				<p>{bundleSummary}</p>
			</article>
		</div>
	);
}

export type CtPlanningQuickActionsPanelProps = {
	canPlan: boolean;
	activeQuickActionId: string | null;
	onActivateTool?: ((action: CtPlanningQuickAction) => void) | undefined;
};

export function CtPlanningQuickActionsPanel({
	canPlan,
	activeQuickActionId,
	onActivateTool,
}: CtPlanningQuickActionsPanelProps) {
	return (
		<div
			className="ct-planning-quick-actions"
			data-testid="ct-planning-quick-actions"
			aria-label="Быстрые сценарии КТ-планирования"
		>
			{ctPlanningQuickActions.map((action) => {
				const locked = action.requiresVolume && !canPlan;
				const selected = activeQuickActionId === action.id;
				return (
					<button
						className={`ct-planning-quick-action ${selected ? "selected" : ""} ${locked ? "locked" : "ready"}`}
						key={action.id}
						type="button"
						disabled={locked || !onActivateTool}
						onClick={() => onActivateTool?.(action)}
						aria-pressed={selected}
						title={
							locked ? "Сначала выберите готовую КЛКТ/КТ-серию" : action.detail
						}
					>
						<span>{action.title}</span>
						<strong>{action.toolLabel}</strong>
						<small>
							{locked
								? "нужна КТ-серия"
								: `${action.viewLabel} · ${action.slabMm} мм`}
						</small>
					</button>
				);
			})}
		</div>
	);
}

type CtPlanningReconstructionPanelProps = {
	plan: CtPlanningReconstructionPlan;
};

export function CtPlanningReconstructionPanel({
	plan,
}: CtPlanningReconstructionPanelProps) {
	return (
		<div
			className="ct-planning-reconstruction-board"
			data-testid="ct-planning-reconstruction-board"
			aria-label="Построение ОПТГ и поперечных КТ-срезов"
		>
			<article className={`ct-planning-reconstruction-summary ${plan.status}`}>
				<span>ОПТГ и срезы</span>
				<strong>
					{plan.crossSectionCount > 0
						? `${plan.crossSectionCount} срезов`
						: "нужна дуга"}
				</strong>
				<p>
					{plan.curveLengthMm === null
						? "План реконструкции появится после разметки дуги."
						: `Дуга ${plan.curveLengthMm} мм, шаг ${plan.crossSectionStepMm} мм, слой ${plan.slabMm} мм.`}
				</p>
				<small>{plan.qualityLabel}</small>
				<small>
					покрытие {plan.crossSectionCoveragePercent}% · станции{" "}
					{plan.crossSectionStationPreview}
				</small>
			</article>
			<div className="ct-planning-reconstruction-grid">
				{plan.cards.map((card) => (
					<article
						className={`ct-planning-reconstruction-card ${card.status}`}
						key={card.id}
					>
						<span>{card.title}</span>
						<strong>{card.value}</strong>
						<p>{card.detail}</p>
						<small>{card.nextAction}</small>
					</article>
				))}
			</div>
			{plan.warnings.length > 0 ? (
				<div
					className="ct-planning-reconstruction-warnings"
					aria-label="Предупреждения по построению ОПТГ"
				>
					<span>Контроль</span>
					<p>{plan.warnings.join(" · ")}</p>
				</div>
			) : null}
		</div>
	);
}

export type CtPlanningTaskBoardPanelProps = {
	planningSnapshot: CtPlanningTaskSnapshot;
};

export function CtPlanningTaskBoardPanel({
	planningSnapshot,
}: CtPlanningTaskBoardPanelProps) {
	return (
		<>
			<div
				className="ct-planning-task-board"
				data-testid="ct-planning-task-board"
				aria-label="Задачи КТ-планирования для просмотрщика"
			>
				<article className="ct-planning-task-summary">
					<span>Готовность плана</span>
					<strong>{planningSnapshot.readinessScore}%</strong>
					<p>{planningSnapshot.taskSummaryLabel}</p>
					<small>{planningSnapshot.implantSummaryLabel}</small>
				</article>
				{planningSnapshot.routeCards.map((route) => (
					<article className={route.state} key={route.id}>
						<span>{route.label}</span>
						<strong>{route.title}</strong>
						<p>{route.detail}</p>
					</article>
				))}
			</div>
			{planningSnapshot.cards.length > 0 ? (
				<div
					className="ct-planning-task-list"
					data-testid="ct-planning-task-list"
					aria-label="Переносимые задачи КТ-планирования"
				>
					{planningSnapshot.cards.map((task) => (
						<article
							className={`ct-planning-task ${task.status}`}
							key={task.id}
							data-task-kind={task.kind}
						>
							<span>{task.statusLabel}</span>
							<strong>{task.title}</strong>
							<p>{task.detail}</p>
							<small>{task.toolLabel}</small>
							{task.warnings.length > 0 ? (
								<em>{task.warnings.join(" · ")}</em>
							) : null}
						</article>
					))}
				</div>
			) : null}
		</>
	);
}

export type CtPlanningToolGridPanelProps = {
	canPlan: boolean;
};

export function CtPlanningToolGridPanel({
	canPlan,
}: CtPlanningToolGridPanelProps) {
	return (
		<div
			className="ct-planning-tool-grid"
			data-testid="ct-planning-tool-grid"
			aria-label="Инструменты КТ-планирования"
		>
			{ctPlanningTools.map((tool) => {
				const locked = tool.requiresVolume && !canPlan;
				return (
					<article
						className={`ct-planning-tool ${locked ? "locked" : "ready"}`}
						data-tool-key={tool.key}
						data-state={locked ? "locked" : "ready"}
						key={tool.key}
					>
						<span>{tool.category}</span>
						<strong>{tool.title}</strong>
						<p>{tool.detail}</p>
						<small>
							{locked
								? "Откроется после выбора готовой КЛКТ/КТ-серии."
								: tool.output}
						</small>
					</article>
				);
			})}
		</div>
	);
}

type CtPlanningValidationGridProps = {
	summary: CtPlanningValidationSummary;
};

export function CtPlanningValidationGrid({
	summary,
}: CtPlanningValidationGridProps) {
	return (
		<div
			className="ct-planning-validation-grid"
			data-testid="ct-planning-validation-grid"
			aria-label="Проверка готовности КТ-плана"
		>
			<article className={`ct-planning-validation-card ${summary.status}`}>
				<span>Проверка</span>
				<strong>{summary.score}%</strong>
				<p>{summary.label}</p>
			</article>
			{summary.checks.map((check) => (
				<article
					className={`ct-planning-validation-card ${check.status}`}
					key={check.id}
				>
					<span>{check.title}</span>
					<strong>{check.value}</strong>
					<p>{check.detail}</p>
				</article>
			))}
		</div>
	);
}

const ownerLabels: Record<
	CtPlanningWorkflowPlan["phases"][number]["owner"],
	string
> = {
	series: "серия",
	doctor: "врач",
	implant: "имплант",
	admin: "админ",
	lab: "лаборатория",
};

export function CtPlanningWorkflowPanel({
	plan,
}: {
	plan: CtPlanningWorkflowPlan;
}) {
	const focusedPhaseId = plan.selectedPhaseId ?? plan.activePhaseId;

	return (
		<section
			className="ct-planning-workflow ct-planning-workflow-board"
			data-testid="ct-planning-workflow-board"
			aria-label="Динамический маршрут КТ-планирования"
		>
			<article className={`ct-planning-workflow-summary ${plan.status}`}>
				<span>Маршрут</span>
				<strong>{plan.score}%</strong>
				<p>{plan.summaryLabel}</p>
				<small>{plan.nextAction}</small>
			</article>
			{plan.selectedScenario ? (
				<article
					className={`ct-planning-workflow-focus ${plan.selectedScenario.status}`}
					data-testid="ct-planning-workflow-focus"
					{...plan.selectedScenario.viewerBridgeAttributes}
					aria-label="Текущий сценарий в маршруте КТ-планирования"
				>
					<span>Текущий сценарий</span>
					<strong>{plan.selectedScenario.title}</strong>
					<p>{plan.selectedScenario.detail}</p>
					<small>
						{plan.selectedScenario.routeLabel} ·{" "}
						{plan.selectedScenario.confirmation}
					</small>
					<small>{plan.selectedScenario.viewerLabel}</small>
					<small>{plan.selectedScenario.viewerBridgeLabel}</small>
					{plan.selectedScenario.issueTitles.length > 0 ? (
						<div
							className="ct-planning-workflow-issues"
							data-testid="ct-planning-workflow-issues"
						>
							{plan.selectedScenario.issueTitles.map((title) => (
								<em key={title}>{title}</em>
							))}
						</div>
					) : null}
					<small>
						{plan.selectedScenario.value} · {plan.selectedScenario.nextAction}
					</small>
				</article>
			) : null}
			<div className="ct-planning-workflow-grid">
				{plan.phases.map((phase) => (
					<article
						className={`ct-planning-workflow-card ${phase.status} ${phase.id === focusedPhaseId ? "active" : ""}`}
						aria-current={phase.id === focusedPhaseId ? "step" : undefined}
						key={phase.id}
					>
						<span>{ownerLabels[phase.owner]}</span>
						<strong>{phase.title}</strong>
						<p>{phase.detail}</p>
						<small>
							{phase.value} · {phase.nextAction}
						</small>
					</article>
				))}
			</div>
			{plan.warnings.length > 0 ? (
				<article className="ct-planning-workflow-warnings">
					<span>Блокеры</span>
					{plan.warnings.slice(0, 3).map((warning) => (
						<p key={warning}>{warning}</p>
					))}
				</article>
			) : null}
		</section>
	);
}
