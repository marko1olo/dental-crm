import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	MprWindowPreset,
} from "@dental/shared";
import {
	CheckCircle2,
	ClipboardCheck,
	Database,
	ExternalLink,
	FileText,
	Gauge,
	History,
	ImageIcon,
	Layers3,
	RefreshCw,
	RotateCcw,
	ScanSearch,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { CtPlanningToolsPanel } from "../../../ctPlanningTools";

type MprClinicalPreset =
	import("../../../mprClinicalStatus").MprClinicalPresetFitTarget;

import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../../useSettingsDerivations";
/*
 * Подписи и форматтеры — константы модуля, а не состояние: в мешок пропсов
 * они не попадают никогда. См. SourcesDicomCapability, где из-за этого падала
 * вся вкладка «Источники».
 */
import {
	dicomRenderCachePriorityLabels,
	dicomSeriesDisplayText,
	dicomSeriesWarningText,
	humanizeIntegrationInput,
	humanizeMigrationText,
} from "../SettingsViewHelpers";

type StringTokenGroup = { title: string; items: string[] };
type CbctWorkbenchPlane = { key: string; title: string; detail: string };
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export function SourcesIntegrationPresets() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	/*
	 * Читаются ТОЛЬКО эти поля. Раньше здесь стоял тот же список на 150 имён, что
	 * в SourcesDicomCapability — скопированный целиком, хотя эта панель пресетов
	 * пользуется девятнадцатью. Остальные 131 имя были мёртвыми чтениями: `as any`
	 * на строке выше делал их бесплатными для компилятора, поэтому копия и жила.
	 * Внимание: в цепочке эти пропсы НЕ мёртвые — SourcesDicomCapability
	 * действительно использует 143 из 150. Убран артефакт копипасты, не функция.
	 */
	const {
		imagingConnectorCards,
		imagingViewerCapabilities,
		dicomSeriesPreview,
		imagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		ctPlanningImplantPlan,
		dicomViewerWorkbenchManifest,
		dicomViewerToolStateBundle,
		localBridgeReadiness,
		cbctWorkbenchProjections,
		cbctWorkbenchTools,
		cbctMprBlockers,
		cbctMprWarnings,
		cbctResourceSafetyCaps,
		dicomWorkstationReadiness,
		integrationPresets,
		integrationCapabilityLabels,
		integrationStatusLabels,
		integrationCategoryLabels,
	} = mergedProps;

	const typedImagingConnectorCards = imagingConnectorCards as Array<{
		title: string;
		detail: string;
		source: string;
	}>;
	const typedImagingViewerCapabilities = imagingViewerCapabilities as Array<{
		icon: any;
		title: string;
		detail: string;
		state: string;
	}>;
	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as Array<any>;
	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ??
		[]) as Array<string>;
	const typedImagingViewerActiveTool = imagingViewerActiveTool as any;
	const typedCtPlanningActiveQuickActionId = ctPlanningActiveQuickActionId as
		| string
		| null;
	const typedCtPlanningImplantPlan = ctPlanningImplantPlan as any | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomViewerToolStateBundle = dicomViewerToolStateBundle as
		| any
		| null;
	const typedLocalBridgeReadiness = localBridgeReadiness as any | null;
	const typedCbctWorkbenchProjections = (cbctWorkbenchProjections ??
		[]) as string[];
	const typedCbctWorkbenchTools = (cbctWorkbenchTools ?? []) as string[];
	const typedCbctMprBlockers = (cbctMprBlockers ?? []) as string[];
	const typedCbctMprWarnings = (cbctMprWarnings ?? []) as string[];
	const typedCbctResourceSafetyCaps = (cbctResourceSafetyCaps ??
		[]) as string[];
	const typedDicomWorkstationReadiness =
		dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const typedDicomRenderCachePlan = mergedProps.dicomRenderCachePlan as any;
	const typedIntegrationPresets = (integrationPresets ?? []) as Array<any>;

	return (
		<>
			<section
				className="integration-presets"
				aria-label="Пресеты миграции и внешних систем"
			>
				<div className="import-copy">
					<Database aria-hidden="true" />
					<div>
						<p className="eyebrow">Источники данных</p>
						<h2>
							Старая программа, таблица, бумага и снимки идут через один
							понятный предпросмотр
						</h2>
						<p>
							Это не кнопки для врача. Это карта миграции для владельца или
							администратора: что можно разобрать сейчас, где нужна карта полей,
							а где потребуется отдельное подключение.
						</p>
					</div>
				</div>
				<div className="preset-grid">
					{typedIntegrationPresets.map((preset) => (
						<details
							className={`preset-card preset-${preset.status}`}
							key={preset.id}
							open={preset.status === "usable_now"}
						>
							<summary className="preset-card-head">
								<div>
									<strong>{preset.title}</strong>
									<p>
										{preset.vendor} ·{" "}
										{integrationCategoryLabels[preset.category]} · риск{" "}
										{preset.riskLevel}
									</p>
								</div>
								<span>{integrationStatusLabels[preset.status]}</span>
							</summary>
							<div
								className="preset-capabilities"
								aria-label="Что переносит источник"
							>
								{preset.capabilities.slice(0, 6).map((capability) => (
									<span key={capability}>
										{integrationCapabilityLabels[capability]}
									</span>
								))}
							</div>
							<ul>
								{preset.migrationNotes.slice(0, 2).map((note) => (
									<li key={note}>{note}</li>
								))}
							</ul>
							<small>
								Вход:{" "}
								{preset.supportedInputs
									.slice(0, 4)
									.map(humanizeIntegrationInput)
									.join(", ")}
							</small>
						</details>
					))}
				</div>
			</section>
		</>
	);
}
