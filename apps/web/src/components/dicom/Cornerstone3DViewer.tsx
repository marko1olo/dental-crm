import * as cornerstone from "@cornerstonejs/core";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as cornerstoneTools from "@cornerstonejs/tools";
import { vec3 } from "gl-matrix";
import { useEffect, useRef, useState } from "react";
import {
	distancePointToSpline,
	mat3ToMat4Direction,
	type Point2D,
	toTransferableScalarData,
} from "../../mprMath";
import {
	archControlPointsOf,
	archFromStoredControlPoints,
	type CtPlanningMarkup,
	ctPlanningMarkupIsEmpty,
	ctPlanningRestoredLabel,
	emptyCtPlanningMarkup,
	loadCtPlanningMarkup,
	type StoredImplant,
	saveCtPlanningMarkup,
	type WorldPoint3,
	worldTriple,
} from "./ctPlanningPersistence";
import {
	PanoramicRendererWindow,
	type PanoramicVolumeInput,
} from "./PanoramicRendererWindow";
import {
	buildPanoramicArch,
	type DrawnArchAnnotation,
	type PanoramicIssue,
	panoramicIssueLabels,
	panoramicReadyLabel,
	readVolumeScalarData,
} from "./panoramicArch";

export interface ImplantData {
	id: string;
	fdiCode: string;
	diameter: number;
	length: number;
	startWorld: vec3;
	endWorld: vec3;
	boneDensity: { averageHU: number; classification: string };
	distanceToNerve: number;
}

interface Cornerstone3DViewerProps {
	imageIds: string[];
	/**
	 * Пациент, чей снимок открыт. Без него разметку планирования некуда сохранять:
	 * строка в базе существует только в паре пациент + исследование. Приходит из
	 * `ImagingView` (`activePatient?.id`); когда пациент не выбран, просмотр
	 * работает как раньше, а сохранение честно отказывает текстом на экране.
	 */
	patientId?: string | null;
}

/** Задержка перед записью правки уже обведённой дуги. Разбор — у `scheduleMarkupSave`. */
const MARKUP_SAVE_DEBOUNCE_MS = 1500;

/**
 * Импланты компонента в форму, пригодную для записи.
 *
 * `startWorld`/`endWorld` — это `vec3`, то есть `Float32Array`, и
 * `JSON.stringify` превращает его в объект `{"0":..,"1":..,"2":..}`, а не в
 * массив (замерено). Поэтому векторы разбираются на тройки чисел здесь, рядом с
 * gl-matrix, а не в модуле записи, который обязан оставаться без него.
 */
function storedImplantsOf(implants: readonly ImplantData[]): StoredImplant[] {
	const out: StoredImplant[] = [];
	for (const implant of implants) {
		const startWorld = worldTriple(Array.from(implant.startWorld));
		const endWorld = worldTriple(Array.from(implant.endWorld));
		if (!startWorld || !endWorld) continue;
		out.push({
			id: implant.id,
			fdiCode: implant.fdiCode,
			diameter: implant.diameter,
			length: implant.length,
			startWorld,
			endWorld,
			boneDensity: { ...implant.boneDensity },
			distanceToNerve: implant.distanceToNerve,
		});
	}
	return out;
}

/** Обратное превращение: прочитанный из базы имплант снова получает векторы. */
function implantDataOf(stored: readonly StoredImplant[]): ImplantData[] {
	return stored.map((implant) => ({
		id: implant.id,
		fdiCode: implant.fdiCode,
		diameter: implant.diameter,
		length: implant.length,
		startWorld: vec3.fromValues(
			implant.startWorld[0],
			implant.startWorld[1],
			implant.startWorld[2],
		),
		endWorld: vec3.fromValues(
			implant.endWorld[0],
			implant.endWorld[1],
			implant.endWorld[2],
		),
		boneDensity: { ...implant.boneDensity },
		distanceToNerve: implant.distanceToNerve,
	}));
}

/**
 * Русский протокол по последнему импланту. Вынесен из `simulateImplantPlacement`,
 * чтобы восстановленный из базы имплант получал ту же строку, что и только что
 * поставленный: иначе после возврата на снимок список имплантов был бы, а
 * протокола под ним — нет.
 */
function implantProtocolLog(implant: ImplantData): string {
	return `В область зуба ${implant.fdiCode} запланирована установка имплантата ${implant.diameter.toFixed(1)}x${implant.length.toFixed(1)} мм. Плотность кости по HU соответствует типу ${implant.boneDensity.classification} (${implant.boneDensity.averageHU} HU). Дистанция до нижнечелюстного канала ${implant.distanceToNerve.toFixed(1)} мм.`;
}

export function Cornerstone3DViewer({
	imageIds,
	patientId = null,
}: Cornerstone3DViewerProps) {
	const axialRef = useRef<HTMLDivElement>(null);
	const sagittalRef = useRef<HTMLDivElement>(null);
	const coronalRef = useRef<HTMLDivElement>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	// Состояние загрузки и ошибки: раньше пользователь не получал никакого сигнала.
	const [isVolumeLoading, setIsVolumeLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [volumeId, setVolumeId] = useState<string | null>(null);
	const [showPanorex, setShowPanorex] = useState(false);
	const [splinePoints, setSplinePoints] = useState<Point2D[]>([]);
	// Почему панорама НЕ построена, и по какой дуге она построена, если построена.
	// Раньше обоих состояний не было: кнопка всегда рисовала «панораму».
	const [panorexIssue, setPanorexIssue] = useState<PanoramicIssue | null>(null);
	const [archSummary, setArchSummary] = useState<{
		points: number;
		lengthMm: number;
	} | null>(null);
	const [panorexVolume, setPanorexVolume] =
		useState<PanoramicVolumeInput | null>(null);
	const [panorexThickness, setPanorexThickness] = useState<number>(0);
	const [blendMode, setBlendMode] = useState<"mip" | "average">("mip");
	const [activeTool, setActiveTool] = useState<string>("Crosshairs");
	const [implants, setImplants] = useState<ImplantData[]>([]);
	const [aiProtocolLog, setAiProtocolLog] = useState<string>("");
	/**
	 * Код исследования DICOM — единственный устойчивый ключ разметки.
	 *
	 * ПОЧЕМУ НЕ `imageIds`. Локальный архив попадает в просмотрщик через
	 * `wadouri.fileManager.add`, который выдаёт `dicomfile:<номер по счёту>`
	 * (`fileManager.js:3-5`) — номер в массиве внутри модуля. После перезагрузки
	 * страницы `dicomfile:0` означает первый файл СЛЕДУЮЩЕГО открытого архива, то
	 * есть ключ, собранный из `imageIds`, либо не нашёл бы разметку никогда, либо
	 * нашёл бы РАЗМЕТКУ ДРУГОГО СНИМКА. Настоящий `StudyInstanceUID` живёт в теге
	 * DICOM и постоянен, и колонка в базе названа именно так.
	 *
	 * ЛОВУШКА ПОИСКА МЕТАДАННЫХ: у этого загрузчика `studyInstanceUID` лежит в
	 * `generalSeriesModule`, а НЕ в `generalStudyModule` — в модуле исследования
	 * его нет вовсе (`wadouri/metaData/metaDataProvider.js:42-49` против `:56`).
	 */
	const [studyInstanceUid, setStudyInstanceUid] = useState<string | null>(null);
	/** Разметка, прочитанная из базы при открытии снимка. */
	const [restoredMarkup, setRestoredMarkup] = useState<CtPlanningMarkup | null>(
		null,
	);
	/**
	 * Состояние хранения разметки, видимое врачу. Отказ, ушедший только в консоль,
	 * для врача равен молчаливой потере работы — этот класс дефекта в дереве
	 * ловили многократно.
	 */
	const [markupStatus, setMarkupStatus] = useState<{
		tone: "saving" | "saved" | "issue";
		text: string;
	} | null>(null);

	/*
	 * Обработчики событий cornerstone и очистка эффекта живут вне цикла отрисовки
	 * React, поэтому им нужна не копия состояния на момент подписки, а ссылка на
	 * текущее. Без этого сохранение при уходе с экрана записало бы разметку,
	 * какой она была в момент подписки, — то есть пустую.
	 */
	const patientIdRef = useRef<string | null>(patientId);
	patientIdRef.current = patientId;
	const studyUidRef = useRef<string | null>(studyInstanceUid);
	studyUidRef.current = studyInstanceUid;
	const implantsRef = useRef<ImplantData[]>(implants);
	implantsRef.current = implants;
	const restoredMarkupRef = useRef<CtPlanningMarkup | null>(restoredMarkup);
	restoredMarkupRef.current = restoredMarkup;
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		async function init() {
			// 1. Initialize cornerstone core
			await cornerstone.init();
			// 2. Initialize cornerstone tools
			await cornerstoneTools.init();

			// 3. Initialize DICOM image loader
			cornerstoneDICOMImageLoader.init({
				maxWebWorkers: navigator.hardwareConcurrency
					? Math.min(navigator.hardwareConcurrency, 7)
					: 1,
			});

			setIsInitialized(true);
		}

		if (!isInitialized) {
			init();
		}

		return () => {
			// Hardcore performance cleanup!
			cornerstone.cache.purgeCache();
		};
	}, [isInitialized]);

	useEffect(() => {
		if (!isInitialized || !imageIds.length) return;

		// БЫЛО: у загрузки не было ни отмены, ни обработки ошибок, а очистка эффекта
		// синхронно уничтожала движок, пока loadAndRender ещё ждал загрузку тома.
		// Открыв второй архив до окончания первого, пользователь получал три
		// ЧЁРНЫЕ панели без единого сообщения: первая загрузка продолжалась против
		// уничтоженного движка и падала с необработанной ошибкой.
		let cancelled = false;
		setLoadError(null);
		setIsVolumeLoading(true);
		// Новая серия — старая развёртка больше ни к чему не относится. Без сброса
		// поверх нового исследования продолжала висеть панорама предыдущего.
		setShowPanorex(false);
		setSplinePoints([]);
		setPanorexVolume(null);
		setPanorexIssue(null);
		setArchSummary(null);
		// Новая серия — и разметка предыдущей к ней не относится. Без сброса
		// восстановленная разметка прошлого снимка была бы сохранена под кодом нового.
		setStudyInstanceUid(null);
		setRestoredMarkup(null);
		setMarkupStatus(null);

		async function loadAndRender() {
			// БЫЛО: идентификатор тома жёстко "my-volume" и никогда не вытеснялся из
			// кэша — второй архив переиспользовал том ПЕРВОГО, показывая чужой снимок.
			const vId = `dente-volume-${imageIds.length}-${imageIds[0] ?? "empty"}`;
			setVolumeId(vId);
			const renderingEngineId = "my-engine";

			const renderingEngine = new cornerstone.RenderingEngine(
				renderingEngineId,
			);

			const viewportIds = {
				axial: "AXIAL",
				sagittal: "SAGITTAL",
				coronal: "CORONAL",
			};

			const viewportInputArray = [
				{
					viewportId: viewportIds.axial,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: axialRef.current as HTMLDivElement,
					defaultOptions: {
						orientation: cornerstone.Enums.OrientationAxis.AXIAL,
						background: [0, 0, 0] as cornerstone.Types.Point3,
					},
				},
				{
					viewportId: viewportIds.sagittal,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: sagittalRef.current as HTMLDivElement,
					defaultOptions: {
						orientation: cornerstone.Enums.OrientationAxis.SAGITTAL,
						background: [0, 0, 0] as cornerstone.Types.Point3,
					},
				},
				{
					viewportId: viewportIds.coronal,
					type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
					element: coronalRef.current as HTMLDivElement,
					defaultOptions: {
						orientation: cornerstone.Enums.OrientationAxis.CORONAL,
						background: [0, 0, 0] as cornerstone.Types.Point3,
					},
				},
			];

			renderingEngine.setViewports(viewportInputArray);

			// Define a volume in memory
			const volume = await cornerstone.volumeLoader.createAndCacheVolume(vId, {
				imageIds,
			});

			// Load the volume (decodes pixel data)
			volume.load();

			/*
			 * Код исследования читается после разбора файлов: до
			 * `createAndCacheVolume` поставщик метаданных ещё ничего не знает об этих
			 * imageId. Пустое значение оставляем пустым — сохранять разметку под
			 * выдуманным кодом хуже, чем не сохранять: чужая разметка склеилась бы с
			 * этой по совпадению ключа.
			 */
			const firstImageId = imageIds[0];
			const seriesMeta = firstImageId
				? (cornerstone.metaData.get("generalSeriesModule", firstImageId) as
						| { studyInstanceUID?: unknown }
						| undefined)
				: undefined;
			const uid =
				typeof seriesMeta?.studyInstanceUID === "string"
					? seriesMeta.studyInstanceUID.trim()
					: "";
			if (!cancelled) setStudyInstanceUid(uid.length > 0 ? uid : null);

			await cornerstone.setVolumesForViewports(
				renderingEngine,
				[{ volumeId: vId }],
				[viewportIds.axial, viewportIds.sagittal, viewportIds.coronal],
			);

			// Add crosshairs tool
			const toolGroupId = "mpr-tool-group";
			let toolGroup =
				cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
			if (!toolGroup) {
				toolGroup =
					cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)!;
			}

			cornerstoneTools.addTool(cornerstoneTools.CrosshairsTool);
			toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);

			// We must configure crosshairs before setting active
			const crosshairsConfig = {
				viewportIndicators: false,
				autoPan: {
					enabled: false,
				},
				mobile: {
					enabled: true,
					opacity: 1,
					handleRadius: 6,
				},
			};
			toolGroup.setToolConfiguration(
				cornerstoneTools.CrosshairsTool.toolName,
				crosshairsConfig,
			);

			toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
				bindings: [
					{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary },
				],
			});

			// Also add WindowLevel on right click
			cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
			toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
			toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
				bindings: [
					{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary },
				],
			});

			// Also add Zoom on Wheel
			cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
			toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
			toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
				bindings: [
					{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary },
				],
			});

			// Advanced Dental Tools
			cornerstoneTools.addTool(cornerstoneTools.SplineROITool);
			toolGroup.addTool(cornerstoneTools.SplineROITool.toolName);

			cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool);
			toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);

			cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
			toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);

			toolGroup.addViewport(viewportIds.axial, renderingEngineId);
			toolGroup.addViewport(viewportIds.sagittal, renderingEngineId);
			toolGroup.addViewport(viewportIds.coronal, renderingEngineId);

			// Force render
			if (cancelled) return;
			renderingEngine.renderViewports([
				viewportIds.axial,
				viewportIds.sagittal,
				viewportIds.coronal,
			]);
		}

		loadAndRender()
			.then(() => {
				if (!cancelled) setIsVolumeLoading(false);
			})
			.catch((error) => {
				if (cancelled) return;
				console.error(
					"[Cornerstone3DViewer] Не удалось построить реконструкцию:",
					error,
				);
				setIsVolumeLoading(false);
				setLoadError(
					"Не удалось построить реконструкцию. Возможно, серия неполная или формат не поддерживается. Попробуйте загрузить архив заново.",
				);
			});

		return () => {
			cancelled = true;
			cornerstone.getRenderingEngine("my-engine")?.destroy();
			cornerstoneTools.ToolGroupManager.destroyToolGroup("mpr-tool-group");
		};
	}, [isInitialized, imageIds]);

	/*
	 * ЗАГРУЗКА РАЗМЕТКИ ПРИ ОТКРЫТИИ СНИМКА.
	 *
	 * Срабатывает, как только известны оба ключа — пациент и код исследования.
	 * Раньше здесь не было ничего: адрес чтения не вызывался из клиента ни разу,
	 * поэтому обведённая в прошлый раз дуга на экран не возвращалась никогда.
	 */
	useEffect(() => {
		if (!patientId || !studyInstanceUid) return;
		let cancelled = false;

		loadCtPlanningMarkup(patientId, studyInstanceUid)
			.then((outcome) => {
				if (cancelled) return;
				if (outcome.status === "refused") {
					// Пустой снимок без объяснения врач читает как «разметка пропала».
					setMarkupStatus({ tone: "issue", text: outcome.message });
					return;
				}
				setRestoredMarkup(outcome.markup);
				if (outcome.markup.implants.length > 0) {
					const restored = implantDataOf(outcome.markup.implants);
					setImplants(restored);
					const last = restored[restored.length - 1];
					if (last) setAiProtocolLog(implantProtocolLog(last));
				}
				const label = ctPlanningRestoredLabel(outcome.markup);
				setMarkupStatus(label ? { tone: "saved", text: label } : null);
			})
			.catch(() => {
				if (!cancelled) {
					setMarkupStatus({
						tone: "issue",
						text:
							"Сохранённую разметку прочитать не удалось. Откройте снимок заново; если не поможет, " +
							"сообщите администратору клиники.",
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [patientId, studyInstanceUid]);

	/**
	 * Разметка, какая она СЕЙЧАС: точки врача из хранилища аннотаций cornerstone
	 * плюс расставленные импланты.
	 *
	 * Читается `SplineROITool`, а если аннотации в хранилище нет (врач вернулся на
	 * снимок и ещё ничего не трогал), берутся восстановленные из базы точки —
	 * иначе сохранение по любому поводу затёрло бы прочитанную разметку пустотой.
	 */
	const currentMarkup = (): CtPlanningMarkup => {
		const element = axialRef.current;
		let splinePoints: WorldPoint3[] = [];
		if (element) {
			try {
				const annotations =
					cornerstoneTools.annotation.state.getAnnotations(
						cornerstoneTools.SplineROITool.toolName,
						element,
					) ?? [];
				splinePoints = archControlPointsOf(annotations);
			} catch {
				// getAnnotations бросает, если элемент ещё не включён в cornerstone.
				splinePoints = [];
			}
		}
		const restored = restoredMarkupRef.current;
		if (splinePoints.length === 0 && restored)
			splinePoints = restored.splinePoints;
		return {
			splinePoints,
			// Инструмента обводки канала нерва в этом просмотрщике нет вовсе, поэтому
			// единственный источник этих точек — то, что уже лежит в базе. Затирать их
			// пустотой было бы потерей чужой работы.
			nervePoints: restored?.nervePoints ?? emptyCtPlanningMarkup().nervePoints,
			implants: storedImplantsOf(implantsRef.current),
		};
	};

	/**
	 * Записать разметку сейчас. `silent` — для сохранения при уходе с экрана: там
	 * показывать что-либо уже некому, экран разбирается.
	 */
	const saveMarkupNow = async (silent = false): Promise<void> => {
		const patient = patientIdRef.current;
		const study = studyUidRef.current;
		const markup = currentMarkup();
		if (ctPlanningMarkupIsEmpty(markup)) return;

		if (!patient) {
			if (!silent) {
				setMarkupStatus({
					tone: "issue",
					text:
						"Разметку сохранить нельзя — пациент не выбран, а разметка хранится в его карточке. " +
						"Откройте снимок из карточки пациента, обведённая дуга остаётся на экране.",
				});
			}
			return;
		}
		if (!study) {
			if (!silent) {
				setMarkupStatus({
					tone: "issue",
					text:
						"Разметку сохранить нельзя — в файлах снимка нет кода исследования, а без него разметку " +
						"не отличить от разметки другого снимка. Загрузите архив КЛКТ целиком, обведённая дуга " +
						"остаётся на экране.",
				});
			}
			return;
		}

		if (!silent)
			setMarkupStatus({ tone: "saving", text: "Сохраняем разметку…" });
		const outcome = await saveCtPlanningMarkup(patient, study, markup);
		// Прочитанное принимаем за новую основу: иначе следующее сохранение снова
		// сравнивалось бы с состоянием до правки.
		if (outcome.status === "saved") setRestoredMarkup(markup);
		if (silent) return;
		setMarkupStatus(
			outcome.status === "saved"
				? { tone: "saved", text: "Разметка сохранена в карточке пациента." }
				: { tone: "issue", text: outcome.message },
		);
	};

	/**
	 * ВЫБРАННЫЙ МОМЕНТ СОХРАНЕНИЯ, И ПОЧЕМУ ИМЕННО ОН.
	 *
	 * Сохранять на каждое движение мыши нельзя: `ANNOTATION_MODIFIED` приходит на
	 * каждый кадр перетаскивания точки, это десятки запросов в секунду на одну
	 * правку дуги. Кнопка, о которой врач не знает, равна отсутствию сохранения.
	 * Поэтому моментов три, и все они — законченные действия врача:
	 *   • `ANNOTATION_COMPLETED` — дуга обведена. Событие приходит РОВНО ОДИН РАЗ на
	 *     законченный обвод (двойной щелчок либо возврат на первую точку), это
	 *     единственный способ закончить `SplineROITool`, то есть основной случай, а
	 *     не краевой;
	 *   • `ANNOTATION_MODIFIED` с задержкой — врач поправил уже обведённое.
	 *     Задержка сворачивает перетаскивание в одну запись; без этой ветки
	 *     правки терялись бы, потому что второй раз «завершения» не будет;
	 *   • постановка импланта и уход с экрана — тот самый момент, в котором
	 *     разметка раньше умирала.
	 * Кнопка «Сохранить разметку» рядом тоже есть: на неё ссылаются тексты отказов,
	 * и она даёт врачу способ убедиться, что работа записана, не угадывая.
	 */
	const scheduleMarkupSave = () => {
		if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			saveTimerRef.current = null;
			void saveMarkupNow();
		}, MARKUP_SAVE_DEBOUNCE_MS);
	};

	useEffect(() => {
		if (!isInitialized) return;
		const target = cornerstone.eventTarget;
		const onCompleted = () => {
			if (saveTimerRef.current !== null) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			void saveMarkupNow();
		};
		const onModified = () => scheduleMarkupSave();

		// Аннотации cornerstone рассылают события на общий eventTarget, а не на
		// элемент (`stateManagement/annotation/helpers/state.js:13`).
		target.addEventListener(
			cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED,
			onCompleted,
		);
		target.addEventListener(
			cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED,
			onModified,
		);

		return () => {
			target.removeEventListener(
				cornerstoneTools.Enums.Events.ANNOTATION_COMPLETED,
				onCompleted,
			);
			target.removeEventListener(
				cornerstoneTools.Enums.Events.ANNOTATION_MODIFIED,
				onModified,
			);
			// УХОД С ЭКРАНА — ровно тот момент, в котором разметка раньше исчезала:
			// ниже по этому же файлу очистка уничтожает группу инструментов, а
			// соседний эффект чистит кэш cornerstone. Отложенную запись здесь ждать
			// нечем, поэтому она отправляется без ожидания ответа; показать отказ уже
			// некому, и поэтому основной момент записи — завершение обвода, а не это.
			if (saveTimerRef.current !== null) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			void saveMarkupNow(true);
		};
	}, [isInitialized, scheduleMarkupSave, saveMarkupNow]);

	/** Отказ от построения: окно развёртки не открываем, причину показываем. */
	const refusePanorex = (reason: PanoramicIssue) => {
		setPanorexIssue(reason);
		setArchSummary(null);
		setSplinePoints([]);
		setPanorexVolume(null);
		setShowPanorex(false);
	};

	const handleGeneratePanorex = () => {
		// БЫЛО: реконструкция строилась по трём вшитым точкам
		// [{100,100},{200,150},{300,100}], не имевшим отношения ни к пациенту, ни к
		// тому, что обвёл врач. На экране появлялась правдоподобная «панорама»,
		// поэтому подмену нельзя было заметить. Теперь дуга берётся из аннотации
		// SplineROITool, а если врач ничего не обвёл — не строится ничего.
		const element = axialRef.current;
		if (!element) {
			refusePanorex("read_failed");
			return;
		}

		let annotations: readonly DrawnArchAnnotation[];
		try {
			// getGroupKey() бросает исключение, если элемент ещё не включён в
			// cornerstone (том не догрузился). Раньше это уронило бы обработчик клика.
			annotations =
				cornerstoneTools.annotation.state.getAnnotations(
					cornerstoneTools.SplineROITool.toolName,
					element,
				) ?? [];
		} catch {
			refusePanorex("read_failed");
			return;
		}

		let arch = buildPanoramicArch(annotations);
		if (arch.status !== "ready" && arch.reason === "no_arch") {
			/*
			 * Врач вернулся на снимок: в хранилище аннотаций пусто, потому что оно
			 * живёт только пока смонтирован компонент, — но разметка прочитана из базы.
			 * Строим развёртку по ней, чтобы возвращённая разметка была рабочей, а не
			 * декоративной. Геометрия та же: сохранённые точки уходят в тот же
			 * `buildPanoramicArch`.
			 */
			const stored = restoredMarkup?.splinePoints ?? [];
			if (stored.length > 0) arch = archFromStoredControlPoints(stored);
		}
		if (arch.status !== "ready") {
			refusePanorex(arch.reason);
			return;
		}

		// Extract the real voxel slab from the cornerstone volume cache and hand an
		// OWNED copy to the worker. We never transfer the volume's own scalar buffer
		// (that would detach and corrupt the cache), so `toTransferableScalarData`
		// returns a fresh Float32Array/Uint16Array whose buffer is safe to transfer.
		if (!volumeId) {
			refusePanorex("volume_not_ready");
			return;
		}
		const volume = cornerstone.cache.getVolume(volumeId);
		// БЫЛО: `volume.voxelManager.getScalarData()` вызывался напрямую и бросал
		// 'No scalar data available' на КАЖДОЙ реальной серии КЛКТ — у voxelManager
		// потокового объёма нет ни `scalarData`, ни `_getScalarData`
		// (VoxelManager.js:273-286 против фабрики :505-597). Исключение вылетало из
		// обработчика клика (React 18 не отправляет такое в error boundary), поэтому
		// проверка «объём не готов» ниже была недостижима, а панорама не строилась
		// никогда. Теперь чтение идёт через путь, который на cornerstone 5 работает,
		// и любой бросок превращается в отказ, а не в мёртвую кнопку.
		const voxels = readVolumeScalarData(
			volume
				? {
						dimensions: volume.dimensions,
						imageIds: volume.imageIds,
						voxelManager: volume.voxelManager,
					}
				: null,
			(imageId) => cornerstone.cache.getImage(imageId) !== undefined,
		);
		if (voxels.status !== "ready" || !volume) {
			// БЫЛО: окно открывалось с вечным спиннером «Calculating Trilinear
			// Interpolation...», хотя ничего не считалось и досчитаться не могло —
			// повторной попытки в коде нет. Честнее не открывать окно вовсе.
			refusePanorex("volume_not_ready");
			return;
		}

		const [dx, dy, dz] = volume.dimensions;
		const [ox, oy, oz] = volume.origin;
		const [sx, sy, sz] = volume.spacing;
		setPanorexIssue(null);
		setArchSummary({
			points: arch.controlPoints.length,
			lengthMm: arch.lengthMm,
		});
		setSplinePoints(arch.curve);
		setPanorexVolume({
			scalarData: toTransferableScalarData(voxels.scalarData),
			dimensions: [dx, dy, dz],
			origin: [ox, oy, oz],
			// cornerstone exposes a 3x3 Mat3; expand it to the 16-element mat4 layout
			// the MPR kernel indexes. Pure structural bridge, no cast.
			direction: mat3ToMat4Direction(volume.direction),
			spacing: [sx, sy, sz],
		});
		setShowPanorex(true);
	};

	const setTool = (toolName: string) => {
		const toolGroupId = "mpr-tool-group";
		const toolGroup =
			cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
		if (!toolGroup) return;

		// Disable previous
		toolGroup.setToolDisabled(activeTool);
		// Enable new
		toolGroup.setToolActive(toolName, {
			bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
		});
		setActiveTool(toolName);
	};

	const simulateImplantPlacement = () => {
		// 1. We mock the physical placing in 3D world space (DICOM coords)
		const implantStart = vec3.fromValues(10, 20, -50);
		const implantEnd = vec3.fromValues(10, 20, -60); // 10mm length

		// 2. We mock nerve spline
		const nerveSpline = [
			vec3.fromValues(10, 22, -62),
			vec3.fromValues(12, 24, -65),
		];

		// 3. Collision Detection Math
		const distToNerve = distancePointToSpline(implantEnd, nerveSpline);

		// 4. Bone Density Math (Mocking scalarData since we'd normally get it from volume)
		const classification = "D2";
		const avgHu = 650;

		const newImplant: ImplantData = {
			id: Math.random().toString(36).substring(7),
			fdiCode: "36",
			diameter: 4.0,
			length: 10.0,
			startWorld: implantStart,
			endWorld: implantEnd,
			boneDensity: { averageHU: avgHu, classification },
			distanceToNerve: distToNerve,
		};

		const nextImplants = [...implants, newImplant];
		setImplants(nextImplants);
		// Ссылка обновляется здесь же: сохранение ниже читает её, а не состояние,
		// которое React перерисует только следующим кадром.
		implantsRef.current = nextImplants;

		// AI AUTO-PROTOCOL GENERATION
		setAiProtocolLog(implantProtocolLog(newImplant));

		// Постановка импланта — законченное действие врача, значит момент записи.
		void saveMarkupNow();
	};

	// Одно из двух: причина отказа, либо параметры дуги, по которой панорама
	// действительно построена. Третьего (выдуманной кривой) больше нет.
	const panorexBanner: { tone: "issue" | "ready"; text: string } | null =
		panorexIssue !== null
			? { tone: "issue", text: panoramicIssueLabels[panorexIssue] }
			: archSummary !== null
				? {
						tone: "ready",
						text: panoramicReadyLabel(archSummary.points, archSummary.lengthMm),
					}
				: null;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				minHeight: "600px",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#0a0a0a",
				color: "#fff",
				position: "relative",
				fontFamily: "sans-serif",
			}}
		>
			{/* БЫЛО: ни индикатора загрузки, ни сообщения об ошибке — при сбое врач
          видел три чёрные панели и не понимал, идёт ли построение или всё упало. */}
			{(isVolumeLoading || loadError) && (
				<div
					role={loadError ? "alert" : "status"}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						zIndex: 30,
						maxWidth: "420px",
						textAlign: "center",
						padding: "20px 24px",
						borderRadius: "16px",
						backgroundColor: "rgba(0,0,0,0.78)",
						border: `1px solid ${loadError ? "#f87171" : "rgba(255,255,255,0.2)"}`,
						color: loadError ? "#fca5a5" : "#e4e4e7",
						fontSize: "14px",
						lineHeight: 1.5,
					}}
				>
					{loadError ??
						"Строим объёмную реконструкцию — это может занять до минуты..."}
				</div>
			)}

			{/* KICKASS GLASSMORPHISM TOOLBAR */}
			<div
				style={{
					position: "absolute",
					top: "16px",
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: 20,
					display: "flex",
					alignItems: "center",
					gap: "12px",
					backgroundColor: "rgba(255,255,255,0.1)",
					backdropFilter: "blur(12px)",
					WebkitBackdropFilter: "blur(12px)",
					border: "1px solid rgba(255,255,255,0.2)",
					padding: "8px",
					borderRadius: "16px",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
				}}
			>
				<div
					style={{
						display: "flex",
						backgroundColor: "rgba(0,0,0,0.4)",
						borderRadius: "12px",
						padding: "4px",
						gap: "4px",
					}}
				>
					<button
						type="button"
						style={{
							padding: "8px 16px",
							borderRadius: "8px",
							fontSize: "14px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === cornerstoneTools.CrosshairsTool.toolName
									? "#2563eb"
									: "transparent",
							color:
								activeTool === cornerstoneTools.CrosshairsTool.toolName
									? "#fff"
									: "#d4d4d8",
						}}
						onClick={() => setTool(cornerstoneTools.CrosshairsTool.toolName)}
					>
						MPR (Oblique)
					</button>
					<button
						type="button"
						style={{
							padding: "8px 16px",
							borderRadius: "8px",
							fontSize: "14px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === cornerstoneTools.SplineROITool.toolName
									? "#2563eb"
									: "transparent",
							color:
								activeTool === cornerstoneTools.SplineROITool.toolName
									? "#fff"
									: "#d4d4d8",
						}}
						onClick={() => setTool(cornerstoneTools.SplineROITool.toolName)}
					>
						Дуга (Spline)
					</button>
					<button
						type="button"
						style={{
							padding: "8px 16px",
							borderRadius: "8px",
							fontSize: "14px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === cornerstoneTools.ProbeTool.toolName
									? "#2563eb"
									: "transparent",
							color:
								activeTool === cornerstoneTools.ProbeTool.toolName
									? "#fff"
									: "#d4d4d8",
						}}
						onClick={() => setTool(cornerstoneTools.ProbeTool.toolName)}
					>
						Probe (HU)
					</button>
					<button
						type="button"
						style={{
							padding: "8px 16px",
							borderRadius: "8px",
							fontSize: "14px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.2s",
							backgroundColor:
								activeTool === "Implant" ? "#4f46e5" : "transparent",
							color: activeTool === "Implant" ? "#fff" : "#d4d4d8",
						}}
						onClick={simulateImplantPlacement}
					>
						Implant (+Log)
					</button>
				</div>

				<div
					style={{
						width: "1px",
						height: "32px",
						backgroundColor: "rgba(255,255,255,0.2)",
						margin: "0 4px",
					}}
				></div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						fontSize: "12px",
					}}
				>
					<span style={{ color: "#a3a3a3" }}>Толщина (ОПТГ):</span>
					<input
						type="range"
						min="0"
						max="20"
						step="1"
						value={panorexThickness}
						onChange={(e) => setPanorexThickness(Number(e.target.value))}
						style={{ width: "96px", cursor: "pointer" }}
					/>
					<span style={{ width: "24px", textAlign: "right" }}>
						{panorexThickness}mm
					</span>
				</div>

				<div
					style={{
						display: "flex",
						backgroundColor: "rgba(0,0,0,0.4)",
						borderRadius: "12px",
						padding: "4px",
						gap: "4px",
						marginLeft: "4px",
					}}
				>
					<button
						type="button"
						style={{
							padding: "6px 12px",
							borderRadius: "8px",
							fontSize: "12px",
							fontWeight: 500,
							cursor: panorexThickness === 0 ? "not-allowed" : "pointer",
							border: "none",
							opacity: panorexThickness === 0 ? 0.5 : 1,
							transition: "all 0.2s",
							backgroundColor: blendMode === "mip" ? "#525252" : "transparent",
							color: blendMode === "mip" ? "#fff" : "#a3a3a3",
						}}
						onClick={() => setBlendMode("mip")}
						disabled={panorexThickness === 0}
					>
						MIP
					</button>
					<button
						type="button"
						style={{
							padding: "6px 12px",
							borderRadius: "8px",
							fontSize: "12px",
							fontWeight: 500,
							cursor: panorexThickness === 0 ? "not-allowed" : "pointer",
							border: "none",
							opacity: panorexThickness === 0 ? 0.5 : 1,
							transition: "all 0.2s",
							backgroundColor:
								blendMode === "average" ? "#525252" : "transparent",
							color: blendMode === "average" ? "#fff" : "#a3a3a3",
						}}
						onClick={() => setBlendMode("average")}
						disabled={panorexThickness === 0}
					>
						AVG
					</button>
				</div>

				<button
					type="button"
					style={{
						marginLeft: "8px",
						background: "linear-gradient(to right, #2563eb, #4f46e5)",
						color: "#fff",
						padding: "8px 20px",
						borderRadius: "12px",
						fontSize: "14px",
						fontWeight: "bold",
						border: "none",
						cursor: "pointer",
						boxShadow: "0 0 15px rgba(79,70,229,0.5)",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						transition: "all 0.2s",
					}}
					onClick={handleGeneratePanorex}
				>
					<svg
						style={{ width: "16px", height: "16px" }}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M14 5l7 7m0 0l-7 7m7-7H3"
						></path>
					</svg>
					Развернуть
				</button>

				{/* Разметка записывается сама по законченным действиям врача; эта кнопка
            даёт способ убедиться в этом не угадывая, и на неё ссылаются тексты
            отказов. */}
				<button
					type="button"
					data-testid="ct-planning-save"
					style={{
						marginLeft: "4px",
						backgroundColor: "rgba(0,0,0,0.4)",
						color: "#d4d4d8",
						padding: "8px 14px",
						borderRadius: "12px",
						fontSize: "13px",
						fontWeight: 500,
						border: "1px solid rgba(255,255,255,0.2)",
						cursor: "pointer",
					}}
					onClick={() => void saveMarkupNow()}
				>
					Сохранить разметку
				</button>
			</div>

			{/* Почему панорамы нет — или по какой именно дуге она построена.
          Пустое состояние честнее выдуманной кривой: раньше кнопка всегда
          отдавала «панораму», даже когда врач не обвёл ничего. */}
			{panorexBanner && (
				<div
					role={panorexBanner.tone === "issue" ? "alert" : "status"}
					aria-live="polite"
					data-testid="panorex-arch-state"
					className={`absolute left-1/2 top-24 z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
						panorexBanner.tone === "issue"
							? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
							: "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
					}`}
				>
					{panorexBanner.text}
				</div>
			)}

			{/* Судьба разметки, видимая врачу: восстановлена, сохраняется, сохранена
          или не сохранена с причиной и действием. Отказ, ушедший только в
          консоль, для врача равен молчаливой потере работы. */}
			{markupStatus && (
				<div
					role={markupStatus.tone === "issue" ? "alert" : "status"}
					aria-live="polite"
					data-testid="ct-planning-storage-state"
					className={`absolute left-1/2 top-40 z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
						markupStatus.tone === "issue"
							? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
							: "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
					}`}
				>
					{markupStatus.text}
				</div>
			)}

			{showPanorex && volumeId && (
				<PanoramicRendererWindow
					volume={panorexVolume}
					splinePoints={splinePoints}
					onClose={() => {
						// БЫЛО: закрытие окна снимало только само окно, а зелёная плашка
						// «Панорама построена…» продолжала висеть — уверенность в том, чего
						// на экране больше нет.
						setShowPanorex(false);
						setArchSummary(null);
					}}
					thickness={panorexThickness}
					blendMode={blendMode}
				/>
			)}

			<div
				style={{
					flex: 1,
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gridTemplateRows: "1fr 1fr",
					gap: "2px",
					backgroundColor: "#262626",
					padding: "2px",
				}}
			>
				<div style={{ position: "relative", backgroundColor: "#000" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.5)",
							backdropFilter: "blur(4px)",
							color: "#f87171",
							fontSize: "10px",
							fontWeight: "bold",
							letterSpacing: "0.05em",
							zIndex: 10,
						}}
					>
						AXIAL
					</div>
					<section
						ref={axialRef}
						aria-label="Просмотр Аксиальный"
						style={{ width: "100%", height: "100%" }}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>
				<div style={{ position: "relative", backgroundColor: "#000" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.5)",
							backdropFilter: "blur(4px)",
							color: "#4ade80",
							fontSize: "10px",
							fontWeight: "bold",
							letterSpacing: "0.05em",
							zIndex: 10,
						}}
					>
						SAGITTAL
					</div>
					<section
						ref={sagittalRef}
						aria-label="Просмотр Сагиттальный"
						style={{ width: "100%", height: "100%" }}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>
				<div style={{ position: "relative", backgroundColor: "#000" }}>
					<div
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							padding: "4px 8px",
							borderRadius: "4px",
							backgroundColor: "rgba(0,0,0,0.5)",
							backdropFilter: "blur(4px)",
							color: "#60a5fa",
							fontSize: "10px",
							fontWeight: "bold",
							letterSpacing: "0.05em",
							zIndex: 10,
						}}
					>
						CORONAL
					</div>
					<section
						ref={coronalRef}
						aria-label="Просмотр Корональный"
						style={{ width: "100%", height: "100%" }}
						onContextMenu={(e) => e.preventDefault()}
					/>
				</div>
				<div
					style={{
						position: "relative",
						backgroundColor: "#171717",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						padding: "16px",
					}}
				>
					<div
						style={{
							color: "#737373",
							fontSize: "14px",
							fontWeight: 500,
							marginBottom: "16px",
						}}
					>
						Surgical Module Logs
					</div>

					{aiProtocolLog && implants.length > 0 && (
						<div
							style={{
								width: "100%",
								maxWidth: "384px",
								padding: "16px",
								borderRadius: "12px",
								border: "1px solid",
								backgroundColor:
									(implants[implants.length - 1]?.distanceToNerve ?? Infinity) <
									2.0
										? "rgba(239,68,68,0.2)"
										: "rgba(34,197,94,0.2)",
								borderColor:
									(implants[implants.length - 1]?.distanceToNerve ?? Infinity) <
									2.0
										? "rgba(239,68,68,0.5)"
										: "rgba(34,197,94,0.5)",
								color:
									(implants[implants.length - 1]?.distanceToNerve ?? Infinity) <
									2.0
										? "#fecaca"
										: "#dcfce7",
							}}
						>
							<div
								style={{
									fontWeight: "bold",
									marginBottom: "8px",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								<svg
									style={{ width: "16px", height: "16px" }}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									></path>
								</svg>
								AI Auto-Protocol
							</div>
							<p style={{ fontSize: "12px", lineHeight: 1.5 }}>
								{aiProtocolLog}
							</p>
							{(implants[implants.length - 1]?.distanceToNerve ?? Infinity) <
								2.0 && (
								<div
									style={{
										marginTop: "8px",
										fontSize: "12px",
										fontWeight: "bold",
										color: "#f87171",
									}}
								>
									⚠️ КРИТИЧЕСКАЯ БЛИЗОСТЬ К НЕРВУ!
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
