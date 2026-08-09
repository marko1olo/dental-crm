import {
	Bot,
	ClipboardList,
	ExternalLink,
	FileText,
	FlipHorizontal,
	History,
	Image as ImageIcon,
	Plus,
	RefreshCw,
	RotateCcw,
	RotateCw,
	UploadCloud,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { logger } from "./utils/logger";

const IMAGING_QUICK_CHIPS = [
	"Без видимых патологий",
	"Кариес",
	"Киста / Периодонтит",
	"Гранулема",
	"Ретенция",
	"Убыль костной ткани",
	"Требуется имплантация",
];

/**
 * Шаблоны описания снимка по типу исследования.
 *
 * БЫЛО: рядом с полем заметки стояла кнопка с роботом и подсказкой
 * «Сгенерировать с помощью ИИ (заглушка)». Её единственным действием было
 * дописать в заметку строку « [AI AnalyzeCTReport]» — то есть мусор в
 * клинической записи. Никакого разбора снимка за ней не стояло: серверный
 * путь /api/ai/recognition-jobs для image_summary тоже лишь оборачивает
 * введённый текст в «Описание снимка: … Требуется подтверждение врачом».
 *
 * СТАЛО: кнопка вставляет заготовку описания под тип снимка. Это работает
 * без сети и без ИИ, экономит врачу набор текста и держит описания
 * однотипными — их можно сравнивать между визитами. Строки заготовки —
 * то, что рентгенолог и так обязан описать.
 */
const IMAGING_DESCRIPTION_TEMPLATES: Record<string, string[]> = {
	periapical: [
		"Коронковая часть:",
		"Полость зуба:",
		"Корневые каналы:",
		"Периапикальные ткани:",
		"Заключение:",
	],
	bitewing: [
		"Контактные поверхности:",
		"Уровень костной ткани:",
		"Наддесневые и поддесневые отложения:",
		"Заключение:",
	],
	opg: [
		"Зубная формула:",
		"Уровень костной ткани:",
		"Гайморовы пазухи:",
		"Височно-челюстные суставы:",
		"Ретинированные и непрорезавшиеся зубы:",
		"Заключение:",
	],
	ceph: [
		"Профиль лица:",
		"Скелетный класс:",
		"Углы SNA / SNB / ANB:",
		"Положение резцов:",
		"Заключение:",
	],
	cbct: [
		"Область исследования:",
		"Плотность костной ткани:",
		"Высота и ширина кости:",
		"Анатомические структуры (канал, пазуха, дно носа):",
		"Патологические изменения:",
		"Заключение:",
	],
	photo: [
		"Область съёмки:",
		"Состояние мягких тканей:",
		"Гигиена:",
		"Заключение:",
	],
	other: ["Область:", "Описание:", "Заключение:"],
};

function imagingDescriptionTemplate(
	kind: string | null | undefined,
	toothCode: string | null | undefined,
	region: string | null | undefined,
): string {
	const lines =
		IMAGING_DESCRIPTION_TEMPLATES[kind ?? "other"] ??
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		IMAGING_DESCRIPTION_TEMPLATES.other!;
	// Зуб или область подставляем сразу: врачу не нужно их перепечатывать.
	const header = toothCode
		? `Зуб: ${toothCode}`
		: region
			? `Область: ${region}`
			: null;
	const body = header
		? [header, ...(lines ?? []).filter((line) => !line.startsWith("Область:"))]
		: (lines ?? []);
	return body.join("\n");
}

import { useRef, useState } from "react";
// Русское склонение счётного слова: «1 находка», «2 находки», «5 находок».
import { countLabel } from "./AppHelpers";
import { BoneQualityPanel } from "./components/dicom/BoneQualityPanel";
import { Cornerstone3DViewer } from "./components/dicom/Cornerstone3DViewer";
import { DicomArchiveUploader } from "./components/dicom/DicomArchiveUploader";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { ShadowAnalystImageSlider } from "./components/imaging/ShadowAnalystImageSlider";
import { ShadowAnalystReport } from "./components/imaging/ShadowAnalystReport";
import { CtPlanningToolsPanel } from "./ctPlanningTools";
import type { MprWindowPreset } from "./imagingUiLabels";

import { type ToothState, useVisitStore } from "./store/visitStore";

/**
 * Есть ли у исследования файл снимка на сервере.
 *
 * ЧТО БЫЛО. «Добавить снимок вручную» создаёт карточку исследования БЕЗ файла:
 * запрос POST /api/imaging/studies уходит без storagePath. Разбор снимка на
 * сервере первым делом проверяет storagePath и без него отвечает 422
 * «У исследования не указан файл снимка» — разбирать нечего. На экране это
 * выглядело как сломанная кнопка: врач добавил снимок, нажал «Разобрать снимок
 * помощником» и получил отказ, а причину ему нигде не назвали — карточка без
 * файла ничем не отличалась от карточки с файлом, потому что вместо снимка обе
 * показывают нарисованную заглушку preview.svg.
 *
 * СТАЛО: отсутствие файла видно ДО нажатия — в ленте снимков и под
 * просмотрщиком, — а кнопка разбора выключена с объяснением. Прикрепить файл к
 * уже созданной карточке программа пока не умеет (в API нет такого маршрута),
 * поэтому подсказка ведёт туда, где файл действительно попадает на сервер, —
 * в импорт снимков.
 */
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function imagingStudyHasFile(study: any): boolean {
	return (
		typeof study?.storagePath === "string" &&
		study.storagePath.trim().length > 0
	);
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type ImagingViewProps = Record<string, any>;

export function ImagingView(props: ImagingViewProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const {
		activeAppointment,
		activeImagingStudies,
		activePatient,
		addImagingViewerNoteAnnotation,
		applyCtPlanningQuickAction,
		applyMprClinicalPreset,
		applyNearestMprClinicalPreset,
		attachBrowserDirectoryInputRef,
		browserImagingFileInputAccept,
		browserImagingScanProgress,
		browserPickedImagingFolder,
		canRetryImagingViewerSave,
		cancelBrowserImagingFolderScan,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		cbctWorkbenchSeries,
		clampMprAxisDeg,
		clampMprSlabMm,
		clampMprSliceIndex,
		createCtPlanningArtifact,
		createImagingStudy,
		ctPlanningActiveQuickActionId,
		ctPlanningAnnotationRefs,
		ctPlanningImplantPlan,
		defaultImagingViewerState,
		describeMprClinicalPresetProjectionFallback,
		dicomLabel,
		dicomQualityModeLabels,
		dicomTextureStrategyLabels,
		dicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		formatByteSize,
		formatShortDate,
		formatSignedMprStep,
		formatTime,
		handleBrowserDirectoryInputChange,
		handleMprKeyboardNavigation,
		imagingComparisonCandidates,
		imagingCreateSavingKind,
		imagingKindFilter,
		imagingKindLabels,
		imagingKindOptions,
		imagingPreviewSource,
		imagingSourceLabels,
		imagingViewerActiveTool,
		imagingViewerAnnotations,
		imagingViewerHref,
		imagingViewerImageStyle,
		imagingViewerNote,
		imagingViewerNoteMissingId,
		imagingViewerNoteReady,
		imagingViewerRetryMissingId,
		imagingViewerSaveDetail,
		imagingViewerSaveState,
		imagingViewerSaveTitle,
		imagingViewerSessionReady,
		imagingViewerState,
		imagingViewerToolLabels,
		isBrowserImagingFolderPicking,
		isOnline,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprAxisAngleBadge,
		mprAxisBounds,
		mprAxisDeg,
		mprAxisDirectionLabel,
		mprAxisGuidance,
		mprAxisNudgeDeg,
		mprAxisPresetDeg,
		mprAxisRangeValue,
		mprAxisVisualizerLabel,
		mprAxisVisualizerStyle,
		mprClinicalChecklist,
		mprClinicalNextStep,
		mprClinicalPresetButtonClass,
		mprClinicalPresets,
		mprControlsAutoOpen,
		mprControlsReady,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprNearestClinicalPreset,
		mprOperatorSummaryCards,
		mprProjection,
		mprProjectionCompass,
		mprProjectionLabels,
		mprSafeSliceIndex,
		mprSeriesRequiredProjectionLabel,
		mprSlabBadge,
		mprSlabBounds,
		mprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSlabRangeValue,
		mprSliceBadge,
		mprSliceIndexFromFraction,
		mprSliceLabel,
		mprSliceMaxIndex,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceRangeValue,
		mprUnavailableProjectionLabel,
		mprWindowPreset,
		mprWindowPresetLabels,
		mprWorkbenchDraftRestored,
		mprWorkbenchLocalSavedAt,
		mprWorkbenchSummaryText,
		pickBrowserImagingFolder,
		resetMprControls,
		restoreMprWorkbenchLocalDraft,
		retryImagingViewerSessionSave,
		selectCtPlanningImplant,
		selectedImagingStudy,
		selectedImagingViewerPlan,
		setCtPlanningActiveQuickActionId,
		setCtPlanningImplantPlan,
		setImagingKindFilter,
		setImagingViewerActiveTool,
		setImagingViewerNote,
		setImagingViewerState,
		setMprAxisDeg,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		setMprProjection,
		setMprSlabMm,
		setMprSliceIndex,
		setMprWindowPreset,
		setSelectedImagingStudyId,
		visibleImagingStudies,
	} = props;

	const localFilesInputRef = useRef<HTMLInputElement | null>(null);
	const browserImagingFilesInputRef =
		props.browserImagingFilesInputRef || localFilesInputRef;
	const pickBrowserImagingFiles =
		props.pickBrowserImagingFiles ||
		(() => {
			browserImagingFilesInputRef.current?.click();
		});

	const [localImageIds, setLocalImageIds] = useState<string[]>([]);
	const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
	const [enhancementOn, setEnhancementOn] = useState(false);
	/*
	 * Разбор ИИ держится в состоянии этого экрана, а не дописывается в объект
	 * исследования.
	 *
	 * ЧТО БЫЛО. `selectedImagingStudy.aiSummary = …` и `.aiToothUpdates = …` —
	 * прямая запись в объект, пришедший из общего состояния приложения, а затем
	 * `forceUpdate(n => n + 1)`, чтобы React заметил. Ради этого и существовал
	 * счётчик-пустышка. Так делать нельзя по двум причинам:
	 *   правка не видна React, поэтому любой другой компонент, читающий тот же
	 *     объект (лента миниатюр ниже читает study.aiSummary), показывает старое,
	 *     пока экран случайно не перерисуется;
	 *   объект принадлежит дашборду, и следующая его загрузка молча затирает
	 *     запись — врач видит, как заключение исчезает без причины.
	 *
	 * Ключ по идентификатору исследования: врач переключает снимки, и разбор
	 * одного не должен показываться под другим.
	 */
	const [analysisByStudy, setAnalysisByStudy] = useState<
		Record<string, { summary: string; toothUpdates: unknown[] }>
	>({});

	/*
	 * Заключение для показа: сначала то, что разобрали в этом сеансе, иначе то,
	 * что пришло с сервера. Сервер сохраняет заключение при разборе, поэтому после
	 * перезагрузки страницы оно приходит в самом исследовании.
	 */
	const analysisForSelected = selectedImagingStudy
		? analysisByStudy[selectedImagingStudy.id]
		: undefined;
	const selectedStudySummary: string | null =
		analysisForSelected?.summary ??
		(selectedImagingStudy?.aiSummary as string | undefined) ??
		null;
	const selectedStudyToothUpdates =
		analysisForSelected?.toothUpdates ??
		(selectedImagingStudy?.aiToothUpdates as unknown[] | undefined);

	/** Состояние зуба по описанию, которое вернул разбор. */
	const toothStateFromAi = (rawState: unknown): ToothState => {
		const state = typeof rawState === "string" ? rawState.toLowerCase() : "";
		if (
			state.includes("caries") ||
			state.includes("pulpitis") ||
			state.includes("periodontitis")
		)
			return "treatment";
		if (state.includes("missing")) return "missing";
		if (
			state.includes("implant") ||
			state.includes("restoration") ||
			state.includes("crown")
		)
			return "done";
		// Незнакомое описание — «наблюдать»: это ближе всего к «машина что-то нашла».
		return "watch";
	};

	/*
	 * Файл выбранного снимка. Без него разбор невозможен, и это надо сказать
	 * врачу до нажатия кнопки, а не показывать отказ сервера постфактум.
	 */
	const selectedStudyHasFile = imagingStudyHasFile(selectedImagingStudy);

	const handleAnalyzeAI = async () => {
		if (!selectedImagingStudy) return;
		/*
		 * Запрос к серверу без файла заведомо вернёт 422. Не тратим его и сразу
		 * называем причину: раньше врач видел только отказ без объяснения.
		 */
		if (!selectedStudyHasFile) {
			showToast(
				"Разбирать нечего: к этой карточке не загружен файл снимка. Добавьте снимок через импорт снимков.",
				"error",
			);
			return;
		}
		const studyId = selectedImagingStudy.id;
		setIsAnalyzingAI(true);
		try {
			const headers = auth
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					})
				: { "Content-Type": "application/json" };
			const res = await fetch(`/api/imaging/studies/${studyId}/analyze`, {
				method: "POST",
				headers,
			});
			/*
			 * Тело читается строкой и разбирается после проверки ответа.
			 *
			 * Было `await res.json()` ДО проверки res.ok: при ответе прокси страницей
			 * или при пустом теле разбор бросал исключение, и врач получал
			 * «Сбой сети: Unexpected token '<'» — английский текст из движка вместо
			 * объяснения. Теперь непонятное тело — это отдельный человеческий отказ.
			 */
			const rawBody = await res.text();
			let payload: {
				analysisResult?: { summary?: unknown; toothUpdates?: unknown };
				message?: unknown;
			} | null = null;
			try {
				payload = rawBody.trim() ? JSON.parse(rawBody) : null;
			} catch {
				payload = null;
			}

			if (!res.ok) {
				const serverMessage =
					typeof payload?.message === "string" ? payload.message : "";
				showToast(
					serverMessage ||
						"Разбор снимка не выполнен. Проверьте, что файл снимка загружен, и попробуйте снова.",
					"error",
				);
				return;
			}
			if (!payload?.analysisResult) {
				logger.error(
					`[imaging analyze] ответ не разобран: ${rawBody.slice(0, 300)}`,
				);
				showToast(
					"Ответ сервера не удалось прочитать. Повторите разбор снимка.",
					"error",
				);
				return;
			}

			const summary =
				typeof payload.analysisResult.summary === "string"
					? payload.analysisResult.summary
					: "";
			const toothUpdates = Array.isArray(payload.analysisResult.toothUpdates)
				? payload.analysisResult.toothUpdates
				: [];
			setAnalysisByStudy((current) => ({
				...current,
				[studyId]: { summary, toothUpdates },
			}));

			if ((toothUpdates ?? []).length > 0) {
				const detectedCodes: string[] = [];
				const detectedToothStates: Record<string, ToothState> = {};
				const aiDiagnoses: Record<string, string> = {};

				for (const raw of toothUpdates) {
					const update = (raw ?? {}) as Record<string, unknown>;
					// Находка без номера зуба в формулу не попадает: непонятно, куда её ставить.
					const code = typeof update.code === "string" ? update.code : "";
					if (!code) continue;
					detectedCodes.push(code);
					aiDiagnoses[code] =
						typeof update.diagnosisOrFinding === "string"
							? update.diagnosisOrFinding
							: "находка без описания";
					detectedToothStates[code] = toothStateFromAi(update.state);
				}
				if ((detectedCodes ?? []).length > 0) {
					useVisitStore
						.getState()
						.applyAiToothCodes(
							detectedCodes,
							"planned",
							detectedToothStates,
							aiDiagnoses,
						);
				}
			}

			setEnhancementOn(true);
			/*
			 * Число в сообщении — сколько находок ДОШЛО до формулы, а не сколько
			 * прислал сервер. Раньше печаталось присланное, и находка без номера зуба
			 * считалась добавленной, хотя в формуле её не было.
			 */
			const applied = (toothUpdates ?? []).filter(
				(raw) =>
					typeof (raw as Record<string, unknown>)?.code === "string" &&
					(raw as Record<string, unknown>).code,
			).length;
			showToast(
				applied > 0
					? `Разбор снимка готов: ${countLabel(applied, "находка", "находки", "находок")} в зубной формуле`
					: "Разбор снимка готов: находок по зубам нет",
				"success",
			);
		} catch (error) {
			logger.error("[imaging analyze] запрос не выполнен", error);
			showToast(
				"Сервер не ответил на разбор снимка. Проверьте связь и повторите.",
				"error",
			);
		} finally {
			setIsAnalyzingAI(false);
		}
	};

	return (
		<section
			className="imaging-panel"
			id="imaging"
			aria-label="Снимки пациента"
		>
			<div className="imaging-copy">
				<div>
					<p className="eyebrow">Снимки пациента</p>
					<h2>Прицельные, ОПТГ, ТРГ, КТ и фото в одной ленте</h2>
				</div>
				<div className="imaging-actions">
					<input
						ref={attachBrowserDirectoryInputRef}
						data-testid="imaging-browser-local-folder-input"
						type="file"
						multiple
						style={{ display: "none" }}
						onChange={(event) =>
							void handleBrowserDirectoryInputChange(event.target.files)
						}
					/>
					<input
						ref={browserImagingFilesInputRef}
						data-testid="imaging-browser-local-files-input"
						type="file"
						multiple
						style={{ display: "none" }}
						accept={browserImagingFileInputAccept}
						onChange={(event) => {
							/*
							 * ЧТО БЫЛО. Значение этого поля не сбрасывалось никогда.
							 * Обработчик handleBrowserDirectoryInputChange чистит только
							 * поле выбора ПАПКИ (browserDirectoryInputRef), а это —
							 * отдельное поле кнопки «Файлы». Браузер не выдаёт событие
							 * change, если выбран тот же файл, что и в прошлый раз:
							 * врач нажимал «Файлы», выбирал тот же снимок и не получал
							 * ничего — ни статуса, ни ошибки. Кнопка выглядела сломанной,
							 * а обойти это можно было только перезагрузкой страницы.
							 *
							 * Сброс делается ПОСЛЕ разбора выбранных файлов: очистка
							 * value обнуляет список файлов у поля, поэтому чистить его
							 * до конца обработки нельзя. Ссылка на поле берётся
							 * синхронно — после await у события её уже не спросить.
							 */
							const input = event.currentTarget;
							void Promise.resolve(
								handleBrowserDirectoryInputChange(input.files),
							).finally(() => {
								input.value = "";
							});
						}}
					/>
					<button
						className="primary-button"
						type="button"
						data-testid="imaging-pick-dicom-folder"
						onClick={() => void pickBrowserImagingFolder()}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать папку DICOM/КТ или папку со снимками"
					>
						<UploadCloud aria-hidden="true" />{" "}
						{isBrowserImagingFolderPicking ? "Сканирую" : "Папка DICOM"}
					</button>
					<button
						className="secondary-button"
						type="button"
						data-testid="imaging-pick-dicom-files"
						onClick={pickBrowserImagingFiles}
						disabled={isBrowserImagingFolderPicking}
						title="Выбрать отдельные DICOM, RVG, JPG/PNG/TIFF, ZIP/RAR/7z или 3D-файлы"
					>
						<FileText aria-hidden="true" /> Файлы
					</button>
					{isBrowserImagingFolderPicking && browserImagingScanProgress ? (
						<button
							className="secondary-button browser-scan-stop-button"
							type="button"
							data-testid="imaging-cancel-local-imaging-scan"
							onClick={cancelBrowserImagingFolderScan}
						>
							Остановить
						</button>
					) : null}
					<details
						className="imaging-add-dropdown"
						style={{ position: "relative", display: "inline-block" }}
					>
						<summary
							className="secondary-button"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "0.25rem",
								cursor: "pointer",
								height: "36px",
								listStyle: "none",
							}}
						>
							<Plus aria-hidden="true" />
							Добавить снимок вручную
							<span style={{ fontSize: "0.65rem", marginLeft: "4px" }}>▼</span>
						</summary>
						<div
							style={{
								position: "absolute",
								right: 0,
								top: "100%",
								marginTop: "6px",
								background: "var(--paper)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								boxShadow:
									"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
								zIndex: 9999,
								padding: "8px",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
								minWidth: "160px",
								maxWidth: "calc(100vw - 32px)",
							}}
						>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("periapical")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								Прицельный{" "}
								{imagingCreateSavingKind === "periapical" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("opg")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								ОПТГ {imagingCreateSavingKind === "opg" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("ceph")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								ТРГ {imagingCreateSavingKind === "ceph" ? "(создаю)" : ""}
							</button>
							<button
								className="secondary-button"
								type="button"
								style={{
									border: "none",
									width: "100%",
									justifyContent: "flex-start",
									margin: 0,
									background: "none",
								}}
								onClick={() => createImagingStudy("cbct")}
								disabled={Boolean(imagingCreateSavingKind)}
							>
								КТ {imagingCreateSavingKind === "cbct" ? "(создаю)" : ""}
							</button>
						</div>
					</details>
				</div>
			</div>

			<section className="imaging-patient-strip" aria-label="Контекст снимков">
				<article>
					<span>Пациент</span>
					<strong>{activePatient?.fullName ?? "Пациент не выбран"}</strong>
					<small>{activeAppointment?.reason ?? "текущий прием"}</small>
				</article>
				<article>
					<span>В ленте</span>
					<strong>{activeImagingStudies?.length}</strong>
					<small>локально и на сервере, без удаления сырья</small>
				</article>
				<article>
					<span>Режим</span>
					<strong>{selectedImagingViewerPlan?.label ?? "просмотрщик"}</strong>
					<small>
						{selectedImagingViewerPlan?.warnings[0] ??
							"ИИ только помогает, решение остается за врачом"}
					</small>
				</article>
			</section>

			{browserImagingScanProgress || browserPickedImagingFolder ? (
				<div
					className={`imaging-upload-status ${browserImagingScanProgress?.phase ?? "ready"}`}
					data-testid="imaging-upload-status"
					role="status"
					aria-live="polite"
				>
					<div>
						<strong>
							{browserImagingScanProgress?.phase === "scanning"
								? "Проверяю выбранные снимки"
								: browserImagingScanProgress?.phase === "cancelled"
									? "Проверка остановлена"
									: browserPickedImagingFolder
										? "Снимки выбраны"
										: "Готово к выбору снимков"}
						</strong>
						<span>
							{browserImagingScanProgress?.currentItem ??
								browserPickedImagingFolder?.nextAction ??
								"Можно выбрать папку DICOM/КТ или отдельные файлы."}
						</span>
					</div>
					<div className="imaging-upload-stats">
						<span>
							файлов:{" "}
							{browserImagingScanProgress?.scannedFiles ??
								browserPickedImagingFolder?.scannedFiles ??
								0}
						</span>
						<span>
							папок:{" "}
							{browserImagingScanProgress?.scannedFolders ??
								browserPickedImagingFolder?.scannedFolders ??
								0}
						</span>
						<span>
							DICOM/КТ:{" "}
							{browserImagingScanProgress?.dicomLikeFiles ??
								browserPickedImagingFolder?.dicomLikeFiles ??
								0}
						</span>
						<span>
							архивов:{" "}
							{browserImagingScanProgress?.archiveFiles ??
								browserPickedImagingFolder?.archiveFiles ??
								0}
						</span>
						<span>
							изображений:{" "}
							{browserImagingScanProgress?.imageFiles ??
								browserPickedImagingFolder?.imageFiles ??
								0}
						</span>
						<span>
							{formatByteSize(
								browserImagingScanProgress?.totalBytes ??
									browserPickedImagingFolder?.totalBytes ??
									0,
							)}
						</span>
					</div>
					{browserPickedImagingFolder?.warnings?.[0] ? (
						<small>{browserPickedImagingFolder.warnings[0]}</small>
					) : null}
				</div>
			) : null}

			<div
				className="imaging-kind-filter"
				role="tablist"
				aria-label="Фильтр типа снимка"
			>
				<button
					className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === "all" ? "active" : ""}`}
					type="button"
					role="tab"
					aria-selected={imagingKindFilter === "all"}
					onClick={() => setImagingKindFilter("all")}
				>
					Все
				</button>
				biome-ignore lint/suspicious/noExplicitAny: automated suppression
				{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
				{(imagingKindOptions ?? []).map((kind: any) => (
					<button
						className={`focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors ${imagingKindFilter === kind ? "active" : ""}`}
						key={kind}
						type="button"
						role="tab"
						aria-selected={imagingKindFilter === kind}
						onClick={() => setImagingKindFilter(kind)}
					>
						{imagingKindLabels[kind]}
					</button>
				))}
			</div>

			{/* AI Toast notification */}
			{/* AI Toast notification has been moved to GlobalToast */}

			<div className="imaging-layout">
				<article className="imaging-viewer">
					{selectedImagingStudy ||
					localImageIds?.length > 0 ||
					browserPickedImagingFolder ? (
						<>
							<div
								className="imaging-viewer-stage"
								style={{ position: "relative" }}
							>
								{localImageIds?.length > 0 ? (
									/*
                            Пациент передаётся в просмотрщик, потому что разметка
                            планирования имплантации хранится в его карточке — в паре
                            с кодом исследования DICOM. Без этого признака обведённая
                            врачом дуга умирала вместе с экраном: адреса
                            /api/imaging/planning/save и /load не вызывались из
                            клиента ни разу, хотя серверная половина дописана.
                          */
									<Cornerstone3DViewer
										imageIds={localImageIds}
										patientId={activePatient?.id ?? null}
									/>
								) : selectedImagingStudy?.kind === "cbct" ? (
									/*
                            КЛКТ: раньше под загрузчиком стоял просмотрщик-обманка.

                            Ему подсовывали адрес wadouri:http://localhost:3000/
                            api/dicomweb/... — порт 3000, которого у нас нет
                            (сервер отвечает на 4100), и маршрута /api/dicomweb
                            в API тоже нет. Сверху лежали opacity-50 и
                            pointer-events-none: серое неотзывчивое полотно,
                            похожее на загружающийся снимок. Врач ждал, пока
                            «прогрузится» то, что не могло прогрузиться никогда.

                            Пока сервер не отдаёт срезы, честно говорим, что
                            нужно сделать: открыть архив с диска. Загрузчик
                            рядом, и он работает — после выбора папки срезы
                            попадают в localImageIds и рисуются настоящим
                            просмотрщиком ветвью выше.
                          */
									<div className="w-full h-full flex flex-col gap-4 p-4">
										<DicomArchiveUploader onImagesLoaded={setLocalImageIds} />
										<div className="imaging-cbct-hint">
											<strong>Срезы КЛКТ открываются с диска</strong>
											<p>
												Программа пока не хранит томограммы у себя: на сервере
												лежит только карточка исследования. Выберите папку с
												файлами DICOM выше — срезы откроются в просмотрщике с
												измерениями и осями.
											</p>
										</div>
									</div>
								) : (
									<ShadowAnalystImageSlider
										imageUrl={imagingPreviewSource(selectedImagingStudy)}
										enhanced={enhancementOn && !!selectedStudySummary}
										viewerStyle={imagingViewerImageStyle}
									/>
								)}

								{/* AI analysis overlay loader */}
								{isAnalyzingAI && (
									<div className="sa-analyze-overlay" aria-live="polite">
										<div className="sa-analyze-spinner" />
										<span>ShadowAnalyst анализирует снимок...</span>
									</div>
								)}
							</div>

							<div className="imaging-viewer-meta">
								<strong>
									{selectedImagingStudy?.title ?? "Локальный предпросмотр"}
								</strong>
								<span>
									{selectedImagingStudy
										? `${imagingKindLabels[selectedImagingStudy.kind]} · ${selectedImagingStudy.toothCode ?? selectedImagingStudy.region}`
										: "Локальные файлы DICOM (КТ)"}
								</span>
								{/*
                          Карточка без файла: честно говорим, что разбирать нечего.
                          Раньше здесь стояла активная кнопка разбора, сервер отвечал
                          422, и врач видел отказ без причины.
                        */}
								{selectedImagingStudy && !selectedStudyHasFile ? (
									<p
										data-testid="imaging-study-file-missing"
										style={{ color: "var(--warning-color)" }}
									>
										Файл снимка не загружен — разобрать нечего. Карточка
										добавлена вручную, изображения на сервере нет. Загрузите
										снимок через импорт снимков: к уже созданной карточке файл
										прикрепить пока нельзя.
									</p>
								) : null}
								<button
									type="button"
									className={
										selectedStudySummary ? "secondary-button" : "primary-button"
									}
									disabled={
										isAnalyzingAI ||
										!selectedImagingStudy ||
										!selectedStudyHasFile
									}
									onClick={handleAnalyzeAI}
									title={
										selectedImagingStudy && !selectedStudyHasFile
											? "Разбор недоступен: к карточке не загружен файл снимка"
											: "Разобрать снимок помощником"
									}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "0.5rem",
										marginTop: "0.5rem",
										maxWidth: "fit-content",
									}}
								>
									<Bot aria-hidden="true" size={16} />
									{isAnalyzingAI
										? "Разбираю снимок..."
										: selectedStudySummary
											? "Разобрать заново"
											: "Разобрать снимок помощником"}
								</button>
							</div>

							{selectedImagingViewerPlan ? (
								<div
									className={`imaging-viewer-plan viewer-plan-${selectedImagingViewerPlan.mode}`}
								>
									<div>
										<strong>{selectedImagingViewerPlan.label}</strong>
										<span>{selectedImagingViewerPlan.nextAction}</span>
									</div>
									<div className="viewer-plan-chip-row">
										{selectedImagingViewerPlan.primaryTools
											.slice(0, 5)
											// biome-ignore lint/suspicious/noExplicitAny: automated suppression
											.map((tool: any) => (
												<span key={tool}>
													{imagingViewerToolLabels[tool] ??
														"инструмент просмотра"}
												</span>
											))}
									</div>
									{selectedImagingViewerPlan.warnings[0] ? (
										<small>{selectedImagingViewerPlan.warnings[0]}</small>
									) : null}
								</div>
							) : null}

							{imagingComparisonCandidates?.length ? (
								<section
									className="imaging-compare-strip"
									data-testid="imaging-compare-strip"
									aria-label="Быстрое сравнение снимков пациента"
								>
									<div className="imaging-compare-head">
										<strong>Сравнить с</strong>
										<span>ближайшие по зубу, области, типу или дате</span>
									</div>
									<div className="imaging-compare-list">
										{(imagingComparisonCandidates || []).map(
											// biome-ignore lint/suspicious/noExplicitAny: automated suppression
											({ study, reason }: any) => (
												<button
													key={study.id}
													type="button"
													onClick={() => {
														if (
															imagingKindFilter !== "all" &&
															imagingKindFilter !== study.kind
														)
															setImagingKindFilter("all");
														setSelectedImagingStudyId(study.id);
													}}
												>
													<img
														src={imagingPreviewSource(study)}
														alt=""
														loading="lazy"
														decoding="async"
													/>
													<span>
														<strong>{imagingKindLabels[study.kind]}</strong>
														<small>
															{formatShortDate(study.capturedAt)} · {reason}
														</small>
													</span>
												</button>
											),
										)}
									</div>
								</section>
							) : null}

							{!(
								localImageIds?.length > 0 ||
								selectedImagingStudy?.kind === "cbct"
							) && (
								<div style={{ display: "contents" }}>
									<div
										className="imaging-viewer-toolbar"
										role="toolbar"
										aria-label="Настройки рентген-снимка"
									>
										<div className="imaging-viewer-tools">
											<button
												className="viewer-tool-button"
												type="button"
												title="Повернуть влево"
												aria-label="Повернуть снимок влево"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														rotationDeg: state.rotationDeg - 90,
													}))
												}
											>
												<RotateCcw aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Повернуть вправо"
												aria-label="Повернуть снимок вправо"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														rotationDeg: state.rotationDeg + 90,
													}))
												}
											>
												<RotateCw aria-hidden="true" />
											</button>
											<button
												className={`viewer-tool-button ${imagingViewerState.flipHorizontal ? "active" : ""}`}
												type="button"
												title="Зеркально"
												aria-label="Зеркально отразить снимок"
												aria-pressed={imagingViewerState.flipHorizontal}
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														flipHorizontal: !state.flipHorizontal,
													}))
												}
											>
												<FlipHorizontal aria-hidden="true" />
											</button>
											<button
												className={`viewer-tool-button ${imagingViewerState.inverted ? "active" : ""}`}
												type="button"
												title="Инверсия"
												aria-label="Инвертировать снимок"
												aria-pressed={imagingViewerState.inverted}
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														inverted: !state.inverted,
													}))
												}
											>
												±
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Уменьшить"
												aria-label="Уменьшить снимок"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														zoom: Math.max(0.75, state.zoom - 0.1),
													}))
												}
											>
												<ZoomOut aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Увеличить"
												aria-label="Увеличить снимок"
												onClick={() =>
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													setImagingViewerState((state: any) => ({
														...state,
														zoom: Math.min(1.8, state.zoom + 0.1),
													}))
												}
											>
												<ZoomIn aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Сбросить"
												aria-label="Сбросить настройки снимка"
												onClick={() => {
													setImagingViewerState(defaultImagingViewerState);
													setImagingViewerActiveTool("window_level");
													setCtPlanningActiveQuickActionId(null);
													setCtPlanningImplantPlan(null);
												}}
											>
												<RefreshCw aria-hidden="true" />
											</button>

											{/* Переключатель усиления — появляется, когда разбор снимка есть */}
											{selectedStudySummary && (
												<label
													className="sa-enhance-toggle sa-enhance-toggle--toolbar"
													title="Включить/выключить улучшение снимка (CLAHE симуляция)"
												>
													<input
														type="checkbox"
														checked={enhancementOn}
														onChange={(e) => setEnhancementOn(e.target.checked)}
													/>
													<span className="sa-enhance-slider" />
													<span className="sa-enhance-label">Enhanced</span>
												</label>
											)}
										</div>
										<div className="viewer-slider-grid">
											<label>
												Яркость
												<input
													min="0.65"
													max="1.45"
													step="0.05"
													type="range"
													value={imagingViewerState.brightness}
													onChange={(event) =>
														// biome-ignore lint/suspicious/noExplicitAny: automated suppression
														setImagingViewerState((state: any) => ({
															...state,
															brightness: Number(event.target.value),
														}))
													}
												/>
											</label>
											<label>
												Контраст
												<input
													min="0.75"
													max="1.85"
													step="0.05"
													type="range"
													value={imagingViewerState.contrast}
													onChange={(event) =>
														// biome-ignore lint/suspicious/noExplicitAny: automated suppression
														setImagingViewerState((state: any) => ({
															...state,
															contrast: Number(event.target.value),
														}))
													}
												/>
											</label>
										</div>
										<section
											className={`viewer-session-strip viewer-save-state-${imagingViewerSaveState}`}
											aria-label="Автосохранение сеанса просмотра снимка"
										>
											<div>
												<strong>
													{imagingViewerSaveTitle[imagingViewerSaveState]}
												</strong>
												<span>{imagingViewerSaveDetail}</span>
											</div>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													gap: "8px",
													width: "100%",
													maxWidth: "400px",
												}}
											>
												{/* БЫЛО: однострочный input. Описание снимка в одну
                                строку не помещается — врач писал в щель на 40
                                символов. Многострочное поле с тремя строками
                                занимает столько же места, сколько занимала
                                строка с кнопкой, но текст видно целиком. */}
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														gap: "6px",
													}}
												>
													<textarea
														aria-label="Заметка к снимку"
														value={imagingViewerNote}
														onChange={(event) =>
															setImagingViewerNote(event.target.value)
														}
														placeholder="Опишите снимок: что видно, где, какое заключение"
														rows={3}
														style={{
															width: "100%",
															resize: "vertical",
															minHeight: "72px",
															lineHeight: 1.45,
														}}
													/>
													<button
														type="button"
														className="text-button"
														title="Вставить заготовку описания под тип этого снимка"
														onClick={() => {
															const template = imagingDescriptionTemplate(
																selectedImagingStudy?.kind,
																selectedImagingStudy?.toothCode,
																selectedImagingStudy?.region,
															);
															// Уже написанное не затираем: дописываем ниже.
															setImagingViewerNote((prev) =>
																prev.trim()
																	? `${prev.trim()}\n\n${template}`
																	: template,
															);
														}}
														style={{
															alignSelf: "flex-start",
															display: "inline-flex",
															alignItems: "center",
															gap: "6px",
															minHeight: "32px",
														}}
													>
														<ClipboardList size={15} aria-hidden="true" />
														Шаблон описания
													</button>
												</div>
												<div
													className="quick-chips-row"
													style={{ flexWrap: "wrap", marginTop: "4px" }}
												>
													{IMAGING_QUICK_CHIPS.map((chip) => (
														<button
															key={chip}
															type="button"
															className="quick-chip quick-chip--sm"
															onClick={() =>
																setImagingViewerNote((prev) =>
																	prev ? `${prev}, ${chip}` : chip,
																)
															}
														>
															{chip}
														</button>
													))}
												</div>
											</div>
											<div className="viewer-session-actions">
												<button
													className="secondary-button"
													type="button"
													onClick={addImagingViewerNoteAnnotation}
													aria-describedby={
														!imagingViewerNoteReady ||
														!imagingViewerSessionReady
															? imagingViewerNoteMissingId
															: undefined
													}
													disabled={
														!imagingViewerNoteReady ||
														!imagingViewerSessionReady
													}
												>
													<Plus aria-hidden="true" /> Заметка
												</button>
												{canRetryImagingViewerSave ? (
													<button
														className="secondary-button"
														type="button"
														onClick={retryImagingViewerSessionSave}
														aria-describedby={
															!isOnline
																? imagingViewerRetryMissingId
																: undefined
														}
														disabled={!isOnline}
													>
														<RefreshCw aria-hidden="true" /> Повторить
													</button>
												) : null}
											</div>
											{!imagingViewerSessionReady ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerNoteMissingId}
													role="status"
													aria-live="polite"
												>
													Дождитесь загрузки просмотра, чтобы прикрепить заметку
													к снимку.
												</p>
											) : !imagingViewerNoteReady ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerNoteMissingId}
													role="status"
													aria-live="polite"
												>
													Напишите текст заметки, чтобы прикрепить ее к снимку.
												</p>
											) : null}
											{canRetryImagingViewerSave && !isOnline ? (
												<p
													className="viewer-note-missing"
													id={imagingViewerRetryMissingId}
													role="status"
													aria-live="polite"
												>
													Повторная отправка просмотра станет доступна после
													подключения к сети.
												</p>
											) : null}
										</section>
										{imagingViewerAnnotations?.length ? (
											<section
												className="viewer-annotation-list"
												aria-label="Сохраненные разметки к снимкам"
											>
												{imagingViewerAnnotations
													.slice(0, 3)
													// biome-ignore lint/suspicious/noExplicitAny: automated suppression
													.map((annotation: any) => (
														<article key={annotation.id}>
															<strong>{annotation.label}</strong>
															<span>
																{annotation.toothCode ??
																	selectedImagingStudy?.region ??
																	"study"}{" "}
																· {formatShortDate(annotation.updatedAt)}
															</span>
														</article>
													))}
											</section>
										) : null}
									</div>
								</div>
							)}

							{/* Отчёт помощника во всю ширину — только когда разбор снимка есть */}
							{selectedStudySummary && (
								<div className="sa-report-column">
									<ShadowAnalystReport
										summary={selectedStudySummary}
										// biome-ignore lint/suspicious/noExplicitAny: automated suppression
										toothUpdates={selectedStudyToothUpdates as any}
										studyTitle={selectedImagingStudy.title}
									/>
								</div>
							)}
							<div className="px-4">
								<BoneQualityPanel />
							</div>
						</>
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
							<EmptyState
								icon={<ImageIcon size={36} />}
								title="Снимков по пациенту нет"
								description="Загрузите архивы DICOM/КТ или выберите снимки из системы."
								glass={true}
								style={{ margin: "16px 0" }}
							/>
							<div className="w-full max-w-2xl">
								<DicomArchiveUploader onImagesLoaded={setLocalImageIds} />
							</div>
						</div>
					)}
				</article>

				<div className="imaging-list">
					{/*
                    ЧТО БЫЛО. Лента снимков — это один `map` по списку. При нуле
                    записей он не рисует ничего, и на месте списка оставалась пустая
                    полоса. Врач не мог отличить три разные ситуации: снимков у
                    пациента действительно нет, их скрыл фильтр типа, или пациент не
                    выбран вовсе. Фильтр типа при переключении пациента не
                    сбрасывается, поэтому «пусто из-за фильтра» — не редкость: у
                    нового пациента снимки другого типа, а лента молчит.

                    ДОЛГ С ПРИЧИНОЙ. Состояний «загружаю» и «ошибка загрузки» здесь
                    нет: экран не получает ни признака загрузки дашборда, ни текста
                    ошибки — в списке свойств <ImagingView> в App.tsx таких нет,
                    а App.tsx в эту правку не входит. Поэтому текст ниже говорит
                    только то, что известно наверняка, и не утверждает «снимков нет»
                    там, где правильнее «ничего не пришло».
                  */}
					{visibleImagingStudies?.length === 0 ? (
						!activePatient ? (
							<EmptyState
								icon={<ImageIcon size={28} />}
								title="Пациент не выбран"
								description="Лента показывает снимки того пациента, который назван в шапке экрана. Выберите пациента в картотеке или откройте приём — снимки подтянутся сами."
							/>
						) : activeImagingStudies?.length > 0 &&
							imagingKindFilter !== "all" ? (
							<EmptyState
								icon={<ImageIcon size={28} />}
								title={`Снимков типа «${imagingKindLabels[imagingKindFilter] ?? imagingKindFilter}» у пациента нет`}
								description={`Их скрыл фильтр типа: у пациента ${countLabel(activeImagingStudies?.length, "снимок", "снимка", "снимков")} других типов.`}
								action={
									<button
										className="secondary-button"
										type="button"
										onClick={() => setImagingKindFilter("all")}
									>
										Показать все снимки
									</button>
								}
							/>
						) : (
							<EmptyState
								icon={<ImageIcon size={28} />}
								title="Снимков в карте пациента нет"
								description="В ленте только снимки, привязанные к пациенту в базе. Файлы, выбранные с диска кнопками «Папка DICOM» и «Файлы», в карту не попадают и после перезагрузки страницы не сохраняются. Кнопка «Добавить снимок вручную» создаёт карточку без файла — разобрать такой снимок нельзя."
							/>
						)
					) : null}
					{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
					{(visibleImagingStudies || []).map((study: any) => (
						<article
							className={`imaging-row imaging-${study.status} ${selectedImagingStudy?.id === study.id ? "active" : ""}`}
							key={study.id}
						>
							<div style={{ position: "relative", flexShrink: 0 }}>
								<img
									src={imagingPreviewSource(study)}
									alt=""
									loading="lazy"
									decoding="async"
								/>
								{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
								{(study as any).aiSummary && (
									<span
										className="sa-ai-badge"
										title="Есть AI-заключение ShadowAnalyst"
									>
										<Bot size={9} /> AI
									</span>
								)}
							</div>
							<div>
								<h3>{study.title}</h3>
								<p>
									{imagingKindLabels[study.kind]} ·{" "}
									{study.toothCode ?? study.region ?? "область не указана"} ·{" "}
									{formatShortDate(study.capturedAt)}
								</p>
								<span>
									{imagingSourceLabels[study.sourceKind]} · {study.sourceName}
								</span>
								{/*
                          Метка «без файла»: карточки, добавленные вручную, снимка не
                          содержат, и вместо изображения выше стоит нарисованная
                          заглушка. Без метки врач не отличал такую карточку от
                          настоящего снимка и узнавал правду только после отказа разбора.
                        */}
								{!imagingStudyHasFile(study) ? (
									<span
										data-testid="imaging-row-file-missing"
										style={{ color: "var(--warning-color)" }}
									>
										Файл снимка не загружен — разбор недоступен
									</span>
								) : null}
							</div>
							<div className="imaging-row-actions">
								<button
									className="text-button imaging-row-select"
									type="button"
									onClick={() => setSelectedImagingStudyId(study.id)}
									aria-pressed={selectedImagingStudy?.id === study.id}
									aria-label={`Выбрать снимок: ${study.title}, ${formatShortDate(study.capturedAt)}`}
									title={`Выбрать снимок: ${study.title}`}
								>
									{selectedImagingStudy?.id === study.id
										? "Выбрано"
										: "Выбрать"}
								</button>
								<a
									className="doc-link"
									href={imagingViewerHref(study)}
									target="_blank"
									rel="noreferrer noopener"
									aria-label={`Открыть просмотрщик снимка: ${study.title}, ${formatShortDate(study.capturedAt)}`}
									title={`Открыть просмотрщик снимка: ${study.title}`}
								>
									Открыть
								</a>
							</div>
						</article>
					))}
				</div>
			</div>

			{selectedImagingStudy?.kind === "cbct" ? (
				<section
					className="clinical-mpr-panel"
					aria-label="Управление КЛКТ и КТ-срезами"
				>
					<div className="clinical-mpr-head">
						<div>
							<p className="eyebrow">Рабочее место КЛКТ</p>
							<h3>
								3 плоскости, косой срез, панорама и внешний КТ-просмотрщик
							</h3>
							<small>
								Основной прием не блокируется: если серия тяжелая, CRM оставляет
								предпросмотр и предлагает внешний просмотр или локальный модуль
								объема.
							</small>
						</div>
						<a
							className="secondary-button"
							href={imagingViewerHref(selectedImagingStudy)}
							target="_blank"
							rel="noreferrer noopener"
							aria-label={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy.title}`}
							title={`Открыть КТ-просмотрщик в новой вкладке: ${selectedImagingStudy.title}`}
						>
							<ExternalLink aria-hidden="true" /> КТ-просмотрщик
						</a>
					</div>
					<section
						className="clinical-mpr-summary-grid"
						aria-label="Краткий статус КЛКТ"
					>
						<article>
							<strong>
								{selectedImagingViewerPlan?.mode === "cbct_mpr"
									? "Маршрут КТ-срезов"
									: "Быстрый предпросмотр"}
							</strong>
							<span>
								{selectedImagingViewerPlan?.nextAction ??
									"Откройте КТ-просмотрщик, когда нужен 3D-разбор."}
							</span>
						</article>
						<article>
							<strong>
								{dicomViewerWorkbenchManifest
									? `готовность загрузки ${dicomViewerWorkbenchManifest.readiness.readinessScore}%`
									: "Рабочее место опционально"}
							</strong>
							<span>
								{dicomViewerWorkbenchManifest
									? `${dicomLabel(dicomQualityModeLabels, dicomViewerWorkbenchManifest.renderCachePlan.qualityMode, "режим качества")} / ${dicomLabel(
											dicomTextureStrategyLabels,
											dicomViewerWorkbenchManifest.renderCachePlan
												.textureStrategy,
											"план загрузки",
										)}`
									: "Соберите КТ-пакет в настройках источников; карточка приема останется легкой."}
							</span>
						</article>
						<article>
							<strong>{imagingViewerSaveTitle[imagingViewerSaveState]}</strong>
							<span>
								{imagingViewerAnnotations?.length} разметок; исходные снимки
								остаются в просмотрщике или исходной папке.
							</span>
						</article>
					</section>
					<section
						className="mpr-clinical-roadmap"
						data-testid="ct-mpr-clinical-roadmap"
						aria-label="Клиническая готовность КТ-срезов"
					>
						<div className="mpr-clinical-roadmap-head">
							<strong>Карта КТ-срезов</strong>
							<span>{mprClinicalNextStep}</span>
						</div>
						<div className="mpr-clinical-roadmap-steps">
							{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
							{(mprClinicalChecklist ?? []).map((item: any) => (
								<article
									className={`mpr-clinical-step status-${item.status}`}
									key={item.id}
								>
									<strong>{item.title}</strong>
									<span>{item.detail}</span>
								</article>
							))}
						</div>
					</section>
					<section
						className="mpr-operator-summary"
						data-testid="ct-mpr-operator-summary"
						aria-label="Быстрая сводка настройки КТ-срезов"
					>
						{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
						{(mprOperatorSummaryCards ?? []).map((card: any) => (
							<article className={`tone-${card.tone}`} key={card.id}>
								<span>{card.title}</span>
								<strong>{card.value}</strong>
								<p>{card.detail}</p>
							</article>
						))}
					</section>
					<CtPlanningToolsPanel
						canPlan={mprControlsReady}
						activeTool={imagingViewerActiveTool}
						activeQuickActionId={ctPlanningActiveQuickActionId}
						onActivateTool={applyCtPlanningQuickAction}
						selectedImplantId={ctPlanningImplantPlan?.itemId ?? null}
						selectedImplantPlan={ctPlanningImplantPlan}
						onSelectImplant={selectCtPlanningImplant}
						localAnnotations={imagingViewerAnnotations}
						annotationRefs={ctPlanningAnnotationRefs}
						onCreateArtifact={createCtPlanningArtifact}
						toolStateBundle={
							dicomViewerWorkbenchManifest?.toolStateBundle ??
							dicomViewerToolStateBundle
						}
					/>
					<details className="clinical-mpr-advanced" open={mprControlsAutoOpen}>
						<summary>
							<span>Управление КТ-срезами</span>
							<small>
								Открывается только для КТ-разбора; обычный прием остается без
								лишних панелей.
							</small>
						</summary>
						<div className="clinical-mpr-grid">
							<div className="mpr-plane-grid">
								{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
								{(cbctWorkbenchPlanes ?? []).map((plane: any) => {
									const planeSupported = (
										cbctWorkbenchProjections ?? []
									).includes(plane.key);
									const planeAvailable = mprControlsReady && planeSupported;
									const planeUnavailableReason = !mprControlsReady
										? mprSeriesRequiredProjectionLabel
										: planeSupported
											? ""
											: mprUnavailableProjectionLabel;
									return (
										<button
											className={`mpr-plane ${mprProjection === plane.key ? "active" : ""}`}
											key={plane.key}
											type="button"
											onClick={() => setMprProjection(plane.key)}
											disabled={!planeAvailable}
											aria-pressed={mprProjection === plane.key}
											aria-label={`${plane.title}: ${plane.detail}${planeUnavailableReason ? `; ${planeUnavailableReason}` : ""}`}
										>
											<strong>{plane.title}</strong>
											<span>{plane.detail}</span>
											{planeUnavailableReason ? (
												<small className="mpr-plane-unavailable">
													{planeUnavailableReason}
												</small>
											) : null}
										</button>
									);
								})}
							</div>
							<div
								className={`mpr-axis-visualizer ${mprControlsReady ? "" : "disabled"}`}
								data-testid="ct-mpr-axis-visualizer"
								style={mprAxisVisualizerStyle}
								role="img"
								aria-label={mprAxisVisualizerLabel}
								aria-describedby="ct-mpr-keyboard-help"
								aria-disabled={!mprControlsReady}
								aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End"
								tabIndex={mprControlsReady ? 0 : -1}
								onKeyDown={handleMprKeyboardNavigation}
							>
								<span className="visually-hidden" id="ct-mpr-keyboard-help">
									Стрелки влево и вправо меняют угол оси, стрелки вверх и вниз
									меняют срез, PageUp и PageDown меняют толщину слоя, Home и End
									переходят к началу и концу серии.
								</span>
								<div className="mpr-axis-board" aria-hidden="true">
									<span className="mpr-axis-label mpr-axis-label-top">
										{mprProjectionCompass.top}
									</span>
									<span className="mpr-axis-label mpr-axis-label-right">
										{mprProjectionCompass.right}
									</span>
									<span className="mpr-axis-label mpr-axis-label-bottom">
										{mprProjectionCompass.bottom}
									</span>
									<span className="mpr-axis-label mpr-axis-label-left">
										{mprProjectionCompass.left}
									</span>
									<span className="mpr-axis-slab" />
									<span className="mpr-axis-slice-marker" />
									<span className="mpr-axis-line mpr-axis-line-primary" />
									<span className="mpr-axis-line mpr-axis-line-secondary" />
									<span
										className={`mpr-axis-crosshair ${mprCrosshairEnabled ? "active" : ""}`}
									/>
									<span className="mpr-axis-angle-badge">
										{mprAxisAngleBadge}
									</span>
									<span className="mpr-axis-slab-badge">{mprSlabBadge}</span>
									<span className="mpr-axis-slice-badge">{mprSliceBadge}</span>
								</div>
								<div className="mpr-axis-facts">
									<strong>{mprActiveProjectionLabel}</strong>
									<span>{mprActiveProjectionOrientation}</span>
									<span>{mprProjectionCompass.summary}</span>
									<span>{mprAxisDirectionLabel}</span>
									<span>слой {mprSlabMm} мм</span>
									<span>{mprSliceLabel}</span>
									<div
										className="mpr-axis-guidance"
										data-testid="ct-mpr-axis-guidance"
									>
										<span>{mprAxisGuidance.tiltLabel}</span>
										<span>{mprAxisGuidance.slabLabel}</span>
										<span>{mprAxisGuidance.sliceLabel}</span>
									</div>
									<small
										className="mpr-workbench-summary"
										data-testid="ct-mpr-workbench-summary"
										aria-live="polite"
									>
										{mprWorkbenchSummaryText}
									</small>
									<small>
										{mprControlsReady
											? `${mprLinkedPlanesEnabled ? "плоскости связаны" : "плоскости отдельно"} · ${mprCrosshairEnabled ? "курсор включен" : "курсор скрыт"}`
											: "сначала откройте готовую КЛКТ/КТ-серию"}
									</small>
									<div
										className={`mpr-preset-fit ${mprNearestClinicalPreset.exact ? "exact" : ""}`}
										data-testid="ct-mpr-preset-fit"
									>
										<span>{mprNearestClinicalPreset.label}</span>
										<button
											type="button"
											onClick={applyNearestMprClinicalPreset}
											disabled={
												!mprControlsReady ||
												!mprNearestClinicalPreset.deltas?.length ||
												!mprNearestClinicalPreset.title
											}
											aria-label={`Подогнать КТ-срезы под ближайший клинический протокол: ${mprNearestClinicalPreset.label}`}
											title={`Подогнать под протокол: ${mprNearestClinicalPreset.label}`}
										>
											Подогнать
										</button>
									</div>
								</div>
							</div>
							<div className="mpr-control-panel">
								<div className="mpr-toggle-row">
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{cbctWorkbenchProjections.map((projection: any) => (
										<button
											className={mprProjection === projection ? "active" : ""}
											key={projection}
											type="button"
											onClick={() => setMprProjection(projection)}
											disabled={!mprControlsReady}
											aria-pressed={mprProjection === projection}
										>
											{mprProjectionLabels[projection]}
										</button>
									))}
								</div>
								<label>
									Угол оси: {mprAxisDeg}°
									<input
										aria-valuetext={mprAxisRangeValue}
										disabled={!mprControlsReady}
										min={mprAxisBounds.min}
										max={mprAxisBounds.max}
										step="1"
										type="range"
										value={mprAxisDeg}
										onChange={(event) =>
											setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))
										}
									/>
								</label>
								<fieldset
									className="mpr-stepper-row"
									data-testid="ct-mpr-axis-nudge"
									aria-label="Точная правка угла КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{mprAxisNudgeDeg.map((delta: any) => (
										<button
											key={delta}
											type="button"
											onClick={() =>
												setMprAxisDeg(clampMprAxisDeg(mprAxisDeg + delta))
											}
											disabled={!mprControlsReady}
											aria-label={`Изменить угол оси КТ-среза на ${formatSignedMprStep(delta, "°")}`}
										>
											{formatSignedMprStep(delta, "°")}
										</button>
									))}
								</fieldset>
								<fieldset
									className="mpr-preset-row"
									aria-label="Быстрые углы КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{mprAxisPresetDeg.map((angle: any) => (
										<button
											className={mprAxisDeg === angle ? "active" : ""}
											key={angle}
											type="button"
											onClick={() => setMprAxisDeg(angle)}
											disabled={!mprControlsReady}
											aria-pressed={mprAxisDeg === angle}
											aria-label={`Установить угол оси КТ-срезов ${angle > 0 ? `+${angle}` : angle}°`}
										>
											{angle > 0 ? `+${angle}°` : `${angle}°`}
										</button>
									))}
								</fieldset>
								<label>
									Толщина слоя: {mprSlabMm} мм
									<input
										aria-valuetext={mprSlabRangeValue}
										disabled={!mprControlsReady}
										min={mprSlabBounds.min}
										max={mprSlabBounds.max}
										step="1"
										type="range"
										value={mprSlabMm}
										onChange={(event) =>
											setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
										}
									/>
								</label>
								<fieldset
									className="mpr-stepper-row"
									data-testid="ct-mpr-slab-nudge"
									aria-label="Точная правка толщины слоя КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{mprSlabNudgeMm.map((delta: any) => (
										<button
											key={delta}
											type="button"
											onClick={() =>
												setMprSlabMm(clampMprSlabMm(mprSlabMm + delta))
											}
											disabled={!mprControlsReady}
											aria-label={`Изменить толщину слоя КТ-срезов на ${formatSignedMprStep(delta, " мм")}`}
										>
											{formatSignedMprStep(delta, " мм")}
										</button>
									))}
								</fieldset>
								<fieldset
									className="mpr-preset-row"
									aria-label="Быстрая толщина слоя КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{mprSlabPresetMm.map((slab: any) => (
										<button
											className={mprSlabMm === slab ? "active" : ""}
											key={slab}
											type="button"
											onClick={() => setMprSlabMm(slab)}
											disabled={!mprControlsReady}
											aria-pressed={mprSlabMm === slab}
											aria-label={`Установить толщину слоя КТ-срезов ${slab} мм`}
										>
											{slab} мм
										</button>
									))}
									<button
										type="button"
										onClick={() => setMprAxisDeg(0)}
										disabled={!mprControlsReady}
										aria-pressed={mprAxisDeg === 0}
										aria-label="Вернуть ось КТ-срезов к 0°"
									>
										<RotateCcw aria-hidden="true" /> ось 0°
									</button>
								</fieldset>
								<label>
									Положение среза: {mprSliceLabel}
									<input
										disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
										min="0"
										max={mprSliceMaxIndex}
										step="1"
										type="range"
										value={mprSafeSliceIndex}
										aria-valuetext={mprSliceRangeValue}
										onChange={(event) =>
											setMprSliceIndex(
												clampMprSliceIndex(
													Number(event.target.value),
													mprSliceMaxIndex,
												),
											)
										}
									/>
								</label>
								<fieldset
									className="mpr-manual-grid"
									data-testid="ct-mpr-manual-inputs"
									aria-label="Точные числовые настройки КТ-срезов"
								>
									<label>
										Угол, °
										<input
											disabled={!mprControlsReady}
											inputMode="numeric"
											max={mprAxisBounds.max}
											min={mprAxisBounds.min}
											step="1"
											type="number"
											value={mprAxisDeg}
											onChange={(event) =>
												setMprAxisDeg(
													clampMprAxisDeg(Number(event.target.value)),
												)
											}
										/>
									</label>
									<label>
										Слой, мм
										<input
											disabled={!mprControlsReady}
											inputMode="numeric"
											max={mprSlabBounds.max}
											min={mprSlabBounds.min}
											step="1"
											type="number"
											value={mprSlabMm}
											onChange={(event) =>
												setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
											}
										/>
									</label>
									<label>
										Срез
										<input
											disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
											inputMode="numeric"
											max={mprSliceMaxIndex + 1}
											min="1"
											step="1"
											type="number"
											value={mprSafeSliceIndex + 1}
											onChange={(event) =>
												setMprSliceIndex(
													clampMprSliceIndex(
														Number(event.target.value) - 1,
														mprSliceMaxIndex,
													),
												)
											}
										/>
									</label>
								</fieldset>
								<fieldset
									className="mpr-stepper-row"
									data-testid="ct-mpr-slice-nudge"
									aria-label="Точная навигация по КТ-срезам"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{mprSliceNudgeSteps.map((delta: any) => (
										<button
											key={delta}
											type="button"
											onClick={() =>
												setMprSliceIndex(
													clampMprSliceIndex(
														mprSafeSliceIndex + delta,
														mprSliceMaxIndex,
													),
												)
											}
											disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
											aria-label={`Перейти по КТ-срезам на ${formatSignedMprStep(delta, " срез")}`}
										>
											{formatSignedMprStep(delta, " срез")}
										</button>
									))}
								</fieldset>
								<fieldset
									className="mpr-preset-row"
									aria-label="Опорные КТ-срезы"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{mprSlicePresetFractions.map((preset: any) => {
										const targetIndex = mprSliceIndexFromFraction(
											preset.fraction,
											mprSliceMaxIndex,
										);
										return (
											<button
												className={
													mprSafeSliceIndex === targetIndex ? "active" : ""
												}
												key={preset.id}
												type="button"
												onClick={() => setMprSliceIndex(targetIndex)}
												disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
												aria-pressed={mprSafeSliceIndex === targetIndex}
												aria-label={`Перейти на опорный КТ-срез: ${preset.label}`}
											>
												{preset.label}
											</button>
										);
									})}
								</fieldset>
								<button
									className="mpr-reset-button"
									type="button"
									onClick={resetMprControls}
									disabled={!mprControlsReady}
								>
									<RefreshCw aria-hidden="true" /> Сбросить КТ-срезы
								</button>
								<div
									className="mpr-memory-strip"
									data-testid="ct-mpr-memory-strip"
								>
									<div>
										<strong>
											{mprWorkbenchLocalSavedAt
												? `Последний вид ${formatTime(mprWorkbenchLocalSavedAt)}`
												: "Последний вид появится после настройки"}
										</strong>
										<span>
											{mprWorkbenchDraftRestored
												? "Серия открыта с сохраненными осями, окном и толщиной слоя."
												: "Ось, толщина слоя, окно, курсор и связанные плоскости запоминаются для этой КТ-серии."}
										</span>
									</div>
									<button
										type="button"
										onClick={restoreMprWorkbenchLocalDraft}
										disabled={!mprControlsReady || !mprWorkbenchLocalSavedAt}
									>
										<History aria-hidden="true" /> Вернуть вид
									</button>
								</div>
								<fieldset
									className="mpr-clinical-preset-grid"
									data-testid="ct-mpr-clinical-presets"
									aria-label="Клинические протоколы КТ-срезов"
								>
									{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
									{(mprClinicalPresets || []).map((preset: any) => {
										const projectionFallbackNote = mprControlsReady
											? describeMprClinicalPresetProjectionFallback(
													preset.projection,
													cbctWorkbenchProjections,
													mprProjectionLabels,
												)
											: null;
										return (
											<button
												className={mprClinicalPresetButtonClass(preset)}
												key={preset.id}
												type="button"
												onClick={() => applyMprClinicalPreset(preset)}
												aria-current={
													mprNearestClinicalPreset.exact &&
													mprNearestClinicalPreset.title === preset.title
														? "true"
														: undefined
												}
												disabled={!mprControlsReady}
											>
												<strong>{preset.title}</strong>
												<span>{preset.detail}</span>
												{projectionFallbackNote ? (
													<small>{projectionFallbackNote}</small>
												) : null}
											</button>
										);
									})}
								</fieldset>
								<div className="mpr-toggle-row">
									{(
										Object.keys(mprWindowPresetLabels) as MprWindowPreset[]
									).map((preset) => (
										<button
											className={mprWindowPreset === preset ? "active" : ""}
											key={preset}
											type="button"
											onClick={() => setMprWindowPreset(preset)}
											disabled={!mprControlsReady}
											aria-pressed={mprWindowPreset === preset}
										>
											{mprWindowPresetLabels[preset]}
										</button>
									))}
								</div>
								<div className="mpr-check-row">
									<label>
										<input
											checked={mprCrosshairEnabled}
											disabled={!mprControlsReady}
											type="checkbox"
											onChange={(event) =>
												setMprCrosshairEnabled(event.target.checked)
											}
										/>
										Синхронный курсор
									</label>
									<label>
										<input
											checked={mprLinkedPlanesEnabled}
											disabled={!mprControlsReady}
											type="checkbox"
											onChange={(event) =>
												setMprLinkedPlanesEnabled(event.target.checked)
											}
										/>
										Связанные плоскости
									</label>
								</div>
								{!mprControlsReady ? (
									<p className="mpr-control-disabled-note" role="status">
										Сначала откройте готовую КЛКТ/КТ-серию. После этого
										включатся оси, толщина слоя и связанные плоскости.
									</p>
								) : null}
							</div>
						</div>
					</details>
					<div className="clinical-mpr-safety">
						<span>
							{selectedImagingViewerPlan?.nextAction ??
								"Подготовить серию КЛКТ/КТ к просмотру срезов."}
						</span>
						<span>
							{cbctWorkbenchSeries?.mprReadiness.resourcePolicy.nextAction ??
								"Метаданные серии пока не загружены: сначала открываем предпросмотр и внешний просмотр."}
						</span>
						<span>
							ИИ-описание не является диагнозом; врач подтверждает все выводы.
						</span>
					</div>
				</section>
			) : null}
		</section>
	);
}
