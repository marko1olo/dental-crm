import { Database, FileText, RefreshCw } from "lucide-react";
import { dicomRenderCachePriorityLabels } from "../SettingsViewHelpers";
import type { DicomDiagnosticsPanelProps } from "./types";

export function DicomDiagnosticsPanel({
	typedDicomViewerWorkbenchManifest,
	dicomQualityModeLabels,
	dicomViewerLaunchModeLabels,
	dicomTextureStrategyLabels,
	dicomRenderMemoryBudgetClassLabels,
	dicomDiagnosticPixelPolicyLabels,
	dicomWorkbenchLocalSavedAt,
	formatTime,
	dicomWorkbenchServerBundle,
	dicomWorkbenchSourceIsRedacted,
	saveDicomWorkbenchBundleToServer,
	isDicomWorkbenchServerSaving,
	reconnectDicomWorkbenchFromCurrentFolder,
	imagingFolderPath,
	isDicomWorkbenchReconnecting,
	restoreDicomWorkbenchServerBundle,
	downloadDicomWorkbenchManifest,
	clearDicomWorkbenchRecovery,
	typedDicomWorkstationReadiness,
	dicomRuntimeTierLabels,
	mprLoadStrategyLabels,
	dicomGpuClassLabels,
	dicomExecutionLaneLabels,
	dicomReadinessCheckLabels,
	typedDicomRenderCachePlan,
	dicomLabel,
}: DicomDiagnosticsPanelProps) {
	return (
		<>
			{typedDicomViewerWorkbenchManifest ? (
				<section
					className="dicom-workbench-bundle-result"
					data-testid="dicom-workbench-bundle-result"
					aria-label="Просмотр КЛКТ/КТ"
				>
					<div>
						<strong>
							готовность загрузки{" "}
							{typedDicomViewerWorkbenchManifest.readiness.readinessScore}% ·{" "}
							{dicomLabel(
								dicomQualityModeLabels,
								typedDicomViewerWorkbenchManifest.renderCachePlan.qualityMode,
								"режим качества",
							)}
						</strong>
						<span>
							{
								dicomViewerLaunchModeLabels[
									typedDicomViewerWorkbenchManifest.launchManifest.launchMode
								]
							}{" "}
							·{" "}
							{dicomLabel(
								dicomTextureStrategyLabels,
								typedDicomViewerWorkbenchManifest.renderCachePlan
									.textureStrategy,
								"план загрузки",
							)}
						</span>
						<small data-testid="dicom-workbench-render-policy">
							{dicomLabel(
								dicomRenderMemoryBudgetClassLabels,
								typedDicomViewerWorkbenchManifest.renderCachePlan
									.memoryBudgetClass,
								"класс памяти",
							)}{" "}
							·{" "}
							{dicomLabel(
								dicomDiagnosticPixelPolicyLabels,
								typedDicomViewerWorkbenchManifest.renderCachePlan
									.diagnosticPixelPolicy,
								"политика просмотра",
							)}{" "}
							· окно{" "}
							{
								typedDicomViewerWorkbenchManifest.renderCachePlan
									.progressiveSliceWindowCap
							}
						</small>
					</div>
					<article>
						<strong>
							{
								typedDicomViewerWorkbenchManifest.renderCachePlan
									.firstPaintBudgetMs
							}{" "}
							мс
						</strong>
						<span>первый срез</span>
					</article>
					<article>
						<strong>
							{
								typedDicomViewerWorkbenchManifest.toolStateBundle.viewports
									.length
							}
						</strong>
						<span>окна КТ-срезов</span>
					</article>
					<article>
						<strong>
							{typedDicomViewerWorkbenchManifest.warnings.length}
						</strong>
						<span>предупреждений</span>
					</article>
					<p>{typedDicomViewerWorkbenchManifest.nextAction}</p>
					<div className="dicom-workbench-actions">
						<span>
							{dicomWorkbenchLocalSavedAt
								? `Сохранено локально ${formatTime(dicomWorkbenchLocalSavedAt)}; восстановится после обновления.`
								: "Рабочий набор пока не сохранен локально."}
						</span>
						<span>
							{dicomWorkbenchServerBundle
								? `Сервер сохранил ${formatTime(dicomWorkbenchServerBundle.serverSavedAt)}; тяжелые данные снимков не сохранялись.`
								: dicomWorkbenchServerBundle
									? `На сервере есть восстановление ${formatTime(dicomWorkbenchServerBundle.serverSavedAt)}.`
									: "Серверного восстановления пока нет."}
						</span>
						<span>
							{dicomWorkbenchSourceIsRedacted
								? "Локальный источник скрыт в серверном восстановлении; найдите папку снимков или вставьте путь, затем переподключите перед открытием тяжелых данных."
								: "Локальный источник доступен для этого рабочего набора."}
						</span>
						<button
							className="secondary-button"
							type="button"
							data-testid="save-dicom-workbench-server"
							onClick={() => void saveDicomWorkbenchBundleToServer()}
							disabled={isDicomWorkbenchServerSaving}
						>
							<Database aria-hidden="true" />
							{isDicomWorkbenchServerSaving
								? "Сохраняю"
								: "Сохранить на сервер"}
						</button>
						<button
							className="secondary-button"
							type="button"
							data-testid="reconnect-dicom-workbench-folder"
							onClick={() => void reconnectDicomWorkbenchFromCurrentFolder()}
							disabled={
								!(imagingFolderPath || "").trim() ||
								isDicomWorkbenchReconnecting
							}
						>
							<RefreshCw aria-hidden="true" />
							{isDicomWorkbenchReconnecting
								? "Подключаю"
								: "Переподключить папку"}
						</button>
						{dicomWorkbenchServerBundle ? (
							<button
								className="text-button"
								type="button"
								onClick={() =>
									restoreDicomWorkbenchServerBundle(
										dicomWorkbenchServerBundle,
									)
								}
							>
								Восстановить с сервера
							</button>
						) : null}
						<button
							className="secondary-button"
							type="button"
							onClick={downloadDicomWorkbenchManifest}
							disabled={!typedDicomViewerWorkbenchManifest}
						>
							<FileText aria-hidden="true" />
							Скачать состояние
						</button>
						<button
							className="text-button"
							type="button"
							onClick={clearDicomWorkbenchRecovery}
							disabled={!dicomWorkbenchLocalSavedAt}
						>
							Очистить локальную копию
						</button>
					</div>
					<div className="dicom-cache-task-list">
						{typedDicomViewerWorkbenchManifest.renderCachePlan.tasks
							.slice(0, 4)
							.map((task) => (
								<span key={task.id}>
									{dicomRenderCachePriorityLabels[task.priority]}:{" "}
									{task.label}
								</span>
							))}
					</div>
					<div className="dicom-cache-phase-list">
						{typedDicomViewerWorkbenchManifest.renderCachePlan.interactionPhases
							.slice(0, 3)
							.map((phase) => (
								<span key={phase.id}>
									{phase.label}: {phase.targetFrameMs} мс / окно{" "}
									{phase.maxResidentSlices}
								</span>
							))}
					</div>
					<div className="dicom-cache-progressive-list">
						{typedDicomViewerWorkbenchManifest.renderCachePlan.progressiveStages
							.slice(0, 4)
							.map((stage) => (
								<span key={stage.id}>
									{stage.label}: шаг {stage.decimationFactor} / заявок{" "}
									{stage.sliceOrder.length} / окно {stage.maxResidentSlices}
								</span>
							))}
					</div>
				</section>
			) : null}

			{typedDicomWorkstationReadiness ? (
				<section
					className="dicom-workstation-result"
					aria-label="Готовность станции просмотра"
				>
					<div className="dicom-workstation-score">
						<strong>
							готовность загрузки{" "}
							{typedDicomWorkstationReadiness?.readinessScore}%
						</strong>
						<span>
							{dicomLabel(
								dicomRuntimeTierLabels,
								typedDicomWorkstationReadiness.detectedTier,
								"класс ПК",
							)}{" "}
							/{" "}
							{dicomLabel(
								mprLoadStrategyLabels as Record<string, string>,
								typedDicomWorkstationReadiness.effectiveLoadStrategy,
								"стратегия загрузки",
							)}
						</span>
					</div>
					<div className="dicom-render-plan">
						<strong>
							{dicomLabel(
								dicomGpuClassLabels,
								typedDicomWorkstationReadiness.renderPlan.gpuClass,
								"графика ПК",
							)}{" "}
							·{" "}
							{dicomLabel(
								dicomQualityModeLabels,
								typedDicomWorkstationReadiness.renderPlan.qualityMode,
								"режим качества",
							)}
						</strong>
						<span>
							{dicomLabel(
								dicomTextureStrategyLabels,
								typedDicomWorkstationReadiness.renderPlan.textureStrategy,
								"план загрузки",
							)}
						</span>
						<small>
							{typedDicomWorkstationReadiness?.runtimeProfile.label} ·{" "}
							{dicomLabel(
								dicomExecutionLaneLabels,
								typedDicomWorkstationReadiness?.runtimeProfile.executionLane,
								"маршрут просмотра",
							)}
						</small>
						<small>
							{typedDicomWorkstationReadiness?.runtimeProfile.nextAction}
						</small>
						<small>
							окно{" "}
							{typedDicomWorkstationReadiness.renderPlan.targetSliceBatch}{" "}
							срезов · облегчение x
							{typedDicomWorkstationReadiness.renderPlan.downsampleFactor} ·
							память просмотра ~
							{typedDicomWorkstationReadiness.renderPlan.estimatedGpuMemoryMb}{" "}
							МБ
						</small>
						<small data-testid="dicom-render-hardware-policy">
							{dicomLabel(
								dicomRenderMemoryBudgetClassLabels,
								typedDicomWorkstationReadiness.renderPlan.memoryBudgetClass,
								"класс памяти",
							)}{" "}
							· вес железа{" "}
							{Math.round(
								typedDicomWorkstationReadiness.renderPlan
									.hardwareQualityWeight * 100,
							)}
							% · окно политики{" "}
							{
								typedDicomWorkstationReadiness.renderPlan
									.progressiveSliceWindowCap
							}{" "}
							срезов
						</small>
						<small data-testid="dicom-render-diagnostic-policy">
							{dicomLabel(
								dicomDiagnosticPixelPolicyLabels,
								typedDicomWorkstationReadiness.renderPlan
									.diagnosticPixelPolicy,
								"политика просмотра",
							)}
						</small>
						<small>
							{typedDicomWorkstationReadiness.renderPlan.firstPaintStrategy}
						</small>
					</div>
					<div className="dicom-workstation-checks">
						{typedDicomWorkstationReadiness.checks.map((check) => (
							<article
								className={`dicom-check-${check.status}`}
								key={check.id}
							>
								<strong>
									{dicomReadinessCheckLabels[check.status]} · {check.label}
								</strong>
								<span>{check.detail}</span>
							</article>
						))}
					</div>
					<p>{typedDicomWorkstationReadiness.nextAction}</p>
				</section>
			) : null}

			{typedDicomRenderCachePlan ? (
				<section
					className="dicom-cache-plan-result"
					aria-label="План быстрой загрузки снимков"
				>
					<div>
						<strong>
							срезы {typedDicomRenderCachePlan.firstWindowStart}-
							{typedDicomRenderCachePlan.firstWindowEnd}
						</strong>
						<span>
							{dicomLabel(
								dicomTextureStrategyLabels,
								typedDicomRenderCachePlan.textureStrategy,
								"план загрузки",
							)}{" "}
							·{" "}
							{dicomLabel(
								dicomQualityModeLabels,
								typedDicomRenderCachePlan.qualityMode,
								"режим качества",
							)}
						</span>
					</div>
					<article>
						<strong>{typedDicomRenderCachePlan.firstPaintBudgetMs} мс</strong>
						<span>первый кадр</span>
					</article>
					<article>
						<strong>{typedDicomRenderCachePlan.gpuMemoryBudgetMb} МБ</strong>
						<span>память просмотра</span>
					</article>
					<article>
						<strong>{typedDicomRenderCachePlan.workerCount}</strong>
						<span>потоки</span>
					</article>
					<article data-testid="dicom-cache-memory-class">
						<strong>
							{dicomLabel(
								dicomRenderMemoryBudgetClassLabels,
								typedDicomRenderCachePlan.memoryBudgetClass,
								"класс памяти",
							)}
						</strong>
						<span>класс памяти</span>
					</article>
					<article data-testid="dicom-cache-pixel-policy">
						<strong>
							{dicomLabel(
								dicomDiagnosticPixelPolicyLabels,
								typedDicomRenderCachePlan.diagnosticPixelPolicy,
								"политика просмотра",
							)}
						</strong>
						<span>граница диагностики</span>
					</article>
					<article data-testid="dicom-cache-window-cap">
						<strong>
							{typedDicomRenderCachePlan.progressiveSliceWindowCap}
						</strong>
						<span>окно политики</span>
					</article>
					<p>{typedDicomRenderCachePlan.nextAction}</p>
					<div className="dicom-cache-task-list">
						{typedDicomRenderCachePlan.tasks.slice(0, 5).map((task: any) => (
							<span key={task.id}>
								{dicomRenderCachePriorityLabels[task.priority]}: {task.label}
							</span>
						))}
					</div>
					<div className="dicom-cache-phase-list">
						{typedDicomRenderCachePlan.interactionPhases.map((phase: any) => (
							<span key={phase.id}>
								{phase.label}: {phase.targetFrameMs} мс / окно{" "}
								{phase.maxResidentSlices}
							</span>
						))}
					</div>
					<div className="dicom-cache-progressive-list">
						{typedDicomRenderCachePlan.progressiveStages.map((stage: any) => (
							<span key={stage.id}>
								{stage.label}: шаг {stage.decimationFactor} / заявок{" "}
								{stage.sliceOrder.length} / окно {stage.maxResidentSlices}
							</span>
						))}
					</div>
				</section>
			) : null}
		</>
	);
}
