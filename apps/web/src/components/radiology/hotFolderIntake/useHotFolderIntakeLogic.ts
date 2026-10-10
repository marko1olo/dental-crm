import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { ADULT_FDI_TEETH, FDI_TOOTH_NAMES, formatRadiationDose } from "../radiologyMath";
import type { RadiologyStudy } from "../types";
import {
	FILTER_PRESETS,
	INITIAL_HOT_FOLDER_ITEMS,
	type FilterPresetKey,
	type HotFolderItem,
	type HotFolderSource,
	filterFreshItems,
} from "../hotFolderTypes";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { watchDesktopDicomFolder } from "../../../native/desktopBridge";
import { useVisitStore } from "../../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	convertDicomBufferToDataUrl,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
	validateRadiologyUploadFile,
} from "../directRvgFileValidation";
import type { UseHotFolderIntakeLogicProps } from "./types";

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

	// Hot Folder Items State
	const [hotFolderItems, setHotFolderItems] = useState<HotFolderItem[]>(() =>
		isDemoShowcaseMode() ? INITIAL_HOT_FOLDER_ITEMS : [],
	);
	const [activeSourceFilter, setActiveSourceFilter] = useState<HotFolderSource>("all");
	const [selectedItemId, setSelectedItemId] = useState<string>("");
	const [isScanning, setIsScanning] = useState(false);
	const [lastScanTime, setLastScanTime] = useState<string>("только что");
	const [isDragOver, setIsDragOver] = useState(false);

	// Active Selected Item
	const activeItem = useMemo(() => {
		return hotFolderItems.find((i) => i.id === selectedItemId) || hotFolderItems[0] || null;
	}, [hotFolderItems, selectedItemId]);

	// Selected Teeth in FDI formula (auto-binds to open tooth in visit formula if present)
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(() => {
		if (detectedOpenVisitTooth) return [detectedOpenVisitTooth];
		return ["16"];
	});

	// Synchronize selected teeth when switching hot folder item or binding open tooth
	useEffect(() => {
		if (activeItem && activeItem.detectedTeeth && activeItem.detectedTeeth.length > 0) {
			setSelectedTeeth(activeItem.detectedTeeth);
		} else if (detectedOpenVisitTooth) {
			setSelectedTeeth([detectedOpenVisitTooth]);
		}
	}, [activeItem, detectedOpenVisitTooth]);

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

	// Manual scan folder trigger
	const handleRescanFolder = async () => {
		setIsScanning(true);
		try {
			const watchRes = await watchDesktopDicomFolder("C:\\DenteDICOM\\Incoming", "hotfolder-intake");
			setIsScanning(false);
			setLastScanTime("только что");
			showToast(
				watchRes?.success
					? "Папка автозахвата снимков успешно синхронизирована (DENTE Desktop)"
					: "Папка автозахвата снимков актуализирована (Визиографы, КТ)",
				"success",
			);
		} catch {
			setIsScanning(false);
			setLastScanTime("только что");
			showToast("Папка автозахвата снимков актуализирована", "info");
		}
	};

	// Handle Drag and Drop Files
	const handleDropFile = useCallback(
		(file: File) => {
			const validation = validateRadiologyUploadFile(file);
			if (!validation.isValid) {
				showToast(
					`Неподдерживаемый формат файла: ${file.name}. Допустимы DICOM (.dcm), TIFF, PNG, JPG, BMP.`,
					"error",
				);
				return;
			}

			const lowerName = file.name.toLowerCase();
			let modality: "intraoral_rvg" | "optg_panoramic" | "cbct_3d" | "bitewing" = "intraoral_rvg";
			let detectedTeeth = ["16"];

			if (lowerName.includes("optg") || lowerName.includes("panoramic")) {
				modality = "optg_panoramic";
				detectedTeeth = [
					...ADULT_FDI_TEETH.quadrant1,
					...ADULT_FDI_TEETH.quadrant2,
					...ADULT_FDI_TEETH.quadrant4,
					...ADULT_FDI_TEETH.quadrant3,
				];
			} else if (lowerName.includes("bitewing") || lowerName.includes("bw")) {
				modality = "bitewing";
				detectedTeeth = ["16", "15", "46", "45"];
			}

			// Robust tooth extraction
			const extracted = extractTeethFromRadiologyFilename(file.name);
			if (extracted.length > 0) {
				detectedTeeth = extracted;
				if (extracted.length > 1 && modality !== "optg_panoramic") {
					const hasUpper = extracted.some((t) =>
						["14", "15", "16", "17", "24", "25", "26", "27"].includes(t),
					);
					const hasLower = extracted.some((t) =>
						["44", "45", "46", "47", "34", "35", "36", "37"].includes(t),
					);
					if (hasUpper && hasLower) modality = "bitewing";
				}
			}

			const detectedSensor = detectRadiologySensorBrand(file.name);

			const createAndInsertItem = (imageUrl: string) => {
				const newItem: HotFolderItem = {
					id: `dropped-${Date.now()}`,
					filename: file.name,
					source: "dicom_network",
					sourceLabel: `${detectedSensor} (Загрузка)`,
					folderPath: "Внешний файл / Зона радиовизиографии",
					detectedModality: modality,
					modalityLabel:
						modality === "optg_panoramic"
							? "ОПТГ Панорама"
							: modality === "bitewing"
								? "Bite-wing (Прикусной)"
								: "Прицельный RVG",
					detectedTeeth,
					sizeBytes: file.size,
					sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} МБ`,
					timestampIso: new Date().toISOString(),
					relativeTime: "только что",
					imageUrl,
					status: "new",
					isFresh: true,
					patientMatch: { patientName, cardNumber: patientCardNumber, confidence: 100 },
					metadata: {
						kv: 65,
						ma: 7.0,
						exposureSec: 0.08,
						pixelSpacingMm: 0.035,
						apparatusModel: detectedSensor,
						sensorResolution: "29.2 lp/mm",
					},
				};
				setHotFolderItems((prev) => [newItem, ...prev]);
				setSelectedItemId(newItem.id);
				setSelectedTeeth(detectedTeeth);
				showToast(`Файл ${file.name} успешно загружен и привязан (${detectedSensor})`, "success");
			};

			if (validation.format === "dicom") {
				const reader = new FileReader();
				reader.onload = () => {
					if (reader.result instanceof ArrayBuffer) {
						const decodedUrl = convertDicomBufferToDataUrl(reader.result);
						if (decodedUrl) return createAndInsertItem(decodedUrl);
					}
					const fallbackReader = new FileReader();
					fallbackReader.onload = () => {
						if (typeof fallbackReader.result === "string") createAndInsertItem(fallbackReader.result);
					};
					fallbackReader.readAsDataURL(file);
				};
				reader.onerror = () => showToast(`Ошибка чтения DICOM файла: ${file.name}`, "error");
				reader.readAsArrayBuffer(file);
			} else {
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === "string") createAndInsertItem(reader.result);
				};
				reader.onerror = () => showToast(`Ошибка чтения файла: ${file.name}`, "error");
				reader.readAsDataURL(file);
			}
		},
		[patientName, patientCardNumber],
	);

	// Filtered files list
	const filteredItems = useMemo(() => {
		if (activeSourceFilter === "fresh_15m") {
			return filterFreshItems(hotFolderItems, 15);
		}
		if (activeSourceFilter === "all") return hotFolderItems;
		return hotFolderItems.filter((i) => i.source === activeSourceFilter);
	}, [hotFolderItems, activeSourceFilter]);

	// 1-Click Attach to EMR Action
	const handleAttachToEmr = useCallback(() => {
		if (!activeItem) return;

		const doseMicrosv = activeItem.detectedModality === "optg_panoramic" ? 13.0 : 2.5;
		const singleTooth = selectedTeeth.length === 1 && selectedTeeth[0] ? selectedTeeth[0] : null;
		const singleToothName = singleTooth ? FDI_TOOTH_NAMES[singleTooth] ?? "" : "";
		const anatomicalArea = singleTooth
			? `Зуб ${singleTooth} (${singleToothName})`
			: `Зубы: ${selectedTeeth.join(", ")}`;

		const study: RadiologyStudy = {
			id: `study-${Date.now()}`,
			patientId,
			patientName,
			medicalCardNumber: patientCardNumber,
			studyDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			studyType:
				activeItem.detectedModality === "optg_panoramic"
					? "optg_digital_panoramic"
					: "intraoral_radiovisiography",
			modality: activeItem.detectedModality,
			modalityLabel: activeItem.modalityLabel,
			anatomicalArea,
			teethFdi: selectedTeeth,
			effectiveDoseMicrosv: doseMicrosv,
			effectiveDoseMsv: doseMicrosv / 1000,
			imageUrl: activeItem.imageUrl,
			doctorName,
			doctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
			clinicName: "ООО «Денте Стоматология»",
			status: "completed",
			diagnosisIcd10: "K04.0",
			diagnosticNotes: protocolNote,
			metadata: {
				kv: activeItem.metadata.kv,
				ma: activeItem.metadata.ma,
				exposureSec: activeItem.metadata.exposureSec,
				pixelSpacingMm: activeItem.metadata.pixelSpacingMm,
				apparatusModel: activeItem.metadata.apparatusModel,
			},
			tags: ["HotFolder", "043/у", `Зуб_${selectedTeeth.join("_")}`],
		};

		// Mark item as imported
		setHotFolderItems((prev) =>
			prev.map((i) => (i.id === activeItem.id ? { ...i, status: "imported" } : i)),
		);

		onAttachToEmr?.({
			study,
			teethFdi: selectedTeeth,
			protocolNote,
			clinicalPurpose,
			doseMicrosv,
		});

		// Persist scan to server
		if (
			patientId &&
			activeItem.imageUrl &&
			(activeItem.imageUrl.startsWith("data:image/") || activeItem.imageUrl.startsWith("blob:"))
		) {
			void (async () => {
				try {
					let imageBase64 = activeItem.imageUrl;
					if (activeItem.imageUrl.startsWith("blob:")) {
						const blob = await fetch(activeItem.imageUrl).then((r) => r.blob());
						imageBase64 = await new Promise<string>((resolve) => {
							const reader = new FileReader();
							reader.onloadend = () => resolve(reader.result as string);
							reader.readAsDataURL(blob);
						});
					}
					await fetch("/api/xray/scans", {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							patientId,
							imageBase64,
							originalFilename:
								activeItem.filename || `hf_tooth_${selectedTeeth.join("_")}_${Date.now()}.jpg`,
							mimeType: "image/jpeg",
							kind: activeItem.detectedModality === "optg_panoramic" ? "panoramic" : "periapical",
							toothCode: selectedTeeth[0] || null,
							notes: protocolNote,
							status: "done",
						}),
					}).catch(() => {});
				} catch {}
			})();
		}

		// Update visit store & reactive tooth state
		try {
			const primaryToothCode = selectedTeeth[0] || "16";
			const rvgDiaryStatement = `[Автозахват снимка ${activeItem.modalityLabel}] Зуб #${selectedTeeth.join(", ")}: доза ${doseMicrosv} мкЗв. ${protocolNote}`;

			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim()
					? `${current.trim()}\n${rvgDiaryStatement}`
					: rvgDiaryStatement;
				return { ...prev, objectiveStatus: updated };
			});

			if (primaryToothCode) {
				const store = useVisitStore.getState();
				const currentState = store.visitToothStateByCode[primaryToothCode];
				if (!currentState || currentState === "idle") {
					store.setToothState(primaryToothCode, "treatment");
				}
			}
		} catch (err) {
			console.warn("[HotFolderIntakeModal] Failed to update visit store:", err);
		}

		// Dispatch global SOAP event & reactive scan event
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							objectiveStatus: `[Автозахват снимка ${activeItem.modalityLabel}] Зуб #${selectedTeeth.join(", ")}: доза ${doseMicrosv} мкЗв. ${protocolNote}`,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-rvg-scan-saved", {
					detail: { study, toothFdi: selectedTeeth[0] || "16", teethFdi: selectedTeeth },
				}),
			);
		} catch {
			// ignore
		}

		showToast(
			`Снимок (${activeItem.filename}) успешно прикреплен к карте пациента ${patientName} и протоколу ф. 043/у!`,
			"success",
		);
	}, [
		activeItem,
		patientId,
		patientCardNumber,
		patientName,
		selectedTeeth,
		doctorName,
		protocolNote,
		clinicalPurpose,
		onAttachToEmr,
	]);

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
		activeItem?.detectedModality === "optg_panoramic" ? 13.0 : 2.5,
	);

	return {
		hotFolderItems,
		setHotFolderItems,
		activeSourceFilter,
		setActiveSourceFilter,
		selectedItemId,
		setSelectedItemId,
		isScanning,
		lastScanTime,
		isDragOver,
		setIsDragOver,
		activeItem,
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
		handleRescanFolder,
		handleDropFile,
		filteredItems,
		handleAttachToEmr,
		handleMouseDownCanvas,
		handleMouseMoveCanvas,
		handleMouseUpCanvas,
		handleResetView,
		doseInfo,
	};
}
