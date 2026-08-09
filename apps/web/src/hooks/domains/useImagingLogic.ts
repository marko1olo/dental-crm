import type { Dashboard, ImagingStudyKind } from "@dental/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	formatTime,
	type ImagingViewerSaveState,
	loadBrowserPickedImagingFolderPreview,
	loadLocalDicomWorkbenchDraft,
	loadLocalImagingFolderDraft,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
} from "../../AppHelpers";
import {
	imagingCaptureDistanceMs,
	imagingComparisonScore,
} from "../../imagingComparison";
import { useImagingStore } from "../../store/imagingStore";
import {
	type DicomFirstFramePreviewRequestContext,
	useDicomWorkbenchModule,
} from "./useDicomWorkbenchModule";
import { useImagingQueries } from "./useImagingQueries";

export interface ImagingLogicProps {
	activeOrganizationId: string | null;
	auth: any;
	dashboard: any;
	showToast: any;
	actionFailureToast: any;

	currentView: any;
	setError: any;
	activePatient: any;
	loadDashboard: any;
	isOnline: boolean;
}

export function useImagingLogic({
	activeOrganizationId,
	auth,
	dashboard,
	showToast,
	actionFailureToast,

	currentView,
	setError,
	activePatient,
	loadDashboard,
	isOnline,
}: ImagingLogicProps) {
	const {
		imagingImportText,
		setImagingImportText,
		imagingImportSourceKind,
		setImagingImportSourceKind,
		localImagingFolderDraft,
		setLocalImagingFolderDraft,
		imagingFolderPath,
		setImagingFolderPath,
		browserPickedImagingFolder,
		setBrowserPickedImagingFolder,
		browserImagingScanProgress,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setBrowserImagingScanProgress,
		browserDirectoryPickerAvailable,
		setBrowserDirectoryPickerAvailable,
		imagingImportPreview,
		setImagingImportPreview,
		imagingImportCommit,
		setImagingImportCommit,
		imagingFolderScan,
		setImagingFolderScan,
		dicomLocalFolderDiscovery,
		setDicomLocalFolderDiscovery,
		localImagingOrganizer,
		setLocalImagingOrganizer,
		dicomSeriesPreview,
		setDicomSeriesPreview,
		dicomFolderSeriesScan,
		setDicomFolderSeriesScan,
		dicomFolderWorkupPlan,
		setDicomFolderWorkupPlan,
		dicomFirstFramePreview,
		setDicomFirstFramePreview,
		dicomFirstFrameViewerState,
		setDicomFirstFrameViewerState,
		dicomWebEndpointUrl,
		setDicomWebEndpointUrl,
		dicomWebCheck,
		setDicomWebCheck,
		dicomViewerLaunchManifest,
		setDicomViewerLaunchManifest,
		dicomViewerToolStateBundle,
		setDicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		setDicomViewerWorkbenchManifest,
		dicomWorkbenchLocalSavedAt,
		setDicomWorkbenchLocalSavedAt,
		dicomWorkbenchServerBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWorkbenchServerBundle,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dicomWorkbenchServerBundles,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setDicomWorkbenchServerBundles,
		dicomWorkstationReadiness,
		setDicomWorkstationReadiness,
		dicomRenderCachePlan,
		setDicomRenderCachePlan,
		selectedImagingStudyId,
		setSelectedImagingStudyId,
		imagingKindFilter,
		setImagingKindFilter,
		imagingViewerState,
		setImagingViewerState,
		imagingViewerActiveTool,
		setImagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		setCtPlanningActiveQuickActionId,
		ctPlanningImplantPlan,
		setCtPlanningImplantPlan,
		imagingViewerAnnotations,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingViewerAnnotations,
		imagingViewerNote,
		setImagingViewerNote,
		imagingViewerSession,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingViewerSession,
		imagingViewerSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingViewerSaveState,
		imagingViewerLocalSavedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingViewerLocalSavedAt,
		imagingViewerSaveError,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingViewerSaveError,
		imagingViewerSessionReady,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setImagingViewerSessionReady,
		mprProjection,
		setMprProjection,
		mprAxisDeg,
		setMprAxisDeg,
		mprSlabMm,
		setMprSlabMm,
		mprSliceIndex,
		setMprSliceIndex,
		mprWindowPreset,
		setMprWindowPreset,
		mprCrosshairEnabled,
		setMprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		setMprLinkedPlanesEnabled,
		mprWorkbenchLocalSavedAt,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprWorkbenchLocalSavedAt,
		mprWorkbenchDraftRestored,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setMprWorkbenchDraftRestored,
		isImagingImportLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsImagingImportLoading,
		isImagingImportCommitting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsImagingImportCommitting,
		imagingCreateSavingKind,
		setImagingCreateSavingKind,
		isImagingFolderScanning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsImagingFolderScanning,
		isDicomLocalDiscovering,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomLocalDiscovering,
		isLocalImagingOrganizing,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsLocalImagingOrganizing,
		isDicomSeriesPreviewLoading,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomSeriesPreviewLoading,
		isDicomWebChecking,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomWebChecking,
		isDicomManifestBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomManifestBuilding,
		isDicomToolStateBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomToolStateBuilding,
		isDicomWorkbenchBuilding,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomWorkbenchBuilding,
		isDicomWorkbenchServerSaving,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomWorkbenchServerSaving,
		isDicomWorkbenchReconnecting,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomWorkbenchReconnecting,
		isDicomWorkstationChecking,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomWorkstationChecking,
		isDicomRenderCachePlanning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomRenderCachePlanning,
		isDicomFolderWorkupPlanning,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomFolderWorkupPlanning,
		isDicomFirstFramePreviewing,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsDicomFirstFramePreviewing,
		isBrowserImagingFolderPicking,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsBrowserImagingFolderPicking,
		isLocalDicomOperationActive,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setIsLocalDicomOperationActive,
	} = useImagingStore();
	const localImagingRecoveryHydratedOrganizationIdRef = useRef<string | null>(
		null,
	);
	const [imagingPreviewObjectUrls, setImagingPreviewObjectUrls] = useState<
		Record<string, string>
	>({});
	const [_dicomFirstFramePreviewRequest, _setDicomFirstFramePreviewRequest] =
		useState<DicomFirstFramePreviewRequestContext | null>(null);
	const _browserImagingScanAbortRef = useRef<AbortController | null>(null);
	const _localDicomOperationAbortRef = useRef<AbortController | null>(null);
	const _imagingViewerSaveTimerRef = useRef<number | null>(null);
	const imagingQueries = useImagingQueries({ auth });
	const dicomWorkbenchModule = useDicomWorkbenchModule({
		auth,
		currentView,
		visibleImagingStudies: dashboard?.imagingStudies ?? [],
	});
	const {
		selectedImagingStudy,
		applyDicomWorkbenchManifest,
		loadDicomWorkbenchBundles,
	} = dicomWorkbenchModule;
	const imagingPreviewWorkset = useMemo(() => {
		if (currentView !== "imaging" || !dashboard?.imagingStudies?.length)
			return [];
		const activeStudies = (dashboard.imagingStudies || [])
			.filter((study) => study.patientId === dashboard?.activeVisit?.patientId)
			.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
		const visibleStudies =
			imagingKindFilter === "all"
				? activeStudies
				: activeStudies.filter((study) => study.kind === imagingKindFilter);
		const selectedStudy =
			visibleStudies?.find((study) => study.id === selectedImagingStudyId) ??
			visibleStudies[0] ??
			null;
		const comparisonStudies = selectedStudy
			? activeStudies
					.filter((study) => study.id !== selectedStudy.id)
					.map((study) => ({
						study,
						score: imagingComparisonScore(selectedStudy, study),
					}))
					.sort(
						(left, right) =>
							right.score - left.score ||
							imagingCaptureDistanceMs(
								selectedStudy.capturedAt,
								left.study.capturedAt,
							) -
								imagingCaptureDistanceMs(
									selectedStudy.capturedAt,
									right.study.capturedAt,
								) ||
							right.study.capturedAt.localeCompare(left.study.capturedAt),
					)
					.slice(0, 4)
					.map((item) => item.study)
			: [];
		const workset = new Map<string, Dashboard["imagingStudies"][number]>();
		[selectedStudy, ...comparisonStudies, ...visibleStudies].forEach(
			(study) => {
				if (study) workset.set(study.id, study);
			},
		);
		return Array.from(workset.values());
	}, [currentView, dashboard, imagingKindFilter, selectedImagingStudyId]);
	const _imagingPreviewSignature = imagingPreviewWorkset
		.map((study) => `${study.id}:${study.previewUrl}`)
		.join("|");
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!imagingPreviewWorkset.length) {
			setImagingPreviewObjectUrls((current) => {
				auth.revokeObjectUrlMap(current);
				return {};
			});
			return undefined;
		}

		let cancelled = false;
		const abortController = new AbortController();
		const createdUrls: string[] = [];
		void Promise.all(
			imagingPreviewWorkset.map(
				async (study): Promise<[string, string] | null> => {
					if (!study.previewUrl.startsWith("/api/"))
						return [study.id, study.previewUrl];
					const response = await fetch(study.previewUrl, {
						cache: "no-store",
						headers: auth.denteClinicalReadHeaders(),
						signal: abortController.signal,
					});
					if (!response.ok) return null;
					const blobUrl = URL.createObjectURL(await response.blob());
					if (cancelled) {
						auth.revokeObjectUrlIfNeeded(blobUrl);
						return null;
					}
					createdUrls.push(blobUrl);
					return [study.id, blobUrl];
				},
			),
		)
			.then((entries) => {
				if (cancelled) {
					createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
					return;
				}
				const next = Object.fromEntries(
					entries.filter((entry): entry is [string, string] => Boolean(entry)),
				);
				const nextUrls = new Set(Object.values(next));
				setImagingPreviewObjectUrls((current) => {
					Object.values(current).forEach((url) => {
						if (!nextUrls.has(url)) auth.revokeObjectUrlIfNeeded(url);
					});
					return next;
				});
			})
			.catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка при создании превью снимка",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
				if (!cancelled) {
					setImagingPreviewObjectUrls((current) => {
						auth.revokeObjectUrlMap(current);
						return {};
					});
				}
			});

		return () => {
			cancelled = true;
			abortController.abort();
			createdUrls.forEach(auth.revokeObjectUrlIfNeeded);
		};
	}, [
		imagingPreviewWorkset,
		auth.revokeObjectUrlIfNeeded,
		auth.denteClinicalReadHeaders,
		auth.revokeObjectUrlMap,
	]);
	useEffect(() => {
		let cancelled = false;
		const restore = async () => {
			const recovered =
				await loadLocalDicomWorkbenchDraft(activeOrganizationId);
			if (cancelled) return;
			if (recovered) {
				applyDicomWorkbenchManifest(recovered.manifest);
				setDicomWorkbenchLocalSavedAt(recovered.clientSavedAt);
			}
			void loadDicomWorkbenchBundles({
				silent: true,
				restoreLatest: !recovered,
			});
		};
		void restore();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		activeOrganizationId,
		setDicomWorkbenchLocalSavedAt,
		loadDicomWorkbenchBundles,
		applyDicomWorkbenchManifest,
	]);
	useEffect(() => {
		const organizationId = activeOrganizationId?.trim() ?? "";
		if (
			!organizationId ||
			localImagingRecoveryHydratedOrganizationIdRef.current === organizationId
		)
			return;
		localImagingRecoveryHydratedOrganizationIdRef.current = organizationId;
		const localFolderDraft = loadLocalImagingFolderDraft(organizationId);
		setLocalImagingFolderDraft(localFolderDraft);
		setImagingFolderPath(localFolderDraft?.folderPath ?? "C:\\Images");
		setBrowserPickedImagingFolder(
			loadBrowserPickedImagingFolderPreview(organizationId),
		);
	}, [
		activeOrganizationId,
		setImagingFolderPath,
		setLocalImagingFolderDraft,
		setBrowserPickedImagingFolder,
	]);
	async function createImagingStudy(kind: ImagingStudyKind) {
		if (imagingCreateSavingKind) {
			setError("Дождитесь завершения текущего добавления снимка.");
			return;
		}
		if (!activePatient || !dashboard) {
			setError("Выберите пациента и активный прием перед добавлением снимка.");
			return;
		}
		const titles: Record<ImagingStudyKind, string> = {
			periapical: "Прицельный 36",
			bitewing: "Интерпроксимальный контроль",
			opg: "ОПТГ",
			ceph: "ТРГ боковая",
			cbct: "КЛКТ / КТ",
			photo: "Фото полости рта",
			other: "Снимок",
		};
		setImagingCreateSavingKind(kind);
		try {
			const response = await fetch("/api/imaging/studies", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: activePatient.id,
					visitId: dashboard?.activeVisit?.id,
					kind,
					title: titles[kind],
					toothCode: kind === "periapical" ? "36" : null,
					region:
						kind === "opg" || kind === "cbct"
							? "обе челюсти"
							: kind === "ceph"
								? "профиль черепа"
								: "текущий прием",
					sourceKind:
						kind === "cbct" || kind === "opg" || kind === "ceph"
							? "dicom_file"
							: "sensor_bridge",
					sourceName:
						kind === "cbct" || kind === "opg" || kind === "ceph"
							? "Импорт КТ/снимков"
							: "Локальный RVG-датчик",
					/*
					 * ЗДЕСЬ ЗАПИСЫВАЛОСЬ ПОДЛОЖНОЕ ЗАКЛЮЧЕНИЕ ИИ.
					 * В aiSummary клали строку «Черновик: снимок добавлен в карту.
					 * Описание требует проверки врача». Весь экран «Снимки» считает
					 * непустой aiSummary признаком состоявшегося разбора: загорается
					 * бейдж «AI» с подсказкой «Есть AI-заключение ShadowAnalyst»,
					 * раскрывается панель «ShadowAnalyst · AI Expert», и в разделе
					 * «Заключение» стоит эта служебная фраза. Кнопка разбора при этом
					 * меняется с «AI-Диагностика» на «Обновить анализ».
					 *
					 * То есть снимок, которого никто не смотрел, помечался как
					 * имеющий заключение искусственного интеллекта. Настоящий разбор в
					 * проекте есть — apps/api/src/ai/visionAnalyzer.ts, две модели с
					 * перекрёстной проверкой, — тем важнее не путать его с заглушкой.
					 *
					 * Поле не заполняется: заключение появляется только после разбора.
					 */
				}),
			});
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Снимок не добавлен"));
				return;
			}
			const createdStudy = (await response.json()) as {
				id?: string;
				kind?: ImagingStudyKind;
			};
			await loadDashboard();
			if (createdStudy.kind) setImagingKindFilter(createdStudy.kind);
			if (createdStudy.id) setSelectedImagingStudyId(createdStudy.id);
			setError(null);
		} catch (imagingError) {
			showToast(
				actionFailureToast(
					"Снимок не добавлен",
					(imagingError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Снимок не добавлен", imagingError),
			);
		} finally {
			setImagingCreateSavingKind(null);
		}
	}
	const imagingViewerSaveTitle: Record<ImagingViewerSaveState, string> = {
		idle: "Сессия просмотра",
		local: "Локальный черновик сохранен",
		saving: "Сохраняю просмотр",
		saved: "Просмотр сохранен",
		queued: isOnline
			? "Повтор серверного сохранения в очереди"
			: "Офлайн-черновик сохранен",
		error: "Сохранение требует проверки",
	};
	const imagingViewerSaveDetail = [
		`${imagingViewerAnnotations.length} разметок`,
		imagingViewerLocalSavedAt
			? `локально ${formatTime(imagingViewerLocalSavedAt)}`
			: "локально ожидает",
		imagingViewerSession?.serverSavedAt
			? `сервер ${formatTime(imagingViewerSession.serverSavedAt)}`
			: "сервер ожидает",
		imagingViewerSaveError,
	]
		.filter(Boolean)
		.join(" · ");
	const canRetryImagingViewerSave =
		imagingViewerSessionReady &&
		Boolean(selectedImagingStudy?.id) &&
		(imagingViewerSaveState === "queued" || imagingViewerSaveState === "error");
	const imagingViewerNoteText = imagingViewerNote.trim();
	const imagingViewerNoteReady = imagingViewerNoteText.length > 0;
	const imagingViewerNoteMissingId = "imaging-viewer-note-missing";
	const imagingViewerRetryMissingId = "imaging-viewer-retry-missing";
	const imagingPreviewSource = (study: Dashboard["imagingStudies"][number]) =>
		imagingPreviewObjectUrls[study.id] ?? study.previewUrl;
	const imagingViewerHref = (study: Dashboard["imagingStudies"][number]) =>
		imagingPreviewObjectUrls[study.id] ?? study.viewerUrl ?? study.previewUrl;

	return {
		imagingImportText,
		setImagingImportText,
		imagingImportSourceKind,
		setImagingImportSourceKind,
		localImagingFolderDraft,
		setLocalImagingFolderDraft,
		imagingFolderPath,
		setImagingFolderPath,
		browserPickedImagingFolder,
		setBrowserPickedImagingFolder,
		browserImagingScanProgress,
		setBrowserImagingScanProgress,
		browserDirectoryPickerAvailable,
		setBrowserDirectoryPickerAvailable,
		imagingImportPreview,
		setImagingImportPreview,
		imagingImportCommit,
		setImagingImportCommit,
		imagingFolderScan,
		setImagingFolderScan,
		dicomLocalFolderDiscovery,
		setDicomLocalFolderDiscovery,
		localImagingOrganizer,
		setLocalImagingOrganizer,
		dicomSeriesPreview,
		setDicomSeriesPreview,
		dicomFolderSeriesScan,
		setDicomFolderSeriesScan,
		dicomFolderWorkupPlan,
		setDicomFolderWorkupPlan,
		dicomFirstFramePreview,
		setDicomFirstFramePreview,
		dicomFirstFrameViewerState,
		setDicomFirstFrameViewerState,
		dicomWebEndpointUrl,
		setDicomWebEndpointUrl,
		dicomWebCheck,
		setDicomWebCheck,
		dicomViewerLaunchManifest,
		setDicomViewerLaunchManifest,
		dicomViewerToolStateBundle,
		setDicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		setDicomViewerWorkbenchManifest,
		dicomWorkbenchLocalSavedAt,
		setDicomWorkbenchLocalSavedAt,
		dicomWorkbenchServerBundle,
		setDicomWorkbenchServerBundle,
		dicomWorkbenchServerBundles,
		setDicomWorkbenchServerBundles,
		dicomWorkstationReadiness,
		setDicomWorkstationReadiness,
		dicomRenderCachePlan,
		setDicomRenderCachePlan,
		selectedImagingStudyId,
		setSelectedImagingStudyId,
		imagingKindFilter,
		setImagingKindFilter,
		imagingViewerState,
		setImagingViewerState,
		imagingViewerActiveTool,
		setImagingViewerActiveTool,
		ctPlanningActiveQuickActionId,
		setCtPlanningActiveQuickActionId,
		ctPlanningImplantPlan,
		setCtPlanningImplantPlan,
		imagingViewerAnnotations,
		setImagingViewerAnnotations,
		imagingViewerNote,
		setImagingViewerNote,
		imagingViewerSession,
		setImagingViewerSession,
		imagingViewerSaveState,
		setImagingViewerSaveState,
		imagingViewerLocalSavedAt,
		setImagingViewerLocalSavedAt,
		imagingViewerSaveError,
		setImagingViewerSaveError,
		imagingViewerSessionReady,
		setImagingViewerSessionReady,
		mprProjection,
		setMprProjection,
		mprAxisDeg,
		setMprAxisDeg,
		mprSlabMm,
		setMprSlabMm,
		mprSliceIndex,
		setMprSliceIndex,
		mprWindowPreset,
		setMprWindowPreset,
		mprCrosshairEnabled,
		setMprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		setMprLinkedPlanesEnabled,
		mprWorkbenchLocalSavedAt,
		setMprWorkbenchLocalSavedAt,
		mprWorkbenchDraftRestored,
		setMprWorkbenchDraftRestored,
		isImagingImportLoading,
		setIsImagingImportLoading,
		isImagingImportCommitting,
		setIsImagingImportCommitting,
		imagingCreateSavingKind,
		setImagingCreateSavingKind,
		isImagingFolderScanning,
		setIsImagingFolderScanning,
		isDicomLocalDiscovering,
		setIsDicomLocalDiscovering,
		isLocalImagingOrganizing,
		setIsLocalImagingOrganizing,
		isDicomSeriesPreviewLoading,
		setIsDicomSeriesPreviewLoading,
		isDicomWebChecking,
		setIsDicomWebChecking,
		isDicomManifestBuilding,
		setIsDicomManifestBuilding,
		isDicomToolStateBuilding,
		setIsDicomToolStateBuilding,
		isDicomWorkbenchBuilding,
		setIsDicomWorkbenchBuilding,
		isDicomWorkbenchServerSaving,
		setIsDicomWorkbenchServerSaving,
		isDicomWorkbenchReconnecting,
		setIsDicomWorkbenchReconnecting,
		isDicomWorkstationChecking,
		setIsDicomWorkstationChecking,
		isDicomRenderCachePlanning,
		setIsDicomRenderCachePlanning,
		isDicomFolderWorkupPlanning,
		setIsDicomFolderWorkupPlanning,
		isDicomFirstFramePreviewing,
		setIsDicomFirstFramePreviewing,
		isBrowserImagingFolderPicking,
		setIsBrowserImagingFolderPicking,
		isLocalDicomOperationActive,
		setIsLocalDicomOperationActive,
		localImagingRecoveryHydratedOrganizationIdRef,
		imagingPreviewObjectUrls,
		setImagingPreviewObjectUrls,
		_dicomFirstFramePreviewRequest,
		_setDicomFirstFramePreviewRequest,
		_browserImagingScanAbortRef,
		_localDicomOperationAbortRef,
		_imagingViewerSaveTimerRef,
		imagingQueries,
		dicomWorkbenchModule,
		imagingPreviewWorkset,
		_imagingPreviewSignature,
		createImagingStudy,
		imagingViewerSaveTitle,
		imagingViewerSaveDetail,
		canRetryImagingViewerSave,
		imagingViewerNoteText,
		imagingViewerNoteReady,
		imagingViewerNoteMissingId,
		imagingViewerRetryMissingId,
		imagingPreviewSource,
		imagingViewerHref,
	};
}
