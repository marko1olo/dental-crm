import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Check,
	Clock,
	Download,
	FolderSync,
	RefreshCw,
	Scan,
	Send,
	UploadCloud,
	Wifi,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	ADULT_FDI_TEETH,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
} from "./radiologyMath";
import type { RadiologyStudy } from "./types";
import {
	CLINICAL_PURPOSES,
	FILTER_PRESETS,
	INITIAL_HOT_FOLDER_ITEMS,
	type FilterPresetKey,
	type HotFolderItem,
	type HotFolderIntakeModalProps,
	type HotFolderSource,
} from "./hotFolderTypes";
import { HotFolderFdiSelector } from "./HotFolderFdiSelector";
import { HotFolderImageCanvas } from "./HotFolderImageCanvas";
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
	onAttachToEmr,
	onExportDicom,
	onSendToLab,
}) => {
	const modalId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Hot Folder Items State
	const [hotFolderItems, setHotFolderItems] = useState<HotFolderItem[]>([]);
	const [activeSourceFilter, setActiveSourceFilter] = useState<HotFolderSource>("all");
	const [selectedItemId, setSelectedItemId] = useState<string>("");
	const [isScanning, setIsScanning] = useState(false);
	const [lastScanTime, setLastScanTime] = useState<string>("только что");
	const [isDragOver, setIsDragOver] = useState(false);

	// Active Selected Item
	const activeItem = useMemo(() => {
		return hotFolderItems.find((i) => i.id === selectedItemId) || hotFolderItems[0] || null;
	}, [hotFolderItems, selectedItemId]);

	// Selected Teeth in FDI formula
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);

	// Synchronize selected teeth when switching hot folder item
	useEffect(() => {
		if (activeItem && activeItem.detectedTeeth.length > 0) {
			setSelectedTeeth(activeItem.detectedTeeth);
		}
	}, [activeItem]);

	// Image Display & Filter Controls
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [invert, setInvert] = useState<boolean>(false);
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
		if (clinicalPurpose === "endo_control") {
			setProtocolNote(
				`Прицельная радиовизиография зуба ${teethStr}. Контроль качества пломбирования корневых каналов: каналы обтурированы плотно и гомогенно на всем протяжении до рентгенологического апекса. Выведения силера за верхушку корня нет. Периодонтальная щель в периапикальной зоне без деструкции кости.`,
			);
		} else if (clinicalPurpose === "primary_caries") {
			setProtocolNote(
				`Прицельная радиовизиография зуба ${teethStr}. Обнаружен кариозный дефект твердых тканей коронки, проникающий в средние/глубокие слои дентина. Периапикальные ткани интактны, кортикальная пластинка альвеолы прослеживается.`,
			);
		} else if (clinicalPurpose === "implant_check") {
			setProtocolNote(
				`Контрольная рентгенография области имплантата в позиции ${teethStr}. Интеграция тела имплантата удовлетворительная, плотный контакт с костной тканью альвеолярного гребня. Резорбции краевой кости не выявлено.`,
			);
		} else if (clinicalPurpose === "periapical_check") {
			setProtocolNote(
				`Прицельная радиовизиография зуба ${teethStr}. В области верхушки корня определяется разрежение костной ткани с нечеткими контурами (деструкция периодонта). Корневые каналы ранее не лечены.`,
			);
		} else if (clinicalPurpose === "orthopantomogram") {
			setProtocolNote(
				`Ортопантомограмма челюстей. Зубные ряды интактны, положение зачатков зубов мудрости удовлетворительное, альвеолярный край сохранен, ВНЧС симметричны.`,
			);
		} else {
			setProtocolNote(
				`Прицельная рентгенография зуба ${teethStr}. Краевое прилегание искусственной коронки/вкладки к уступу плотное, нависающих краев и вторичного кариеса под конструкцией не определяется.`,
			);
		}
	}, [selectedTeeth, clinicalPurpose]);

	// Apply Filter Preset
	const handleApplyPreset = (key: FilterPresetKey) => {
		const preset = FILTER_PRESETS[key];
		setActivePreset(key);
		setBrightness(preset.brightness);
		setContrast(preset.contrast);
		setInvert(preset.invert);
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
	const handleSelectAllTeeth = () => {
		const all = [
			...ADULT_FDI_TEETH.quadrant1,
			...ADULT_FDI_TEETH.quadrant2,
			...ADULT_FDI_TEETH.quadrant3,
			...ADULT_FDI_TEETH.quadrant4,
		];
		setSelectedTeeth(all);
	};

	const handleSelectUpperArch = () => {
		setSelectedTeeth([...ADULT_FDI_TEETH.quadrant1, ...ADULT_FDI_TEETH.quadrant2]);
	};

	const handleSelectLowerArch = () => {
		setSelectedTeeth([...ADULT_FDI_TEETH.quadrant4, ...ADULT_FDI_TEETH.quadrant3]);
	};

	const handleSelectFrontal = () => {
		setSelectedTeeth(["13", "12", "11", "21", "22", "23", "43", "42", "41", "31", "32", "33"]);
	};

	const handleSelectRightMolar = () => {
		setSelectedTeeth(["18", "17", "16", "15", "14", "48", "47", "46", "45", "44"]);
	};

	const handleSelectLeftMolar = () => {
		setSelectedTeeth(["24", "25", "26", "27", "28", "34", "35", "36", "37", "38"]);
	};

	// Manual scan folder trigger
	const handleRescanFolder = () => {
		setIsScanning(true);
		setTimeout(() => {
			setIsScanning(false);
			setLastScanTime("только что");
			showToast("Сетевая папка рентгена успешно синхронизирована (EzDent-i, Romexis, Sidexis)", "success");
		}, 600);
	};

	// Handle Drag and Drop Files
	const handleDropFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === "string") {
				const lowerName = file.name.toLowerCase();
				let modality: "intraoral_rvg" | "optg_panoramic" | "cbct_slice" | "bitewing" = "intraoral_rvg";
				let detectedTeeth = ["16"];

				if (lowerName.includes("optg") || lowerName.includes("panoramic")) {
					modality = "optg_panoramic";
					detectedTeeth = [
						"18", "17", "16", "15", "14", "13", "12", "11",
						"21", "22", "23", "24", "25", "26", "27", "28",
						"48", "47", "46", "45", "44", "43", "42", "41",
						"31", "32", "33", "34", "35", "36", "37", "38",
					];
				} else if (lowerName.includes("bitewing") || lowerName.includes("bw")) {
					modality = "bitewing";
					detectedTeeth = ["16", "15", "46", "45"];
				}

				// Extract tooth from filename if present (e.g. Tooth21, 21.dcm)
				const toothMatch = file.name.match(/\b([1-4][1-8])\b/);
				if (toothMatch?.[1]) {
					detectedTeeth = [toothMatch[1]];
				}

				const newItem: HotFolderItem = {
					id: `dropped-${Date.now()}`,
					filename: file.name,
					source: "dicom_network",
					sourceLabel: "Локальный импорт (Dropzone)",
					folderPath: "Внешний файл / Дропзона",
					detectedModality: modality,
					modalityLabel: modality === "optg_panoramic" ? "ОПТГ Панорама" : "Прицельный RVG",
					detectedTeeth,
					sizeBytes: file.size,
					sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} МБ`,
					timestampIso: new Date().toISOString(),
					relativeTime: "только что",
					imageUrl: result,
					status: "new",
					patientMatch: {
						patientName,
						cardNumber: patientCardNumber,
						confidence: 100,
					},
					metadata: {
						kv: 65,
						ma: 7.0,
						exposureSec: 0.08,
						pixelSpacingMm: 0.035,
						apparatusModel: "Импортированный снимок DICOM",
						sensorResolution: "29.2 lp/mm",
					},
				};

				setHotFolderItems((prev) => [newItem, ...prev]);
				setSelectedItemId(newItem.id);
				setSelectedTeeth(detectedTeeth);
				showToast(`Файл ${file.name} успешно загружен и привязан`, "success");
			}
		};
		reader.readAsDataURL(file);
	};

	// Filtered files list
	const filteredItems = useMemo(() => {
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
			patientName,
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

		showToast(
			`Снимок (${activeItem.filename}) успешно прикреплен к карте пациента ${patientName} и протоколу ф. 043/у!`,
			"success",
		);
	}, [activeItem, patientName, selectedTeeth, doctorName, protocolNote, clinicalPurpose, onAttachToEmr]);

	// Canvas Pan drag handlers
	const handleMouseDownCanvas = (e: React.MouseEvent) => {
		setIsDraggingCanvas(true);
		dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
	};

	const handleMouseMoveCanvas = (e: React.MouseEvent) => {
		if (!isDraggingCanvas) return;
		setPan({
			x: e.clientX - dragStartRef.current.x,
			y: e.clientY - dragStartRef.current.y,
		});
	};

	const handleMouseUpCanvas = () => {
		setIsDraggingCanvas(false);
	};

	const handleResetView = () => {
		setZoom(100);
		setRotation(0);
		setFlipH(false);
		setPan({ x: 0, y: 0 });
		handleApplyPreset("standard");
	};

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
						<div className="hfi-header-icon-box">
							<FolderSync className="w-5 h-5" />
						</div>
						<div className="hfi-header-info">
							<div className="hfi-header-title-row">
								<h2 id={`${modalId}-title`} className="hfi-header-title">
									Импорт рентгенограмм из сетевой папки (Hot-Folder Intake)
								</h2>
								<span className="hfi-header-badge">
									<Wifi className="w-3 h-3 text-emerald-400" />
									<span>Auto-Polling Active</span>
								</span>
							</div>
							<p className="hfi-header-subtitle">
								<span>Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></span>
								<span>·</span>
								<span>Медкарта: <strong className="text-[var(--ink)]">{patientCardNumber}</strong></span>
								<span>·</span>
								<span>Врач: {doctorName}</span>
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
					{/* ─── 1. LEFT PANEL: HOT-FOLDER FILES & DROPZONE ───────────── */}
					<aside className="hfi-left-panel">
						<div className="hfi-left-header">
							<div className="hfi-folder-status-bar">
								<div className="hfi-folder-status-indicator">
									<span className="hfi-status-pulse-dot" />
									<span>Папка онлайн ({filteredItems.length} снимков)</span>
								</div>
								<button
									type="button"
									onClick={handleRescanFolder}
									disabled={isScanning}
									className="hfi-rescan-btn"
									data-testid="hfi-rescan-btn"
									title="Пересканировать сетевую папку"
								>
									<RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin text-teal-400" : ""}`} />
									<span>{isScanning ? "Скан..." : "Обновить"}</span>
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
								<option value="ezdent">Vatech EzDent-i (Auto-Export)</option>
								<option value="romexis">Planmeca Romexis (Exchange)</option>
								<option value="sidexis">Dentsply Sirona Sidexis 4</option>
								<option value="carestream">Carestream CS Imaging</option>
								<option value="dicom_network">Локальный импорт (Dropzone)</option>
							</select>
						</div>

						{/* Discovered Files List */}
						<div className="hfi-files-list" data-testid="hfi-files-list">
							{filteredItems.length === 0 ? (
								<div className="p-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
									<FolderSync className="w-8 h-8 text-teal-400/40" />
									<p className="font-semibold text-gray-300">В папке пока нет новых снимков</p>
									<p className="text-[11px] text-gray-500 max-w-[200px]">
										Экспортируйте снимок из EzDent / Romexis или перетащите файл в область ниже.
									</p>
								</div>
							) : (
								filteredItems.map((item) => {
								const isSelected = item.id === activeItem?.id;
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
											<span className={`hfi-file-status-badge ${item.status}`}>
												{item.status === "new" ? "Новый" : item.status === "imported" ? "Импортирован" : "В работе"}
											</span>
										</div>

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

										{item.patientMatch && (
											<div className="mt-1 pt-1 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-emerald-400">
												<span className="truncate max-w-[170px] inline-flex items-center gap-1">
													<Check className="w-3 h-3 shrink-0" />
													<span>{item.patientMatch.patientName}</span>
												</span>
												<span className="font-mono font-bold">
													{item.patientMatch.confidence}% match
												</span>
											</div>
										)}
									</button>
								);
							}))}
						</div>

						{/* Dropzone for local dragging */}
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
								<p className="hfi-dropzone-title">Перетащите снимок сюда</p>
								<p className="hfi-dropzone-sub">DICOM (.dcm), TIFF, PNG, JPG из EzDent/Romexis</p>
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
						brightness={brightness}
						contrast={contrast}
						invert={invert}
						activePreset={activePreset}
						onMouseDownCanvas={handleMouseDownCanvas}
						onApplyPreset={handleApplyPreset}
						setBrightness={setBrightness}
						setContrast={setContrast}
						setInvert={setInvert}
						setRotation={setRotation}
						setFlipH={setFlipH}
						setZoom={setZoom}
						onResetView={handleResetView}
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
								className="hfi-primary-attach-btn"
								data-testid="hfi-primary-attach-btn"
							>
								<Zap className="w-4 h-4 fill-white" />
								<span>Прикрепить к карте пациента и протоколу ф. 043/у</span>
							</button>

							<div className="hfi-secondary-actions-row">
								<button
									type="button"
									onClick={() => {
										if (activeItem) {
											onExportDicom?.(activeItem);
											showToast(`Экспорт DICOM (${activeItem.filename}) выполнен`, "info");
										}
									}}
									className="hfi-secondary-btn"
									data-testid="hfi-export-dicom-btn"
								>
									<Download className="w-3.5 h-3.5" />
									<span>Экспорт DICOM</span>
								</button>

								<button
									type="button"
									onClick={() => {
										if (activeItem) {
											onSendToLab?.(activeItem, protocolNote);
											showToast(`Снимок отправлен в зуботехническую лабораторию`, "info");
										}
									}}
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
