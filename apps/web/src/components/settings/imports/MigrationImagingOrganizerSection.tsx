import React from "react";
import type {
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	ImagingFolderScanResponse,
	LocalImagingOrganizerResponse,
} from "@dental/shared";
import { localImagingModelWorkbenchTargetLabels } from "./constants";
import { humanizeMigrationText } from "./helpers";

export interface MigrationImagingOrganizerSectionProps {
	typedLocalImagingOrganizer:
		| LocalImagingOrganizerResponse
		| null
		| undefined;
	typedImagingFolderScan: ImagingFolderScanResponse | null | undefined;
	typedDicomFolderSeriesScan:
		| DicomFolderSeriesPreviewResponse
		| null
		| undefined;
	typedDicomFolderWorkupPlan:
		| DicomFolderWorkupPlanResponse
		| null
		| undefined;
	localImagingOrganizerActionLabels: Record<string, string>;
	localImagingModelRoleLabels: Record<string, string>;
	dicomFolderWorkupPathLabels: Record<string, string>;
	dicomTextureStrategyLabels: Record<string, string>;
	dicomLabel: (
		map: Record<string, string>,
		key: any,
		fallback: string,
	) => string;
	isDicomFolderWorkupPlanning: boolean;
	isDicomWorkbenchBuilding: boolean;
	isDicomFirstFramePreviewing: boolean;
	rememberLocalImagingFolder: (p: string, o?: any) => void;
	setDicomFolderSeriesScan: (s: any) => void;
	setDicomFolderWorkupPlan: (p: any) => void;
	setDicomFirstFramePreview: (p: any) => void;
	setImagingFolderScan: (s: any) => void;
	setDicomLocalFolderDiscovery: (d: any) => void;
	prepareDicomWorkbenchFromFolder: (p: string, t: string, o?: any) => void;
	previewDicomFirstFrame: (p?: string, o?: any) => void;
}

export function MigrationImagingOrganizerSection({
	typedLocalImagingOrganizer,
	typedImagingFolderScan,
	typedDicomFolderSeriesScan,
	typedDicomFolderWorkupPlan,
	localImagingOrganizerActionLabels,
	localImagingModelRoleLabels,
	dicomFolderWorkupPathLabels,
	dicomTextureStrategyLabels,
	dicomLabel,
	isDicomFolderWorkupPlanning,
	isDicomWorkbenchBuilding,
	isDicomFirstFramePreviewing,
	rememberLocalImagingFolder,
	setDicomFolderSeriesScan,
	setDicomFolderWorkupPlan,
	setDicomFirstFramePreview,
	setImagingFolderScan,
	setDicomLocalFolderDiscovery,
	prepareDicomWorkbenchFromFolder,
	previewDicomFirstFrame,
}: MigrationImagingOrganizerSectionProps) {
	return (
		<>
			{typedLocalImagingOrganizer ? (
				<section
					className="local-imaging-organizer-result"
					data-testid="local-imaging-organizer-result"
					aria-label="Органайзер локальных снимков"
				>
					<div className="dicom-discovery-head">
						<strong>
							Органайзер: кейсов {typedLocalImagingOrganizer.cases.length} /
							просканировано папок {typedLocalImagingOrganizer.scannedFolders}
						</strong>
						<span>
							{humanizeMigrationText(typedLocalImagingOrganizer.nextAction)}
						</span>
					</div>
					<div className="local-imaging-case-grid">
						{typedLocalImagingOrganizer.cases.slice(0, 6).map((caseItem) => (
							<article
								className={`local-imaging-case local-action-${caseItem.recommendedAction}`}
								key={caseItem.id}
							>
								<div>
									<strong>{caseItem.safeDisplayName}</strong>
									<span>
										{humanizeMigrationText(caseItem.sourceLabel)} · метка
										папки {caseItem.folderFingerprint.toUpperCase()}
									</span>
									<span>
										Путь к папке и имена, похожие на данные пациента, скрыты до
										выбора
									</span>
								</div>
								<div className="local-imaging-case-metrics">
									<span>
										{Math.round(caseItem.combinedConfidence * 100)}%
									</span>
									<span>{caseItem.dicomLikeFiles} снимков</span>
									<span>{caseItem.modelFiles} 3D</span>
									<span>архивов: {caseItem.archiveFiles}</span>
								</div>
								<small>
									{localImagingOrganizerActionLabels[caseItem.recommendedAction]}
								</small>
								{caseItem.modelCandidates.length ? (
									<div className="local-imaging-model-list">
										{caseItem.modelCandidates.slice(0, 3).map((model) => (
											<span key={`${caseItem.id}-${model.filePath}`}>
												{model.format.toUpperCase()} ·{" "}
												{localImagingModelRoleLabels[model.role] ?? model.role}{" "}
												· {Math.round(model.confidence * 100)}%
											</span>
										))}
									</div>
								) : null}
								{caseItem.modelWorkbenchManifest.totalModels > 0 ? (
									<div className="local-imaging-model-workbench">
										<strong>
											{localImagingModelWorkbenchTargetLabels[
												caseItem.modelWorkbenchManifest.recommendedTarget
											] ?? caseItem.modelWorkbenchManifest.recommendedTarget}{" "}
											· КТ-поверхностей{" "}
											{caseItem.modelWorkbenchManifest.ctSurfaceModels} · до{" "}
											{caseItem.modelWorkbenchManifest.largestModelMb} МБ
										</strong>
										{caseItem.modelWorkbenchManifest.items
											.slice(0, 3)
											.map((item) => (
												<span key={`${caseItem.id}-workbench-${item.fileName}`}>
													{localImagingModelRoleLabels[item.role] ?? item.role}
													:{" "}
													{localImagingModelWorkbenchTargetLabels[
														item.loadTarget
													] ?? item.loadTarget}{" "}
													· {item.sizeMb} МБ
												</span>
											))}
										<small>
											{caseItem.modelWorkbenchManifest.nextAction}
										</small>
									</div>
								) : null}
								<button
									className="text-button"
									type="button"
									onClick={() => {
										rememberLocalImagingFolder(caseItem.folderPath, {
											safeDisplayName: caseItem.safeDisplayName,
											sourceLabel: caseItem.sourceLabel,
											sourceKind: caseItem.sourceKind,
											folderFingerprint: caseItem.folderFingerprint,
											origin: "organizer",
										});
										setDicomFolderSeriesScan(null);
										setDicomFolderWorkupPlan(null);
										setDicomFirstFramePreview(null);
										setImagingFolderScan(null);
										setDicomLocalFolderDiscovery(null);
									}}
								>
									Выбрать папку
								</button>
								{caseItem.recommendedAction !== "review_3d_models" ? (
									<button
										className="text-button"
										type="button"
										data-testid="prepare-local-dicom-workbench"
										disabled={
											isDicomFolderWorkupPlanning ||
											isDicomWorkbenchBuilding
										}
										onClick={() =>
											void prepareDicomWorkbenchFromFolder(
												caseItem.folderPath,
												"local_organizer_quick_workbench",
												{
													safeDisplayName: caseItem.safeDisplayName,
													sourceLabel: caseItem.sourceLabel,
													sourceKind: caseItem.sourceKind,
													folderFingerprint: caseItem.folderFingerprint,
													origin: "organizer",
												},
											)
										}
									>
										Подготовить КТ
									</button>
								) : null}
								{caseItem.dicomLikeFiles > 0 ? (
									<button
										className="text-button"
										type="button"
										data-testid="preview-local-dicom-first-frame"
										disabled={isDicomFirstFramePreviewing}
										onClick={() => {
											rememberLocalImagingFolder(caseItem.folderPath, {
												safeDisplayName: caseItem.safeDisplayName,
												sourceLabel: caseItem.sourceLabel,
												sourceKind: caseItem.sourceKind,
												folderFingerprint: caseItem.folderFingerprint,
												origin: "organizer",
											});
											void previewDicomFirstFrame(caseItem.folderPath, {
												safeDisplayName: caseItem.safeDisplayName,
												sourceLabel: caseItem.sourceLabel,
												sourceKind: caseItem.sourceKind,
												folderFingerprint: caseItem.folderFingerprint,
												origin: "organizer",
											});
										}}
									>
										Первый срез
									</button>
								) : null}
							</article>
						))}
					</div>
					{(typedLocalImagingOrganizer?.warnings ?? [])
						.slice(0, 4)
						.map((warning) => (
							<small key={warning}>{humanizeMigrationText(warning)}</small>
						))}
				</section>
			) : null}

			{typedImagingFolderScan ? (
				<div className="recognition-notes">
					<span>
						Найдено файлов: {typedImagingFolderScan.filesFound}. В
						предпросмотре: {typedImagingFolderScan.preview?.totalRows ?? 0}.
					</span>
					{(typedImagingFolderScan.warnings ?? []).map((warning) => (
						<span key={warning}>{humanizeMigrationText(warning)}</span>
					))}
				</div>
			) : null}

			{typedDicomFolderSeriesScan ? (
				<div className="recognition-notes">
					<span>
						Метаданные снимков: файлов {typedDicomFolderSeriesScan.filesFound},
						прочитано {typedDicomFolderSeriesScan.filesParsed}, строк метаданных{" "}
						{typedDicomFolderSeriesScan.metadataRows}, серий{" "}
						{typedDicomFolderSeriesScan.preview?.totalSeries ?? 0}.
					</span>
					{(typedDicomFolderSeriesScan.warnings ?? [])
						.slice(0, 5)
						.map((warning) => (
							<span key={warning}>{humanizeMigrationText(warning)}</span>
						))}
				</div>
			) : null}

			{typedDicomFolderWorkupPlan ? (
				<section
					className="dicom-folder-workup-result"
					aria-label="План разбора папки снимков"
				>
					<div className="dicom-folder-workup-head">
						<strong>
							План: серий {typedDicomFolderWorkupPlan.selectedSeriesCount} /
							файлов {typedDicomFolderWorkupPlan.folder?.filesParsed ?? 0}
						</strong>
						<span>
							{humanizeMigrationText(typedDicomFolderWorkupPlan.nextAction)}
						</span>
					</div>
					<div className="dicom-folder-workup-plans">
						{(typedDicomFolderWorkupPlan.plans ?? [])
							.slice(0, 4)
							.map((plan, idx) => (
								<article
									className={`workup-${plan?.recommendedPath}`}
									key={plan?.series?.id ?? `plan-series-${idx}`}
								>
									<strong>
										{dicomFolderWorkupPathLabels[plan?.recommendedPath ?? ""]}
									</strong>
									<span>
										{plan?.series?.modality ?? "тип не указан"} / файлов{" "}
										{plan?.series?.fileCount ?? 0} / готовность{" "}
										{plan?.readiness?.readinessScore ?? 0}%
									</span>
									<small>
										{dicomLabel(
											dicomTextureStrategyLabels,
											plan?.renderCachePlan?.textureStrategy,
											"план загрузки",
										)}{" "}
										/ первый показ{" "}
										{plan?.renderCachePlan?.firstPaintBudgetMs ?? 0} мс / память{" "}
										{plan?.renderCachePlan?.gpuMemoryBudgetMb ?? 0} МБ
									</small>
									<small>{humanizeMigrationText(plan?.nextAction)}</small>
								</article>
							))}
					</div>
					{(typedDicomFolderWorkupPlan.warnings ?? []).slice(0, 4).map((warning) => (
						<small key={warning}>{humanizeMigrationText(warning)}</small>
					))}
				</section>
			) : null}
		</>
	);
}
