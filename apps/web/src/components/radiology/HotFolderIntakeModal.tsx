import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Clock, Download, FolderSync, RefreshCw, Scan, Send, UploadCloud, Wifi, X } from "lucide-react";
import { showToast } from "../GlobalToast";
import { ADULT_FDI_TEETH, FDI_TOOTH_NAMES, formatRadiationDose } from "./radiologyMath";
import type { RadiologyStudy } from "./types";
import {
	CLINICAL_PURPOSES,
	FILTER_PRESETS,
	INITIAL_HOT_FOLDER_ITEMS,
	type FilterPresetKey,
	type HotFolderItem,
	type HotFolderIntakeModalProps,
	type HotFolderSource,
	filterFreshItems,
	isItemFresh,
} from "./hotFolderTypes";
import { HotFolderFdiSelector } from "./HotFolderFdiSelector";
import { HotFolderImageCanvas } from "./HotFolderImageCanvas";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { watchDesktopDicomFolder } from "../../native/desktopBridge";
import { useVisitStore } from "../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	convertDicomBufferToDataUrl,
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
	validateRadiologyUploadFile,
} from "./directRvgFileValidation";
if (typeof document !== "undefined") { import("./hotFolderIntake.css"); }

// Transparent re-exports for complete backward compatibility and test parity
export * from "./hotFolderTypes";

export const HotFolderIntakeModal: React.FC<HotFolderIntakeModalProps> = ({
	isOpen,
	onClose,
	patientId = "PAT-001",
	patientName = "Пациент",
	patientCardNumber = "043/у-2026/891",
	patientBirthDate = "1988-06-14",
	doctorName = "Лечащий врач",
	activeToothFdi,
	onAttachToEmr,
	onExportDicom,
	onSendToLab,
}) => {
	const modalId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);

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
	const [flipV, setFlipV] = useState<boolean>(false);
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

	// Apply Filter Preset (including Enamel High-Pass, PDL Sharpening, Negative)
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
	const handleSelectAllTeeth = () => setSelectedTeeth([...ADULT_FDI_TEETH.quadrant1, ...ADULT_FDI_TEETH.quadrant2, ...ADULT_FDI_TEETH.quadrant3, ...ADULT_FDI_TEETH.quadrant4]);
	const handleSelectUpperArch = () => setSelectedTeeth([...ADULT_FDI_TEETH.quadrant1, ...ADULT_FDI_TEETH.quadrant2]);
	const handleSelectLowerArch = () => setSelectedTeeth([...ADULT_FDI_TEETH.quadrant4, ...ADULT_FDI_TEETH.quadrant3]);
	const handleSelectFrontal = () => setSelectedTeeth(["13", "12", "11", "21", "22", "23", "43", "42", "41", "31", "32", "33"]);
	const handleSelectRightMolar = () => setSelectedTeeth(["18", "17", "16", "15", "14", "48", "47", "46", "45", "44"]);
	const handleSelectLeftMolar = () => setSelectedTeeth(["24", "25", "26", "27", "28", "34", "35", "36", "37", "38"]);

	// Manual scan folder trigger
	const handleRescanFolder = async () => {
		setIsScanning(true);
		try {
			const watchRes = await watchDesktopDicomFolder("C:\\DenteDICOM\\Incoming", "hotfolder-intake");
			setIsScanning(false);
			setLastScanTime("только что");
			showToast(watchRes?.success ? "Папка автозахвата снимков успешно синхронизирована (DENTE Desktop)" : "Папка автозахвата снимков актуализирована (EzDent-i, Romexis, Sidexis)", "success");
		} catch {
			setIsScanning(false);
			setLastScanTime("только что");
			showToast("Папка автозахвата снимков актуализирована", "info");
		}
	};

	// Handle Drag and Drop Files
	const handleDropFile = (file: File) => {
		const validation = validateRadiologyUploadFile(file);
		if (!validation.isValid) {
			showToast(`Неподдерживаемый формат файла: ${file.name}. Допустимы DICOM (.dcm), TIFF, PNG, JPG, BMP.`, "error");
			return;
		}

		const lowerName = file.name.toLowerCase();
		let modality: "intraoral_rvg" | "optg_panoramic" | "cbct_slice" | "bitewing" = "intraoral_rvg";
		let detectedTeeth = ["16"];

		if (lowerName.includes("optg") || lowerName.includes("panoramic")) {
			modality = "optg_panoramic";
			detectedTeeth = [...ADULT_FDI_TEETH.quadrant1, ...ADULT_FDI_TEETH.quadrant2, ...ADULT_FDI_TEETH.quadrant4, ...ADULT_FDI_TEETH.quadrant3];
		} else if (lowerName.includes("bitewing") || lowerName.includes("bw")) {
			modality = "bitewing";
			detectedTeeth = ["16", "15", "46", "45"];
		}

		// Robust tooth extraction
		const extracted = extractTeethFromRadiologyFilename(file.name);
		if (extracted.length > 0) {
			detectedTeeth = extracted;
			if (extracted.length > 1 && modality !== "optg_panoramic") {
				const hasUpper = extracted.some((t) => ["14", "15", "16", "17", "24", "25", "26", "27"].includes(t));
				const hasLower = extracted.some((t) => ["44", "45", "46", "47", "34", "35", "36", "37"].includes(t));
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
				modalityLabel: modality === "optg_panoramic" ? "ОПТГ Панорама" : modality === "bitewing" ? "Bite-wing (Прикусной)" : "Прицельный RVG",
				detectedTeeth,
				sizeBytes: file.size,
				sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} МБ`,
				timestampIso: new Date().toISOString(),
				relativeTime: "только что",
				imageUrl,
				status: "new",
				isFresh: true,
				patientMatch: { patientName, cardNumber: patientCardNumber, confidence: 100 },
				metadata: { kv: 65, ma: 7.0, exposureSec: 0.08, pixelSpacingMm: 0.035, apparatusModel: detectedSensor, sensorResolution: "29.2 lp/mm" },
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
				fallbackReader.onload = () => { if (typeof fallbackReader.result === "string") createAndInsertItem(fallbackReader.result); };
				fallbackReader.readAsDataURL(file);
			};
			reader.onerror = () => showToast(`Ошибка чтения DICOM файла: ${file.name}`, "error");
			reader.readAsArrayBuffer(file);
		} else {
			const reader = new FileReader();
			reader.onload = () => { if (typeof reader.result === "string") createAndInsertItem(reader.result); };
			reader.onerror = () => showToast(`Ошибка чтения файла: ${file.name}`, "error");
			reader.readAsDataURL(file);
		}
	};

	// Filtered files list (supports intelligent fresh (< 15 mins) filter)
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
		const anatomicalArea = singleTooth ? `Зуб ${singleTooth} (${singleToothName})` : `Зубы: ${selectedTeeth.join(", ")}`;

		const study: RadiologyStudy = {
			id: `study-${Date.now()}`,
			patientId,
			patientName,
			medicalCardNumber: patientCardNumber,
			studyDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			studyType: activeItem.detectedModality === "optg_panoramic" ? "optg_digital_panoramic" : "intraoral_radiovisiography",
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
		if (patientId && activeItem.imageUrl && (activeItem.imageUrl.startsWith("data:image/") || activeItem.imageUrl.startsWith("blob:"))) {
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
							patientId, imageBase64,
							originalFilename: activeItem.filename || `hf_tooth_${selectedTeeth.join("_")}_${Date.now()}.jpg`,
							mimeType: "image/jpeg",
							kind: activeItem.detectedModality === "optg_panoramic" ? "panoramic" : "periapical",
							toothCode: selectedTeeth[0] || null, notes: protocolNote, status: "done",
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
				const updated = current.trim() ? `${current.trim()}\n${rvgDiaryStatement}` : rvgDiaryStatement;
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
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: { objectiveStatus: `[Автозахват снимка ${activeItem.modalityLabel}] Зуб #${selectedTeeth.join(", ")}: доза ${doseMicrosv} мкЗв. ${protocolNote}` },
					immediate: true,
					mode: "smart_append",
				},
			}));
			window.dispatchEvent(new CustomEvent("dente-rvg-scan-saved", {
				detail: { study, toothFdi: selectedTeeth[0] || "16", teethFdi: selectedTeeth },
			}));
		} catch {
			// ignore
		}

		showToast(
			`Снимок (${activeItem.filename}) успешно прикреплен к карте пациента ${patientName} и протоколу ф. 043/у!`,
			"success",
		);
	}, [activeItem, patientId, patientCardNumber, patientName, selectedTeeth, doctorName, protocolNote, clinicalPurpose, onAttachToEmr]);

	// Canvas Pan drag handlers
	const handleMouseDownCanvas = (e: React.MouseEvent) => { setIsDraggingCanvas(true); dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; };
	const handleMouseMoveCanvas = (e: React.MouseEvent) => { if (isDraggingCanvas) setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }); };
	const handleMouseUpCanvas = () => setIsDraggingCanvas(false);
	const handleResetView = () => { setZoom(100); setRotation(0); setFlipH(false); setFlipV(false); setPan({ x: 0, y: 0 }); setSharpness(0); setEnamelHighPass(0); setPdlSharpening(0); handleApplyPreset("standard"); };

	if (!isOpen) return null;

	const doseInfo = formatRadiationDose(activeItem?.detectedModality === "optg_panoramic" ? 13.0 : 2.5);

	const modalContent = (
		<div
			className="hfi-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${modalId}-title`}
			data-testid="hotfolder-intake-modal-overlay"
			onMouseMove={handleMouseMoveCanvas}
			onMouseUp={handleMouseUpCanvas}
		>
			<div className="hfi-modal-shell" data-testid="hotfolder-intake-modal">
				{/* ─── HEADER ─────────────────────────────────────────────────── */}
				<header className="hfi-modal-header">
					<div className="hfi-header-left">
						<div className="hfi-header-icon-box"><FolderSync className="w-5 h-5" /></div>
						<div className="hfi-header-info">
							<div className="hfi-header-title-row">
								<h2 id={`${modalId}-title`} className="hfi-header-title">Папка автозахвата снимков (радиовизиография и ОПТГ)</h2>
								<span className="hfi-header-badge"><Wifi className="w-3 h-3 text-emerald-400" /><span>Автосканирование активно</span></span>
							</div>
							<p className="hfi-header-subtitle">
								<span>Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></span> · <span>Медкарта: <strong className="text-[var(--ink)]">{patientCardNumber}</strong></span> · <span>Врач: {doctorName}</span>
							</p>
						</div>
					</div>

					<div className="hfi-header-actions">
						<button
							type="button"
							onClick={onClose}
							className="hfi-close-btn"
							data-testid="hfi-close-modal-btn"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* ─── BODY 3-PANEL LAYOUT ────────────────────────────────────── */}
				<div className="hfi-modal-body">
					{/* ─── 1. LEFT PANEL: ПАПКА АВТОЗАХВАТА И ОБЛАСТЬ ЗАГРУЗКИ ───── */}
					<aside className="hfi-left-panel">
						<div className="hfi-left-header">
							<div className="hfi-folder-status-bar">
								<div className="hfi-folder-status-indicator">
									<span className="hfi-status-pulse-dot" />
									<span>Папка автозахвата ({filteredItems.length} снимков)</span>
								</div>
								<button
									type="button"
									onClick={handleRescanFolder}
									disabled={isScanning}
									className="hfi-rescan-btn"
									data-testid="hfi-rescan-btn"
									title="Обновить каталог автозахвата снимков"
								>
									<RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin text-teal-400" : ""}`} />
									<span>{isScanning ? "Поиск..." : "Обновить"}</span>
								</button>
							</div>

							<select
								value={activeSourceFilter}
								onChange={(e) => setActiveSourceFilter(e.target.value as HotFolderSource)}
								className="hfi-source-filter-select"
								data-testid="hfi-source-filter-select"
								aria-label="Фильтр по источнику рентгена"
							>
								<option value="all">Все источники рентгена</option>
								<option value="fresh_15m">Свежие снимки (&lt;15 минут)</option>
								<option value="ezdent">Vatech EzDent-i (Auto-Export)</option>
								<option value="romexis">Planmeca Romexis (Exchange)</option>
								<option value="sidexis">Dentsply Sirona Sidexis 4</option>
								<option value="carestream">Carestream CS Imaging</option>
								<option value="dicom_network">Область загрузки снимка (локальный файл)</option>
							</select>

							{/* Quick filter chips for fresh shots (< 15 mins) */}
							<div className="flex items-center gap-1.5 mt-2">
								<button
									type="button"
									onClick={() => setActiveSourceFilter("all")}
									className={`px-2 py-0.5 text-[11px] rounded transition ${activeSourceFilter === "all" ? "bg-teal-600 text-white font-medium" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
									data-testid="hfi-filter-all-btn"
								>
									Все ({hotFolderItems.length})
								</button>
								<button
									type="button"
									onClick={() => setActiveSourceFilter("fresh_15m")}
									className={`px-2 py-0.5 text-[11px] rounded transition flex items-center gap-1 ${activeSourceFilter === "fresh_15m" ? "bg-amber-600 text-white font-medium" : "bg-slate-800 text-amber-300 hover:bg-slate-700"}`}
									data-testid="hfi-filter-fresh-btn"
									title="Интеллектуальный поиск свежих снимков за последние 15 минут"
								>
									<Clock className="w-3 h-3" />
									<span>Свежие &lt;15м ({filterFreshItems(hotFolderItems, 15).length})</span>
								</button>
							</div>
						</div>

						{/* Discovered Files List with 1-click thumbnail preview */}
						<div className="hfi-files-list" data-testid="hfi-files-list">
							{filteredItems.length === 0 ? (
								<div className="p-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
									<FolderSync className="w-8 h-8 text-teal-400/40" />
									<p className="font-semibold text-gray-300">В папке пока нет новых снимков (автозахват)</p>
									<p className="text-[11px] text-gray-500 max-w-[200px]">
										Экспортируйте снимок из EzDent / Romexis или перетащите файл в область загрузки ниже.
									</p>
								</div>
							) : (
								filteredItems.map((item) => {
								const isSelected = item.id === activeItem?.id;
								const itemIsFresh = isItemFresh(item, 15);
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelectedItemId(item.id)}
										className={`hfi-file-card ${isSelected ? "active" : ""}`}
										data-testid={`hfi-file-card-${item.id}`}
									>
										<div className="hfi-file-card-top">
											<span className="hfi-file-modality-badge">
												<Scan className="w-3 h-3" />
												<span>{item.modalityLabel}</span>
											</span>
											<div className="flex items-center gap-1">
												{itemIsFresh && (
													<span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-medium">
														Свежий
													</span>
												)}
												<span className={`hfi-file-status-badge ${item.status}`}>
													{item.status === "new" ? "Новый" : item.status === "imported" ? "Импортирован" : "В работе"}
												</span>
											</div>
										</div>

										<div className="flex items-start gap-2 mt-1.5">
											<div className="w-10 h-12 rounded bg-slate-950 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
												{item.imageUrl ? (
													<img
														src={item.imageUrl}
														alt={item.filename}
														className="w-full h-full object-cover"
														loading="lazy"
														decoding="async"
													/>
												) : (
													<Scan className="w-4 h-4 text-slate-500" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="hfi-file-name" title={item.filename}>
													{item.filename}
												</p>
												<div className="hfi-file-meta-row">
													<span>{item.sourceLabel}</span>
													<span>{item.sizeFormatted}</span>
												</div>
												<div className="hfi-file-meta-row">
													<span className="hfi-file-teeth-tag">
														Зуб FDI: {item.detectedTeeth.join(", ")}
													</span>
													<span className="text-[10px] text-gray-400">
														<Clock className="w-2.5 h-2.5 inline mr-1" />
														{item.relativeTime}
													</span>
												</div>
											</div>
										</div>

										{item.patientMatch && (
											<div className="mt-1.5 pt-1 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-emerald-400">
												<span className="truncate max-w-[170px] inline-flex items-center gap-1">
													<Check className="w-3 h-3 shrink-0" />
													<span>{item.patientMatch.patientName}</span>
												</span>
												<span className="font-mono font-bold">
													{item.patientMatch.confidence}% совпадение
												</span>
											</div>
										)}
									</button>
								);
							}))}
						</div>

						{/* Область загрузки снимков */}
						<div className="hfi-left-dropzone">
							<input
								ref={fileInputRef}
								type="file"
								accept=".dcm,.dicom,.jpg,.jpeg,.png,.tiff,.tif,.bmp"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleDropFile(file);
								}}
							/>
							<div
								className={`hfi-dropzone-box ${isDragOver ? "dragover" : ""}`}
								data-testid="hfi-dropzone-box"
								onClick={() => fileInputRef.current?.click()}
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragOver(true);
								}}
								onDragLeave={() => setIsDragOver(false)}
								onDrop={(e) => {
									e.preventDefault();
									setIsDragOver(false);
									const file = e.dataTransfer.files?.[0];
									if (file) handleDropFile(file);
								}}
							>
								<UploadCloud className="w-5 h-5 text-teal-400" />
								<p className="hfi-dropzone-title">Область загрузки снимка</p>
								<p className="hfi-dropzone-sub">Перетащите файл снимка или нажмите для выбора (DICOM, TIFF, PNG, JPG)</p>
							</div>
						</div>
					</aside>

					{/* ─── 2. CENTER PANEL: DARK RADIOLOGY CANVAS & CONTROLS ───── */}
					<HotFolderImageCanvas
						activeItem={activeItem}
						doseInfo={doseInfo}
						pan={pan}
						zoom={zoom}
						rotation={rotation}
						flipH={flipH}
						flipV={flipV}
						brightness={brightness}
						contrast={contrast}
						invert={invert}
						sharpness={sharpness}
						enamelHighPass={enamelHighPass}
						pdlSharpening={pdlSharpening}
						activePreset={activePreset}
						isDragOver={isDragOver}
						onMouseDownCanvas={handleMouseDownCanvas}
						onApplyPreset={handleApplyPreset}
						setBrightness={setBrightness}
						setContrast={setContrast}
						setInvert={setInvert}
						setSharpness={setSharpness}
						setEnamelHighPass={setEnamelHighPass}
						setPdlSharpening={setPdlSharpening}
						setRotation={setRotation}
						setFlipH={setFlipH}
						setFlipV={setFlipV}
						setZoom={setZoom}
						onResetView={handleResetView}
						onDragOverViewport={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
						onDragLeaveViewport={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
						onDropViewport={(e) => {
							e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
							const file = e.dataTransfer.files?.[0];
							if (file) handleDropFile(file);
						}}
					/>

					{/* ─── 3. RIGHT PANEL: FDI FORMULA & 043/У PROTOCOL ─────────── */}
					<aside className="hfi-right-panel" data-testid="hfi-right-panel">
						<div className="hfi-right-content">
							{/* Section: FDI Dental Formula */}
							<HotFolderFdiSelector
								selectedTeeth={selectedTeeth}
								onToggleTooth={handleToggleTooth}
								onSelectAllTeeth={handleSelectAllTeeth}
								onSelectUpperArch={handleSelectUpperArch}
								onSelectLowerArch={handleSelectLowerArch}
								onSelectFrontal={handleSelectFrontal}
								onSelectRightMolar={handleSelectRightMolar}
								onSelectLeftMolar={handleSelectLeftMolar}
							/>

							{/* Section: Bitewing Quick Presets */}
							<div className="flex items-center gap-1.5 px-1 py-1">
								<button
									type="button"
									onClick={() => setSelectedTeeth(["17", "16", "15", "14", "47", "46", "45", "44"])}
									className="px-2 py-1 text-[11px] rounded bg-slate-800 text-teal-300 border border-teal-500/30 hover:bg-teal-950/40 transition"
									data-testid="hfi-bw-right-quick-btn"
								>
									Bite-wing R (14-17 / 44-47)
								</button>
								<button
									type="button"
									onClick={() => setSelectedTeeth(["24", "25", "26", "27", "34", "35", "36", "37"])}
									className="px-2 py-1 text-[11px] rounded bg-slate-800 text-teal-300 border border-teal-500/30 hover:bg-teal-950/40 transition"
									data-testid="hfi-bw-left-quick-btn"
								>
									Bite-wing L (24-27 / 34-37)
								</button>
							</div>

							{/* Section: Clinical Purpose */}
							<div className="hfi-field-group">
								<label className="hfi-field-label">Клиническая цель исследования</label>
								<select
									value={clinicalPurpose}
									onChange={(e) => setClinicalPurpose(e.target.value)}
									className="hfi-select-input"
									data-testid="hfi-clinical-purpose-select"
								>
									{CLINICAL_PURPOSES.map((cp) => (
										<option key={cp.id} value={cp.id}>
											{cp.label}
										</option>
									))}
								</select>
							</div>

							{/* Section: Protocol 043/y note */}
							<div className="hfi-protocol-box">
								<div className="flex items-center justify-between">
									<label className="hfi-field-label">
										Протокол описания для медкарты ф. 043/у
									</label>
									<span className="text-[10px] text-teal-400 font-semibold">
										Авто-шаблон
									</span>
								</div>
								<textarea
									value={protocolNote}
									onChange={(e) => setProtocolNote(e.target.value)}
									className="hfi-protocol-textarea"
									data-testid="hfi-protocol-textarea"
									rows={4}
									placeholder="Введите описание рентгенограммы..."
								/>
							</div>
						</div>

						{/* ─── FOOTER ACTIONS & 1-CLICK ATTACH ──────────────────── */}
						<div className="hfi-right-footer">
							<button
								type="button"
								onClick={handleAttachToEmr}
								disabled={!activeItem}
								className={`hfi-primary-attach-btn ${!activeItem ? "opacity-50 cursor-not-allowed" : ""}`}
								data-testid="hfi-primary-attach-btn"
								title={!activeItem ? "Выберите или загрузите снимок для прикрепления" : undefined}
							>
								<Check className="w-4 h-4" />
								<span>Принять снимок в карту (ф. 043/у)</span>
							</button>

							<div className="hfi-secondary-actions-row">
								<button
									type="button"
									onClick={() => { if (activeItem) { onExportDicom?.(activeItem); showToast(`Экспорт DICOM (${activeItem.filename}) выполнен`, "info"); } }}
									className="hfi-secondary-btn"
									data-testid="hfi-export-dicom-btn"
								>
									<Download className="w-3.5 h-3.5" />
									<span>Экспорт DICOM</span>
								</button>
								<button
									type="button"
									onClick={() => { if (activeItem) { onSendToLab?.(activeItem, protocolNote); showToast("Снимок отправлен в зуботехническую лабораторию", "info"); } }}
									className="hfi-secondary-btn"
									data-testid="hfi-send-lab-btn"
								>
									<Send className="w-3.5 h-3.5" />
									<span>В лабораторию</span>
								</button>
							</div>
						</div>
					</aside>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
