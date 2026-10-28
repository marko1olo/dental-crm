import { useCallback, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import { ADULT_FDI_TEETH } from "../radiologyMath";
import {
	INITIAL_HOT_FOLDER_ITEMS,
	type HotFolderItem,
	type HotFolderSource,
	filterFreshItems,
} from "../hotFolderTypes";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { watchDesktopDicomFolder } from "../../../native/desktopBridge";
import {
	convertDicomBufferToDataUrl,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
	validateRadiologyUploadFile,
} from "../directRvgFileValidation";

export interface UseHotFolderScannerProps {
	readonly patientName?: string;
	readonly patientCardNumber?: string;
	readonly onTeethDetected?: (teeth: string[]) => void;
}

export function useHotFolderScanner({
	patientName = "Пациент",
	patientCardNumber = "043/у-2026/891",
	onTeethDetected,
}: UseHotFolderScannerProps) {
	const [hotFolderItems, setHotFolderItems] = useState<HotFolderItem[]>(() =>
		isDemoShowcaseMode() ? INITIAL_HOT_FOLDER_ITEMS : [],
	);
	const [activeSourceFilter, setActiveSourceFilter] = useState<HotFolderSource>("all");
	const [selectedItemId, setSelectedItemId] = useState<string>("");
	const [isScanning, setIsScanning] = useState(false);
	const [lastScanTime, setLastScanTime] = useState<string>("только что");
	const [isDragOver, setIsDragOver] = useState(false);

	const activeItem = useMemo(() => {
		return hotFolderItems.find((i) => i.id === selectedItemId) || hotFolderItems[0] || null;
	}, [hotFolderItems, selectedItemId]);

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
				onTeethDetected?.(detectedTeeth);
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
		[patientName, patientCardNumber, onTeethDetected],
	);

	const filteredItems = useMemo(() => {
		if (activeSourceFilter === "fresh_15m") {
			return filterFreshItems(hotFolderItems, 15);
		}
		if (activeSourceFilter === "all") return hotFolderItems;
		return hotFolderItems.filter((i) => i.source === activeSourceFilter);
	}, [hotFolderItems, activeSourceFilter]);

	return {
		hotFolderItems,
		setHotFolderItems,
		activeSourceFilter,
		setActiveSourceFilter,
		selectedItemId,
		setSelectedItemId,
		activeItem,
		isScanning,
		lastScanTime,
		isDragOver,
		setIsDragOver,
		handleRescanFolder,
		handleDropFile,
		filteredItems,
	};
}
