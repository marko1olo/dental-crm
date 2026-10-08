import { isHttpUrl } from "@dental/shared";
import {
	CheckCircle2,
	ClipboardCheck,
	ExternalLink,
	Gauge,
	Layers3,
} from "lucide-react";
import { humanizeMigrationText } from "../SettingsViewHelpers";
import type { DicomOhifBridgePanelProps, TextInputChangeEvent } from "./types";

export function DicomOhifBridgePanel({
	dicomViewerLaunchManifest,
	dicomViewerLaunchModeLabels,
	dicomWebEndpointUrl,
	setDicomWebEndpointUrl,
	ohifBaseUrl,
	setOhifBaseUrl,
	onResetEndpointState,
	onResetOhifState,
	cbctWorkbenchSeries,
	isDicomWorkbenchBuilding,
	buildDicomViewerWorkbenchManifest,
	dicomWorkbenchSeriesGuidanceId,
	isDicomWorkstationChecking,
	checkDicomWorkstationReadiness,
	isDicomManifestBuilding,
	buildDicomViewerLaunchManifest,
	dicomArchiveAddressReady,
	isDicomWebChecking,
	checkDicomWebConnector,
	dicomArchiveAddressGuidanceId,
	buildDicomViewerToolStateBundle,
	isDicomToolStateBuilding,
	dicomExecutionLaneLabels,
	typedDicomWorkstationReadiness,
	buildDicomRenderCachePlan,
	isDicomRenderCachePlanning,
	dicomWorkstationGuidanceId,
	dicomWorkstationReadiness,
	dicomWebCheck,
	dicomWebStatusLabels,
	dicomLabel,
}: DicomOhifBridgePanelProps) {
	return (
		<>
			<section
				className="dicomweb-launch-panel"
				aria-label="Запуск архива снимков и внешнего просмотра"
			>
				<div className="dicomweb-launch-head">
					<div>
						<strong>Архив снимков / внешний просмотр</strong>
						<p>
							Админская проверка подключения и плана открытия просмотрщика.
							Прием остается легким.
						</p>
					</div>
					<span>
						{dicomViewerLaunchManifest
							? dicomViewerLaunchModeLabels[
									dicomViewerLaunchManifest.launchMode
								]
							: "не запускалось"}
					</span>
				</div>
				<div className="dicomweb-input-grid">
					<label>
						Адрес архива снимков
						<input
							value={dicomWebEndpointUrl}
							onChange={(event: TextInputChangeEvent) => {
								setDicomWebEndpointUrl(event.target.value);
								onResetEndpointState();
							}}
						/>
					</label>
					<label>
						Адрес внешнего просмотра
						<input
							value={ohifBaseUrl}
							onChange={(event: TextInputChangeEvent) => {
								setOhifBaseUrl(event.target.value);
								onResetOhifState();
							}}
						/>
					</label>
				</div>
				<div className="dicomweb-action-row">
					<button
						className="primary-button"
						type="button"
						onClick={() => void buildDicomViewerWorkbenchManifest()}
						aria-describedby={
							!cbctWorkbenchSeries
								? dicomWorkbenchSeriesGuidanceId
								: undefined
						}
						disabled={!cbctWorkbenchSeries || isDicomWorkbenchBuilding}
					>
						<Layers3 aria-hidden="true" />
						{isDicomWorkbenchBuilding
							? "Готовлю"
							: "Открыть КТ-рабочее место"}
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void checkDicomWorkstationReadiness()}
						aria-describedby={
							!cbctWorkbenchSeries
								? dicomWorkbenchSeriesGuidanceId
								: undefined
						}
						disabled={!cbctWorkbenchSeries || isDicomWorkstationChecking}
					>
						<Gauge aria-hidden="true" />
						{isDicomWorkstationChecking ? "Проверяю" : "Проверить этот ПК"}
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void buildDicomViewerLaunchManifest()}
						aria-describedby={
							!cbctWorkbenchSeries
								? dicomWorkbenchSeriesGuidanceId
								: undefined
						}
						disabled={!cbctWorkbenchSeries || isDicomManifestBuilding}
					>
						<ExternalLink aria-hidden="true" />
						{isDicomManifestBuilding ? "Собираю" : "Открыть внешний просмотр"}
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void checkDicomWebConnector()}
						aria-describedby={
							!dicomArchiveAddressReady
								? dicomArchiveAddressGuidanceId
								: undefined
						}
						disabled={!dicomArchiveAddressReady || isDicomWebChecking}
					>
						<CheckCircle2 aria-hidden="true" />
						{isDicomWebChecking ? "Проверяю" : "Проверить архив"}
					</button>
				</div>
				<details className="dicomweb-advanced-actions">
					<summary>Расширенная настройка просмотрщика</summary>
					<div className="dicomweb-action-row">
						<button
							className="secondary-button"
							type="button"
							onClick={() => void buildDicomViewerToolStateBundle()}
							aria-describedby={
								!cbctWorkbenchSeries
									? dicomWorkbenchSeriesGuidanceId
									: undefined
							}
							disabled={!cbctWorkbenchSeries || isDicomToolStateBuilding}
						>
							{dicomLabel(
								dicomExecutionLaneLabels,
								typedDicomWorkstationReadiness?.runtimeProfile.executionLane,
								"маршрут просмотра",
							)}{" "}
							<ClipboardCheck aria-hidden="true" />
							{isDicomToolStateBuilding
								? "Собираю"
								: "Экспорт состояния просмотрщика"}
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void buildDicomRenderCachePlan()}
							aria-describedby={
								!cbctWorkbenchSeries
									? dicomWorkbenchSeriesGuidanceId
									: !dicomWorkstationReadiness
										? dicomWorkstationGuidanceId
										: undefined
							}
							disabled={
								!cbctWorkbenchSeries ||
								!dicomWorkstationReadiness ||
								isDicomRenderCachePlanning
							}
						>
							<Layers3 aria-hidden="true" />
							{isDicomRenderCachePlanning
								? "Планирую"
								: "Подготовить быструю загрузку"}
						</button>
					</div>
					<small>
						Только метаданные и состояние. Саму серию открывает внешний или
						сертифицированный локальный просмотрщик.
					</small>
				</details>
				{!cbctWorkbenchSeries ? (
					<p
						className="dicom-action-guidance"
						id={dicomWorkbenchSeriesGuidanceId}
						role="status"
						aria-live="polite"
					>
						Сначала нажмите "Проверить серии" и выберите готовую
						КЛКТ/КТ-серию. После этого станут доступны КТ-рабочее место,
						внешний просмотр и экспорт состояния.
					</p>
				) : !dicomWorkstationReadiness ? (
					<p
						className="dicom-action-guidance"
						id={dicomWorkstationGuidanceId}
						role="status"
						aria-live="polite"
					>
						Для быстрой загрузки сначала нажмите "Проверить этот ПК", чтобы
						оценить память, сеть и способ предварительной подготовки.
					</p>
				) : null}
				{!dicomArchiveAddressReady ? (
					<p
						className="dicom-action-guidance"
						id={dicomArchiveAddressGuidanceId}
						role="status"
						aria-live="polite"
					>
						Введите адрес архива снимков, чтобы проверить подключение.
					</p>
				) : null}
				{dicomWebCheck ? (
					<div className="dicomweb-status-grid">
						<article
							className={`dicomweb-status dicomweb-${dicomWebCheck.status}`}
						>
							<strong>{dicomWebStatusLabels[dicomWebCheck.status]}</strong>
							<span>
								{dicomWebCheck.qidoHttpStatus
									? `ответ архива ${dicomWebCheck.qidoHttpStatus}`
									: "нет ответа архива"}
							</span>
						</article>
						<article>
							<strong>{dicomWebCheck.latencyMs} мс</strong>
							<span>
								{dicomWebCheck.canSearch
									? "поиск серий готов"
									: "поиск серий не готов"}
							</span>
						</article>
						<article>
							<strong>
								{dicomWebCheck.storeConfigured
									? "загрузка снимков настроена"
									: "загрузка снимков не настроена"}
							</strong>
							<span>
								{dicomWebCheck.canRetrieve
									? "серия доступна"
									: "нужен код серии"}
							</span>
						</article>
					</div>
				) : null}
			</section>

			{dicomViewerLaunchManifest ? (
				<section
					className="dicomweb-manifest-result"
					aria-label="План открытия внешнего просмотра"
				>
					<div>
						<strong>
							{
								dicomViewerLaunchModeLabels[
									dicomViewerLaunchManifest.launchMode
								]
							}
						</strong>
						<span>
							{dicomViewerLaunchManifest.cornerstoneVolumeId
								? "серия подготовлена для просмотра"
								: "том снимков еще не подготовлен"}
						</span>
					</div>
					{dicomViewerLaunchManifest.viewerUrl &&
					isHttpUrl(dicomViewerLaunchManifest.viewerUrl) ? (
						<a
							href={dicomViewerLaunchManifest.viewerUrl}
							target="_blank"
							rel="noreferrer noopener"
							aria-label="Открыть внешний просмотр снимков в новой вкладке"
							title="Открыть внешний просмотр снимков в новой вкладке"
						>
							Открыть внешний просмотр
						</a>
					) : dicomViewerLaunchManifest.viewerUrl ? (
						<span title="Адрес внешнего просмотра открывается только по http/https">
							Цель внешнего просмотра: {dicomViewerLaunchManifest.viewerUrl}
						</span>
					) : (
						<span>{dicomViewerLaunchManifest.nextAction}</span>
					)}
					<p>
						{dicomViewerLaunchManifest.warnings
							.slice(0, 3)
							.map(humanizeMigrationText)
							.join(" · ")}
					</p>
				</section>
			) : null}
		</>
	);
}
