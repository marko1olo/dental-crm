import { useEffect, useMemo, useRef, useState } from "react";
import { ADULT_FDI_TEETH, formatRadiationDose } from "../radiologyMath";
import { FILTER_PRESETS, type FilterPresetKey } from "../hotFolderTypes";
import { useVisitStore } from "../../../store/visitStore";
import type { UseHotFolderIntakeLogicProps } from "./types";
import { useHotFolderScanner } from "./useHotFolderScanner";
import { useHotFolderEmrDispatcher } from "./useHotFolderEmrDispatcher";

export function useHotFolderIntakeLogic({
	patientId = "PAT-001",
	patientName = "Пациент",
	patientCardNumber = "043/у-2026/891",
	doctorName = "Лечащий врач",
	activeToothFdi,
	flipV,
	setFlipV,
	onAttachToEmr,
}: UseHotFolderIntakeLogicProps) {
	// Detect open tooth in dental formula of visit (FDI 11..48)
	const detectedOpenVisitTooth = useMemo(() => {
		if (activeToothFdi) return activeToothFdi;
		try {
			const store = useVisitStore.getState();
			const map = store.visitToothStateByCode || {};
			const codes = Object.keys(map);
			const treating = codes.find((c) => map[c] === "treatment");
			if (treating) return treating;
			const planned = codes.find((c) => map[c] === "planned");
			if (planned) return planned;
			const watch = codes.find((c) => map[c] === "watch");
			if (watch) return watch;
		} catch {
			// ignore
		}
		return null;
	}, [activeToothFdi]);

	// Selected Teeth in FDI formula (auto-binds to open tooth in visit formula if present)
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(() => {
		if (detectedOpenVisitTooth) return [detectedOpenVisitTooth];
		return ["16"];
	});

	// Scanner Sub-hook
	const scanner = useHotFolderScanner({
		patientName,
		patientCardNumber,
		onTeethDetected: (teeth) => setSelectedTeeth(teeth),
	});

	// Synchronize selected teeth when switching hot folder item or binding open tooth
	useEffect(() => {
		if (scanner.activeItem && scanner.activeItem.detectedTeeth && scanner.activeItem.detectedTeeth.length > 0) {
			setSelectedTeeth(scanner.activeItem.detectedTeeth);
		} else if (detectedOpenVisitTooth) {
			setSelectedTeeth([detectedOpenVisitTooth]);
		}
	}, [scanner.activeItem, detectedOpenVisitTooth]);

	// Image Display & Filter Controls (WebGL GPU filters)
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [invert, setInvert] = useState<boolean>(false);
	const [sharpness, setSharpness] = useState<number>(0);
	const [enamelHighPass, setEnamelHighPass] = useState<number>(0);
	const [pdlSharpening, setPdlSharpening] = useState<number>(0);
	const [activePreset, setActivePreset] = useState<FilterPresetKey>("standard");
	const [zoom, setZoom] = useState<number>(100);
	const [rotation, setRotation] = useState<number>(0);
	const [flipH, setFlipH] = useState<boolean>(false);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
	const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	// Clinical Modality & Purpose Binding
	const [clinicalPurpose, setClinicalPurpose] = useState<string>("endo_control");
	const [protocolNote, setProtocolNote] = useState<string>("");

	// Auto-generate protocol note when teeth or purpose changes
	useEffect(() => {
		const teethStr = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—";
		const notesByPurpose: Record<string, string> = {
			endo_control: `Прицельная радиовизиография зуба ${teethStr}. Контроль качества пломбирования корневых каналов: каналы обтурированы плотно и гомогенно на всем протяжении до рентгенологического апекса. Выведения силера за верхушку корня нет. Периодонтальная щель в периапикальной зоне без деструкции кости.`,
			primary_caries: `Прицельная радиовизиография зуба ${teethStr}. Обнаружен кариозный дефект твердых тканей коронки, проникающий в средние/глубокие слои дентина. Периапикальные ткани интактны, кортикальная пластинка альвеолы прослеживается.`,
			implant_check: `Контрольная рентгенография области имплантата в позиции ${teethStr}. Интеграция тела имплантата удовлетворительная, плотный контакт с костной тканью альвеолярного гребня. Резорбции краевой кости не выявлено.`,
			periapical_check: `Прицельная радиовизиография зуба ${teethStr}. В области верхушки корня определяется разрежение костной ткани с нечеткими контурами (деструкция периодонта). Корневые каналы ранее не лечены.`,
			orthopantomogram: `Ортопантомограмма челюстей. Зубные ряды интактны, положение зачатков зубов мудрости удовлетворительное, альвеолярный край сохранен, ВНЧС симметричны.`,
		};
		setProtocolNote(
			notesByPurpose[clinicalPurpose] ??
				`Прицельная рентгенография зуба ${teethStr}. Краевое прилегание искусственной коронки/вкладки к уступу плотное, нависающих краев и вторичного кариеса под конструкцией не определяется.`,
		);
	}, [selectedTeeth, clinicalPurpose]);

	// Apply Filter Preset
	const handleApplyPreset = (key: FilterPresetKey) => {
		const preset = FILTER_PRESETS[key];
		setActivePreset(key);
		setBrightness(preset.brightness);
		setContrast(preset.contrast);
		setInvert(preset.invert);
		setSharpness(preset.sharpness ?? (key === "sharpen" ? 50 : 0));
		setEnamelHighPass(preset.enamelHighPass ?? 0);
		setPdlSharpening(preset.pdlSharpening ?? 0);
	};

	// Toggle tooth in FDI Formula
	const handleToggleTooth = (tooth: string) => {
		setSelectedTeeth((prev) => {
			if (prev.includes(tooth)) {
				const next = prev.filter((t) => t !== tooth);
				return next.length > 0 ? next : [tooth];
			}
			return [...prev, tooth].sort();
		});
	};

	// Quick FDI Presets
	const handleSelectAllTeeth = () =>
		setSelectedTeeth([
			...ADULT_FDI_TEETH.quadrant1,
			...ADULT_FDI_TEETH.quadrant2,
			...ADULT_FDI_TEETH.quadrant3,
			...ADULT_FDI_TEETH.quadrant4,
		]);
	const handleSelectUpperArch = () =>
		setSelectedTeeth([...ADULT_FDI_TEETH.quadrant1, ...ADULT_FDI_TEETH.quadrant2]);
	const handleSelectLowerArch = () =>
		setSelectedTeeth([...ADULT_FDI_TEETH.quadrant4, ...ADULT_FDI_TEETH.quadrant3]);
	const handleSelectFrontal = () =>
		setSelectedTeeth(["13", "12", "11", "21", "22", "23", "43", "42", "41", "31", "32", "33"]);
	const handleSelectRightMolar = () =>
		setSelectedTeeth(["18", "17", "16", "15", "14", "48", "47", "46", "45", "44"]);
	const handleSelectLeftMolar = () =>
		setSelectedTeeth(["24", "25", "26", "27", "28", "34", "35", "36", "37", "38"]);
	const handleSelectTeethBatch = (teeth: string[]) => setSelectedTeeth(teeth);

	// EMR Dispatcher Sub-hook
	const emrDispatcher = useHotFolderEmrDispatcher({
		patientId,
		patientName,
		patientCardNumber,
		doctorName,
		activeItem: scanner.activeItem,
		selectedTeeth,
		protocolNote,
		clinicalPurpose,
		onAttachToEmr,
		setHotFolderItems: scanner.setHotFolderItems,
	});

	// Canvas Pan drag handlers
	const handleMouseDownCanvas = (e: React.MouseEvent) => {
		setIsDraggingCanvas(true);
		dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
	};
	const handleMouseMoveCanvas = (e: React.MouseEvent) => {
		if (isDraggingCanvas) {
			setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
		}
	};
	const handleMouseUpCanvas = () => setIsDraggingCanvas(false);
	const handleResetView = () => {
		setZoom(100);
		setRotation(0);
		setFlipH(false);
		setFlipV(false);
		setPan({ x: 0, y: 0 });
		setSharpness(0);
		setEnamelHighPass(0);
		setPdlSharpening(0);
		handleApplyPreset("standard");
	};

	const doseInfo = formatRadiationDose(
		scanner.activeItem?.detectedModality === "optg_panoramic" ? 13.0 : 2.5,
	);

	return {
		hotFolderItems: scanner.hotFolderItems,
		setHotFolderItems: scanner.setHotFolderItems,
		activeSourceFilter: scanner.activeSourceFilter,
		setActiveSourceFilter: scanner.setActiveSourceFilter,
		selectedItemId: scanner.selectedItemId,
		setSelectedItemId: scanner.setSelectedItemId,
		isScanning: scanner.isScanning,
		lastScanTime: scanner.lastScanTime,
		isDragOver: scanner.isDragOver,
		setIsDragOver: scanner.setIsDragOver,
		activeItem: scanner.activeItem,
		selectedTeeth,
		setSelectedTeeth,
		brightness,
		setBrightness,
		contrast,
		setContrast,
		invert,
		setInvert,
		sharpness,
		setSharpness,
		enamelHighPass,
		setEnamelHighPass,
		pdlSharpening,
		setPdlSharpening,
		activePreset,
		zoom,
		setZoom,
		rotation,
		setRotation,
		flipH,
		setFlipH,
		pan,
		clinicalPurpose,
		setClinicalPurpose,
		protocolNote,
		setProtocolNote,
		handleApplyPreset,
		handleToggleTooth,
		handleSelectAllTeeth,
		handleSelectUpperArch,
		handleSelectLowerArch,
		handleSelectFrontal,
		handleSelectRightMolar,
		handleSelectLeftMolar,
		handleSelectTeethBatch,
		handleRescanFolder: scanner.handleRescanFolder,
		handleDropFile: scanner.handleDropFile,
		filteredItems: scanner.filteredItems,
		handleAttachToEmr: emrDispatcher.handleAttachToEmr,
		handleMouseDownCanvas,
		handleMouseMoveCanvas,
		handleMouseUpCanvas,
		handleResetView,
		doseInfo,
	};
}
