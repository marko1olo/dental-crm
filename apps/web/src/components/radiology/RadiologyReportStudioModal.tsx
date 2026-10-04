/**
 * DENTE CRM — Canonical EzDent-i Radiology Report & Print Studio (RadiologyReportStudioModal)
 * Window #5: Interactive Layout Sheet & Strict Clinical A4 Medical Blank.
 *
 * Standards:
 * - High-end Apple HIG Segmented Controls for layout presets (1, 2 vert, 2 horiz, 4 grid).
 * - Strict Medical A4 Blank: DENTE branding, patient meta, quiet statutory DAP dosimetry.
 * - Clinical Conclusion Block: Macro templates & doctor findings.
 * - Doctor Signature & Clinical Stamp.
 * - Primary CTA: Print (Ctrl+P) and PDF Export.
 * - Mandate 8b (<800 lines), Mandate 8e (Doctor Autonomy).
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
	Check,
	ChevronDown,
	Columns2,
	Download,
	FileText,
	Grid2X2,
	Image as ImageIcon,
	Maximize2,
	Printer,
	RotateCcw,
	Rows2,
	Settings,
	Square,
	Trash2,
	Type,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";
import "./radiologyReport.css";

export type PageSizeOption = "A4" | "14x17_film" | "A3";
export type OrientationOption = "portrait" | "landscape";
export type LegendPlacementOption = "below" | "above" | "hidden";

export interface ReportPrintSettings {
	pageSize: PageSizeOption;
	orientation: OrientationOption;
	legendPlacement: LegendPlacementOption;
	header: {
		showDate: boolean;
		showPatientInfo: boolean;
		showClinicLogo: boolean;
	};
	footer: {
		showClinicName: boolean;
		showPhone: boolean;
		showWebsite: boolean;
		showAddress: boolean;
	};
}

export interface ReportFrameItem {
	id: string;
	type: "image" | "text";
	x: number; // percentage 0..100
	y: number; // percentage 0..100
	width: number; // percentage 10..100
	height: number; // percentage 10..100
	imageUrl?: string | undefined;
	toothFdi?: string | undefined;
	modalityLabel?: string | undefined;
	dapDoseDgyCm2?: number | undefined;
	capturedAt?: string | undefined;
	zoomRatioPercent?: number | undefined;
	textContent?: string | undefined;
}

export interface RadiologyReportStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	patientCardNumber?: string | undefined;
	patientAge?: string | number | undefined;
	patientGender?: string | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	clinicPhone?: string | undefined;
	clinicAddress?: string | undefined;
	clinicWebsite?: string | undefined;
	initialImages?: Array<{
		imageUrl: string;
		toothFdi?: string;
		modalityLabel?: string;
		dapDoseDgyCm2?: number;
		capturedAt?: string;
	}> | undefined;
}

const DEFAULT_PRINT_SETTINGS: ReportPrintSettings = {
	pageSize: "A4",
	orientation: "portrait",
	legendPlacement: "below",
	header: {
		showDate: true,
		showPatientInfo: true,
		showClinicLogo: true,
	},
	footer: {
		showClinicName: true,
		showPhone: true,
		showWebsite: true,
		showAddress: true,
	},
};

export const RadiologyReportStudioModal: React.FC<RadiologyReportStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Ковалёв Роман Станиславович",
	patientCardNumber = "МК-РАТ-1",
	patientAge = "58Y",
	patientGender = "Муж.",
	doctorName = "Д-р Воронов Алексей Владимирович",
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	clinicPhone = "+7 (495) 123-45-67",
	clinicAddress = "г. Москва, Столярный переулок, д. 14",
	clinicWebsite = "www.dente-clinic.ru",
	initialImages = [],
}) => {
	// Print & Page Settings
	const [settings, setSettings] = useState<ReportPrintSettings>(DEFAULT_PRINT_SETTINGS);
	const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
	const [viewZoom, setViewZoom] = useState<number>(100);
	const [activeLayout, setActiveLayout] = useState<"single" | "two_vertical" | "two_horizontal" | "grid_four">("two_vertical");

	// Clinical Conclusion & Doctor Findings
	const [conclusionText, setConclusionText] = useState<string>(
		"Зуб 16: Корневые каналы обтурированы до физиологического апекса, деструкции костной ткани не выявлено. Периодонтальная щель равномерная.",
	);

	// Layout frames state (Default: 2 stacked frames matching clinical protocol)
	const [frames, setFrames] = useState<ReportFrameItem[]>(() => {
		const defaultDate = "16.05.2024";
		const sample1 = initialImages[0]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";
		const sample2 = initialImages[1]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";

		return [
			{
				id: "frame-1",
				type: "image",
				x: 5,
				y: 2,
				width: 90,
				height: 44,
				imageUrl: sample1,
				toothFdi: initialImages[0]?.toothFdi || "16",
				modalityLabel: initialImages[0]?.modalityLabel || "IO-сенсор (Внутриротовой сенсор)",
				dapDoseDgyCm2: initialImages[0]?.dapDoseDgyCm2 ?? 0.024,
				capturedAt: initialImages[0]?.capturedAt || defaultDate,
				zoomRatioPercent: 100.0,
			},
			{
				id: "frame-2",
				type: "image",
				x: 5,
				y: 50,
				width: 90,
				height: 44,
				imageUrl: sample2,
				toothFdi: initialImages[1]?.toothFdi || "13",
				modalityLabel: initialImages[1]?.modalityLabel || "IO-сенсор (Внутриротовой сенсор)",
				dapDoseDgyCm2: initialImages[1]?.dapDoseDgyCm2 ?? 0.024,
				capturedAt: initialImages[1]?.capturedAt || "13.05.2024",
				zoomRatioPercent: 100.0,
			},
		];
	});

	const [selectedFrameId, setSelectedFrameId] = useState<string | null>("frame-1");

	// Available Patient Studies for Bottom Filmstrip
	const availableStudies =
		initialImages.length > 0
			? initialImages.map((img, idx) => ({
					id: `study-${idx}`,
					imageUrl: img.imageUrl,
					toothFdi: img.toothFdi || "16",
					modalityLabel: img.modalityLabel || "IO-сенсор",
					dapDoseDgyCm2: img.dapDoseDgyCm2 ?? 0.024,
					capturedAt: img.capturedAt || "16.05.2024 08:46:21",
				}))
			: [
					{
						id: "study-0",
						imageUrl: "/radiology/sample_rvg_tooth16.jpg",
						toothFdi: "16",
						modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
						dapDoseDgyCm2: 0.024,
						capturedAt: "16.05.2024 08:46:21",
					},
					{
						id: "study-1",
						imageUrl: "/radiology/sample_rvg_tooth16.jpg",
						toothFdi: "13",
						modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
						dapDoseDgyCm2: 0.024,
						capturedAt: "13.05.2024 08:37:25",
					},
					{
						id: "study-2",
						imageUrl: "/radiology/sample_rvg_tooth16.jpg",
						toothFdi: "26",
						modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
						dapDoseDgyCm2: 0.024,
						capturedAt: "15.04.2024 15:00:52",
					},
					{
						id: "study-3",
						imageUrl: "/radiology/sample_rvg_tooth16.jpg",
						toothFdi: "36",
						modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
						dapDoseDgyCm2: 0.024,
						capturedAt: "11.08.2023 13:41:01",
					},
					{
						id: "study-4",
						imageUrl: "/radiology/sample_rvg_tooth16.jpg",
						toothFdi: "46",
						modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
						dapDoseDgyCm2: 0.024,
						capturedAt: "13.07.2023 12:48:40",
					},
				];
	const [selectedStudyIndex, setSelectedStudyIndex] = useState<number>(1);

	const handleSelectStudyFromFilmstrip = (index: number) => {
		setSelectedStudyIndex(index);
		const study = availableStudies[index];
		if (!study) return;

		if (selectedFrameId) {
			setFrames((prev) =>
				prev.map((f) => {
					if (f.id !== selectedFrameId) return f;
					return {
						...f,
						imageUrl: study.imageUrl,
						toothFdi: study.toothFdi,
						modalityLabel: study.modalityLabel,
						dapDoseDgyCm2: study.dapDoseDgyCm2,
						capturedAt: study.capturedAt.split(" ")[0],
					};
				}),
			);
			showToast(`Снимок зуба #${study.toothFdi} помещен в активную рамку`, "info");
		} else {
			const newId = `frame-${Date.now()}`;
			setFrames((prev) => [
				...prev,
				{
					id: newId,
					type: "image",
					x: 10,
					y: 5,
					width: 80,
					height: 42,
					imageUrl: study.imageUrl,
					toothFdi: study.toothFdi,
					modalityLabel: study.modalityLabel,
					dapDoseDgyCm2: study.dapDoseDgyCm2,
					capturedAt: study.capturedAt.split(" ")[0],
					zoomRatioPercent: 100.0,
				},
			]);
			setSelectedFrameId(newId);
			showToast(`Добавлен снимок зуба #${study.toothFdi}`, "info");
		}
	};

	// Dragging & Resizing State
	const sheetRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<{
		mode: "move" | "resize";
		handle?: string;
		frameId: string;
		startX: number;
		startY: number;
		initX: number;
		initY: number;
		initW: number;
		initH: number;
	} | null>(null);

	// Apply Pre-configured Template Layouts
	const handleApplyLayout = (type: "single" | "two_vertical" | "two_horizontal" | "grid_four") => {
		setActiveLayout(type);
		const sample1 = availableStudies[0]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";
		const sample2 = availableStudies[1]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";
		const sample3 = availableStudies[2]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";
		const sample4 = availableStudies[3]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";

		if (type === "single") {
			setFrames([
				{
					id: "frame-1",
					type: "image",
					x: 6,
					y: 2,
					width: 88,
					height: 92,
					imageUrl: sample1,
					toothFdi: "16",
					modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
					dapDoseDgyCm2: 0.024,
					capturedAt: "16.05.2024",
					zoomRatioPercent: 100.0,
				},
			]);
		} else if (type === "two_vertical") {
			setFrames([
				{
					id: "frame-1",
					type: "image",
					x: 5,
					y: 2,
					width: 90,
					height: 45,
					imageUrl: sample1,
					toothFdi: "16",
					modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
					dapDoseDgyCm2: 0.024,
					capturedAt: "16.05.2024",
					zoomRatioPercent: 100.0,
				},
				{
					id: "frame-2",
					type: "image",
					x: 5,
					y: 50,
					width: 90,
					height: 45,
					imageUrl: sample2,
					toothFdi: "13",
					modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
					dapDoseDgyCm2: 0.024,
					capturedAt: "13.05.2024",
					zoomRatioPercent: 100.0,
				},
			]);
		} else if (type === "two_horizontal") {
			setFrames([
				{
					id: "frame-1",
					type: "image",
					x: 3,
					y: 10,
					width: 45,
					height: 78,
					imageUrl: sample1,
					toothFdi: "16",
					modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
					dapDoseDgyCm2: 0.024,
					capturedAt: "16.05.2024",
					zoomRatioPercent: 100.0,
				},
				{
					id: "frame-2",
					type: "image",
					x: 52,
					y: 10,
					width: 45,
					height: 78,
					imageUrl: sample2,
					toothFdi: "26",
					modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
					dapDoseDgyCm2: 0.024,
					capturedAt: "15.04.2024",
					zoomRatioPercent: 100.0,
				},
			]);
		} else if (type === "grid_four") {
			setFrames([
				{ id: "frame-1", type: "image", x: 3, y: 2, width: 45, height: 45, imageUrl: sample1, toothFdi: "16", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "16.05.2024", zoomRatioPercent: 100.0 },
				{ id: "frame-2", type: "image", x: 52, y: 2, width: 45, height: 45, imageUrl: sample2, toothFdi: "13", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "13.05.2024", zoomRatioPercent: 100.0 },
				{ id: "frame-3", type: "image", x: 3, y: 50, width: 45, height: 45, imageUrl: sample3, toothFdi: "26", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "15.04.2024", zoomRatioPercent: 100.0 },
				{ id: "frame-4", type: "image", x: 52, y: 50, width: 45, height: 45, imageUrl: sample4, toothFdi: "36", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "11.08.2023", zoomRatioPercent: 100.0 },
			]);
		}
		setSelectedFrameId("frame-1");
		showToast("Шаблон макета применен", "info");
	};

	const handleAddImageFrame = () => {
		const newId = `frame-${Date.now()}`;
		const newFrame: ReportFrameItem = {
			id: newId,
			type: "image",
			x: 15,
			y: 15,
			width: 70,
			height: 42,
			imageUrl: "/radiology/sample_rvg_tooth16.jpg",
			toothFdi: "16",
			modalityLabel: "IO-сенсор (Внутриротовой сенсор)",
			dapDoseDgyCm2: 0.024,
			capturedAt: new Date().toLocaleDateString("ru-RU"),
			zoomRatioPercent: 100.0,
		};
		setFrames((prev) => [...prev, newFrame]);
		setSelectedFrameId(newId);
	};

	const handleAddTextFrame = () => {
		const newId = `frame-${Date.now()}`;
		const newFrame: ReportFrameItem = {
			id: newId,
			type: "text",
			x: 5,
			y: 80,
			width: 90,
			height: 14,
			textContent: "Заключение: Патологических изменений костной ткани в периапикальной области не выявлено.",
		};
		setFrames((prev) => [...prev, newFrame]);
		setSelectedFrameId(newId);
	};

	const handleDeleteSelected = () => {
		if (!selectedFrameId) return;
		setFrames((prev) => prev.filter((f) => f.id !== selectedFrameId));
		setSelectedFrameId(null);
	};

	const handleResetFrames = () => {
		handleApplyLayout("two_vertical");
	};

	// Mouse Drag & Resize Handlers
	const startMove = (e: React.MouseEvent, frameId: string) => {
		e.stopPropagation();
		setSelectedFrameId(frameId);
		const frame = frames.find((f) => f.id === frameId);
		if (!frame) return;

		dragRef.current = {
			mode: "move",
			frameId,
			startX: e.clientX,
			startY: e.clientY,
			initX: frame.x,
			initY: frame.y,
			initW: frame.width,
			initH: frame.height,
		};
	};

	const startResize = (e: React.MouseEvent, frameId: string, handle: string) => {
		e.stopPropagation();
		setSelectedFrameId(frameId);
		const frame = frames.find((f) => f.id === frameId);
		if (!frame) return;

		dragRef.current = {
			mode: "resize",
			handle,
			frameId,
			startX: e.clientX,
			startY: e.clientY,
			initX: frame.x,
			initY: frame.y,
			initW: frame.width,
			initH: frame.height,
		};
	};

	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		if (!dragRef.current || !sheetRef.current) return;
		const sheetRect = sheetRef.current.getBoundingClientRect();
		const deltaXPct = ((e.clientX - dragRef.current.startX) / sheetRect.width) * 100;
		const deltaYPct = ((e.clientY - dragRef.current.startY) / sheetRect.height) * 100;

		const { mode, frameId, handle, initX, initY, initW, initH } = dragRef.current;

		setFrames((prev) =>
			prev.map((f) => {
				if (f.id !== frameId) return f;
				if (mode === "move") {
					const newX = Math.max(0, Math.min(100 - f.width, initX + deltaXPct));
					const newY = Math.max(0, Math.min(100 - f.height, initY + deltaYPct));
					return { ...f, x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)) };
				}
				if (mode === "resize" && handle) {
					let newX = initX;
					let newY = initY;
					let newW = initW;
					let newH = initH;

					if (handle.includes("e")) newW = Math.max(15, Math.min(100 - initX, initW + deltaXPct));
					if (handle.includes("s")) newH = Math.max(10, Math.min(100 - initY, initH + deltaYPct));
					if (handle.includes("w")) {
						const candidateW = Math.max(15, initW - deltaXPct);
						newX = initX + (initW - candidateW);
						newW = candidateW;
					}
					if (handle.includes("n")) {
						const candidateH = Math.max(10, initH - deltaYPct);
						newY = initY + (initH - candidateH);
						newH = candidateH;
					}

					const computedRatio = Number(((newW / 45) * 100).toFixed(2));

					return {
						...f,
						x: Number(newX.toFixed(1)),
						y: Number(newY.toFixed(1)),
						width: Number(newW.toFixed(1)),
						height: Number(newH.toFixed(1)),
						zoomRatioPercent: computedRatio,
					};
				}
				return f;
			}),
		);
	}, []);

	const handleMouseUp = useCallback(() => {
		dragRef.current = null;
	}, []);

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	const handleExportPdf = () => {
		showToast('Отправка на печать: выберите "Сохранить как PDF" в системном диалоге', "info");
		window.print();
	};

	// Hotkeys: Ctrl+P for print, Escape to close
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
				e.preventDefault();
				handlePrint();
			} else if (e.key === "Escape") {
				if (isSettingsOpen) {
					setIsSettingsOpen(false);
				} else {
					onClose();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isSettingsOpen, handlePrint, onClose]);

	if (!isOpen) return null;

	const getSheetAspectRatio = () => {
		if (settings.pageSize === "14x17_film") {
			return settings.orientation === "portrait" ? "14 / 17" : "17 / 14";
		}
		if (settings.pageSize === "A3") {
			return settings.orientation === "portrait" ? "297 / 420" : "420 / 297";
		}
		return settings.orientation === "portrait" ? "210 / 297" : "297 / 210";
	};

	return (
		<div
			className="radiology-report-modal"
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			data-testid="radiology-report-studio-modal"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP TOOLBAR (Apple HIG / DENTE Design Standards)
			    ═══════════════════════════════════════════════════════════════════ */}
			<header className="radiology-report-toolbar">
				{/* Left: Branding & Page Specs */}
				<div className="radiology-report-brand">
					<div className="radiology-report-icon-box">
						<FileText className="w-4 h-4" />
					</div>
					<div>
						<h2 className="radiology-report-title">Конструктор отчетов А4</h2>
						<div className="radiology-report-subtitle">
							{settings.pageSize === "14x17_film" ? "14x17\" Пленка" : settings.pageSize} ·{" "}
							{settings.orientation === "portrait" ? "Книжная ориентация" : "Альбомная ориентация"}
						</div>
					</div>
				</div>

				{/* Center: Segmented Control Layout Switcher & Action Tools */}
				<div className="flex items-center gap-2">
					<div className="radiology-segmented-control" role="group" aria-label="Раскладка отчета">
						<button
							type="button"
							onClick={() => handleApplyLayout("single")}
							className={`radiology-segment-btn ${activeLayout === "single" ? "active" : ""}`}
							title="1 снимок на лист"
						>
							<Square className="w-3.5 h-3.5" />
							<span>1 снимок</span>
						</button>
						<button
							type="button"
							onClick={() => handleApplyLayout("two_vertical")}
							className={`radiology-segment-btn ${activeLayout === "two_vertical" ? "active" : ""}`}
							title="2 снимка вертикально"
							data-testid="btn-layout-two-vert"
						>
							<Rows2 className="w-3.5 h-3.5" />
							<span>2 верт.</span>
						</button>
						<button
							type="button"
							onClick={() => handleApplyLayout("two_horizontal")}
							className={`radiology-segment-btn ${activeLayout === "two_horizontal" ? "active" : ""}`}
							title="2 снимка рядом (сплит)"
						>
							<Columns2 className="w-3.5 h-3.5" />
							<span>2 гориз.</span>
						</button>
						<button
							type="button"
							onClick={() => handleApplyLayout("grid_four")}
							className={`radiology-segment-btn ${activeLayout === "grid_four" ? "active" : ""}`}
							title="Сетка 4 снимка"
						>
							<Grid2X2 className="w-3.5 h-3.5" />
							<span>4 снимка</span>
						</button>
					</div>

					<div className="h-5 w-px bg-zinc-700/60 mx-1" />

					{/* Insert & Reset Tools */}
					<button
						type="button"
						onClick={handleAddImageFrame}
						className="radiology-tool-btn"
						data-testid="btn-add-image-frame"
						title="Добавить снимок в макет"
					>
						<ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
						<span>+ Снимок</span>
					</button>

					<button
						type="button"
						onClick={handleAddTextFrame}
						className="radiology-tool-btn"
						data-testid="btn-add-text-frame"
						title="Добавить текстовый блок описания"
					>
						<Type className="w-3.5 h-3.5 text-blue-400" />
						<span>+ Текст</span>
					</button>

					<button
						type="button"
						onClick={handleResetFrames}
						className="radiology-tool-btn"
						title="Сбросить макет к стандарту"
					>
						<RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
						<span>Сброс</span>
					</button>

					{selectedFrameId && (
						<button
							type="button"
							onClick={handleDeleteSelected}
							className="radiology-tool-btn danger"
							data-testid="btn-delete-frame"
							title="Удалить выбранную рамку"
						>
							<Trash2 className="w-3.5 h-3.5" />
							<span>Удалить</span>
						</button>
					)}
				</div>

				{/* Right: Scale Zoom, Settings & Primary CTAs */}
				<div className="flex items-center gap-2">
					<div className="radiology-zoom-group">
						<button
							type="button"
							onClick={() => setViewZoom((z) => Math.max(50, z - 10))}
							className="radiology-zoom-btn"
							title="Уменьшить масштаб"
						>
							<ZoomOut className="w-3.5 h-3.5" />
						</button>
						<span className="radiology-zoom-label">{viewZoom}%</span>
						<button
							type="button"
							onClick={() => setViewZoom((z) => Math.min(150, z + 10))}
							className="radiology-zoom-btn"
							title="Увеличить масштаб"
						>
							<ZoomIn className="w-3.5 h-3.5" />
						</button>
					</div>

					<button
						type="button"
						onClick={() => setIsSettingsOpen(true)}
						className="radiology-tool-btn"
						data-testid="btn-open-print-settings"
						title="Настройки параметров листа и колонтитулов"
					>
						<Settings className="w-3.5 h-3.5 text-zinc-400" />
						<span>Параметры</span>
					</button>

					<button
						type="button"
						onClick={handleExportPdf}
						className="radiology-btn-pdf"
						title="Экспорт отчета в PDF"
					>
						<Download className="w-3.5 h-3.5" />
						<span>Экспорт PDF</span>
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="radiology-btn-primary"
						data-testid="btn-execute-print"
						title="Печать отчета (Ctrl+P)"
					>
						<Printer className="w-3.5 h-3.5" />
						<span>Печать (Ctrl+P)</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="radiology-tool-btn !px-2 ml-1"
						data-testid="btn-close-report-studio"
						title="Закрыть студию отчетов (Esc)"
					>
						<X className="w-4 h-4 text-zinc-400" />
					</button>
				</div>
			</header>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. VIRTUAL SHEET WORKSPACE CANVAS (A4 Medical Blank)
			    ═══════════════════════════════════════════════════════════════════ */}
			<main className="radiology-report-canvas-area" onClick={() => setSelectedFrameId(null)}>
				<div
					ref={sheetRef}
					data-testid="radiology-virtual-sheet"
					style={{
						aspectRatio: getSheetAspectRatio(),
						width: `${Math.round(520 * (viewZoom / 100))}px`,
						maxWidth: "92vw",
					}}
					className="radiology-a4-sheet"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Virtual Sheet Header */}
					<header className="radiology-a4-header">
						<div className="radiology-a4-topbar">
							{settings.header.showClinicLogo ? (
								<div className="radiology-clinic-brand">
									<div className="radiology-clinic-logo-emblem">D</div>
									<div>
										<div className="radiology-clinic-name">{clinicName}</div>
										<div className="radiology-clinic-requisites">
											{clinicAddress} · Тел: {clinicPhone} · {clinicWebsite}
										</div>
									</div>
								</div>
							) : (
								<div />
							)}

							<div className="radiology-report-headline">
								<div className="radiology-report-headline-title">
									Протокол рентгенологического исследования
								</div>
								{settings.header.showDate && (
									<div className="radiology-report-headline-date">
										Дата исследования: {new Date().toLocaleDateString("ru-RU")}
									</div>
								)}
							</div>
						</div>

						{/* Patient & Doctor metadata grid */}
						{settings.header.showPatientInfo && (
							<div className="radiology-patient-summary-grid">
								<div>
									<div className="radiology-meta-label">Пациент</div>
									<div className="radiology-meta-value text-xs">{patientName}</div>
									<div className="text-[10px] text-slate-500 font-mono mt-0.5">
										Карта: {patientCardNumber} · {patientGender} · {patientAge}
									</div>
								</div>

								<div>
									<div className="radiology-meta-label">Врач</div>
									<div className="radiology-meta-value text-[11px]">{doctorName}</div>
									<div className="text-[9.5px] text-slate-500">Стоматолог-терапевт</div>
								</div>

								<div>
									<div className="radiology-meta-label">Модальность</div>
									<div className="radiology-meta-value text-[11px]">Интраоральная визиография</div>
									<div className="text-[9.5px] text-emerald-700 font-semibold font-mono">
										Дентальный сенсор HD
									</div>
								</div>
							</div>
						)}
					</header>

					{/* Radiographic Frames Container */}
					<div className="radiology-frames-container">
						{frames.map((frame) => {
							const isSelected = frame.id === selectedFrameId;

							return (
								<div
									key={frame.id}
									style={{
										left: `${frame.x}%`,
										top: `${frame.y}%`,
										width: `${frame.width}%`,
										height: `${frame.height}%`,
									}}
									className={`radiology-study-frame ${isSelected ? "selected" : ""}`}
									onMouseDown={(e) => startMove(e, frame.id)}
									data-testid={`report-frame-${frame.id}`}
								>
									{/* Above Legend Option */}
									{settings.legendPlacement === "above" && frame.type === "image" && (
										<div className="text-[9.5px] font-mono text-slate-700 py-1 px-2 truncate bg-white border-b border-slate-200">
											Зуб #{frame.toothFdi} · {frame.modalityLabel} · {frame.capturedAt} · {frame.dapDoseDgyCm2?.toFixed(3) || "0.024"} dGy*cm² [DAP]
										</div>
									)}

									{/* Frame Image / Content */}
									<div className="radiology-frame-viewport">
										{frame.type === "image" ? (
											<img
												src={frame.imageUrl}
												alt={`Снимок зуба #${frame.toothFdi}`}
												className="radiology-frame-image"
												onError={(e) => {
													(e.target as HTMLImageElement).src =
														"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23050505'/><text x='50%25' y='50%25' fill='%2310b981' font-family='sans-serif' font-size='13' text-anchor='middle'>Дентальная визиография</text></svg>";
												}}
											/>
										) : (
											<div className="w-full h-full p-2.5 bg-slate-50 text-slate-900 text-xs leading-relaxed overflow-auto">
												{frame.textContent}
											</div>
										)}
									</div>

									{/* Below Legend (Clean Clinical Legend + Quiet DAP Telemetry) */}
									{settings.legendPlacement === "below" && frame.type === "image" && (
										<div className="radiology-frame-caption" data-testid="frame-telemetry-legend">
											<div className="radiology-caption-clinical">
												<span>Зуб #{frame.toothFdi} · Интраоральная визиография</span>
												<span className="font-mono text-[9.5px] text-slate-500 font-normal">
													{frame.capturedAt}
												</span>
											</div>
											<div className="radiology-caption-telemetry">
												<span>Ratio: {frame.zoomRatioPercent?.toFixed(2) || "100.00"}%</span>
												<span>{frame.dapDoseDgyCm2?.toFixed(3) || "0.024"} dGy*cm² [DAP]</span>
												<span className="truncate max-w-[130px]">{frame.modalityLabel}</span>
											</div>
										</div>
									)}

									{/* 8 Resize Handles (Subtle & elegant white/green dots, NOT fluorescent eyesores) */}
									{isSelected && (
										<>
											<div
												className="radiology-resize-handle -top-1 -left-1 cursor-nw-resize"
												onMouseDown={(e) => startResize(e, frame.id, "nw")}
												data-testid="resize-handle-nw"
											/>
											<div
												className="radiology-resize-handle -top-1 left-1/2 -translate-x-1/2 cursor-n-resize"
												onMouseDown={(e) => startResize(e, frame.id, "n")}
											/>
											<div
												className="radiology-resize-handle -top-1 -right-1 cursor-ne-resize"
												onMouseDown={(e) => startResize(e, frame.id, "ne")}
											/>
											<div
												className="radiology-resize-handle top-1/2 -translate-y-1/2 -right-1 cursor-e-resize"
												onMouseDown={(e) => startResize(e, frame.id, "e")}
											/>
											<div
												className="radiology-resize-handle -bottom-1 -right-1 cursor-se-resize"
												onMouseDown={(e) => startResize(e, frame.id, "se")}
												data-testid="resize-handle-se"
											/>
											<div
												className="radiology-resize-handle -bottom-1 left-1/2 -translate-x-1/2 cursor-s-resize"
												onMouseDown={(e) => startResize(e, frame.id, "s")}
											/>
											<div
												className="radiology-resize-handle -bottom-1 -left-1 cursor-sw-resize"
												onMouseDown={(e) => startResize(e, frame.id, "sw")}
											/>
											<div
												className="radiology-resize-handle top-1/2 -translate-y-1/2 -left-1 cursor-w-resize"
												onMouseDown={(e) => startResize(e, frame.id, "w")}
											/>
										</>
									)}
								</div>
							);
						})}
					</div>

					{/* 3. Clinical Conclusion / Doctor Findings Block */}
					<section className="radiology-conclusion-card">
						<div className="radiology-conclusion-header">
							<div className="radiology-conclusion-title">
								<FileText className="w-3.5 h-3.5" />
								<span>Клиническое заключение / Описание снимка</span>
							</div>

							<div className="radiology-macros-pills">
								<button
									type="button"
									onClick={() =>
										setConclusionText(
											"Зуб 16: Корневые каналы обтурированы до физиологического апекса, деструкции костной ткани не выявлено. Периодонтальная щель равномерная.",
										)
									}
									className="radiology-macro-pill"
									title="Вставить шаблон: Эндодонтия в норме"
								>
									Каналы до апекса
								</button>
								<button
									type="button"
									onClick={() =>
										setConclusionText(
											"Периапикальных изменений не выявлено. Кортикальная пластинка альвеолы сохранена на всем протяжении.",
										)
									}
									className="radiology-macro-pill"
									title="Вставить шаблон: Без патологии"
								>
									Норма (без деструкции)
								</button>
								<button
									type="button"
									onClick={() =>
										setConclusionText(
											"Выявлен дефект твердых тканей коронковой части в пределах средних слоев дентина. Периапикальные ткани без патологических изменений.",
										)
									}
									className="radiology-macro-pill"
									title="Вставить шаблон: Кариозный дефект"
								>
									Кариозная полость
								</button>
							</div>
						</div>

						<textarea
							value={conclusionText}
							onChange={(e) => setConclusionText(e.target.value)}
							className="radiology-conclusion-textarea"
							placeholder="Введите рентгенологическое описание и заключение врача..."
							rows={2}
						/>
					</section>

					{/* 4. Doctor Signature & Authentic Clinical Stamp */}
					<footer className="radiology-signature-row">
						<div className="radiology-signature-doctor">
							<div className="radiology-signature-doc-name">Врач: {doctorName}</div>
							<div className="radiology-signature-doc-role">Врач-стоматолог терапевт / рентгенолог</div>
						</div>

						<div className="radiology-signature-line-box">
							<div className="radiology-signature-line">
								<div className="radiology-signature-handwritten">Воронов А.</div>
								<div className="radiology-signature-underline" />
								<div className="radiology-signature-label">Личная подпись врача</div>
							</div>

							{/* Real Clinical Rubber Stamp */}
							<div className="radiology-clinic-stamp" aria-hidden="true">
								<div className="radiology-stamp-top">СТОМАТОЛОГИЯ DENTE</div>
								<div className="radiology-stamp-center">ДЛЯ ДОКУМЕНТОВ</div>
								<div className="radiology-stamp-bottom">ЛО-77-01-019842</div>
							</div>
						</div>
					</footer>

					{/* 5. Virtual Sheet Footer */}
					{(settings.footer.showClinicName || settings.footer.showPhone || settings.footer.showAddress) && (
						<div className="border-t border-slate-200 pt-2 mt-3 text-[9.5px] text-slate-500 flex items-center justify-between shrink-0">
							<div className="flex gap-3">
								{settings.footer.showClinicName && (
									<span className="font-semibold text-slate-800">{clinicName}</span>
								)}
								{settings.footer.showAddress && <span>{clinicAddress}</span>}
							</div>
							<div className="flex gap-3 font-mono">
								{settings.footer.showPhone && <span>{clinicPhone}</span>}
								{settings.footer.showWebsite && <span>{clinicWebsite}</span>}
							</div>
						</div>
					)}
				</div>
			</main>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. BOTTOM FILMSTRIP TRAY (Thumbnails & Study Selection)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="radiology-filmstrip-tray" data-testid="radiology-bottom-filmstrip">
				<div className="flex items-center justify-between text-xs text-zinc-400">
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-semibold text-zinc-300">Снимки пациента:</span>
						<span className="text-[10px] text-zinc-500">
							Кликните на снимок для вставки в выбранную рамку макета
						</span>
					</div>

					<div className="flex items-center gap-1.5">
						<button
							type="button"
							className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
							title="Предыдущая страница"
						>
							‹
						</button>
						<span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
							1 / 1
						</span>
						<button
							type="button"
							className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
							title="Следующая страница"
						>
							›
						</button>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => handleSelectStudyFromFilmstrip(selectedStudyIndex)}
						className="radiology-tool-btn !h-16 !px-3 shrink-0 flex flex-col items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700"
						title="Поместить снимок в активную рамку отчета"
						data-testid="btn-filmstrip-insert"
					>
						<ImageIcon className="w-4 h-4 text-emerald-400" />
						<span className="text-[10px] font-semibold">Вставить в макет</span>
					</button>

					<div className="radiology-filmstrip-thumbs">
						{availableStudies.map((study, idx) => {
							const isActive = idx === selectedStudyIndex;
							return (
								<div
									key={study.id}
									onClick={() => handleSelectStudyFromFilmstrip(idx)}
									className={`radiology-thumb-card ${isActive ? "active" : ""}`}
									title={`Зуб #${study.toothFdi} · ${study.capturedAt}`}
									data-testid={`filmstrip-thumb-${idx}`}
								>
									<img
										src={study.imageUrl}
										alt={`Зуб #${study.toothFdi}`}
										onError={(e) => {
											(e.target as HTMLImageElement).src =
												"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='70' viewBox='0 0 100 70'><rect width='100' height='70' fill='%23111'/><text x='50%25' y='50%25' fill='%2310b981' font-family='sans-serif' font-size='10' text-anchor='middle'>RVG #16</text></svg>";
										}}
									/>
									<div className="radiology-thumb-badge">
										#{study.toothFdi} · {study.capturedAt.split(" ")[0]}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    4. PRINT SETTINGS DIALOG (Format, Header & Footers)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isSettingsOpen && (
				<div
					className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
					data-testid="print-settings-modal"
				>
					<div className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
						<div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/60">
							<h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
								Параметры печати и страницы
							</h3>
							<button
								type="button"
								onClick={() => setIsSettingsOpen(false)}
								className="text-zinc-400 hover:text-white"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="p-4 flex flex-col gap-4 text-xs">
							{/* 1. Paper Size */}
							<div>
								<label className="font-bold text-zinc-300 mb-1.5 block">Размер носителя:</label>
								<div className="grid grid-cols-3 gap-2">
									{(["A4", "14x17_film", "A3"] as PageSizeOption[]).map((size) => (
										<button
											key={size}
											type="button"
											onClick={() => setSettings((s) => ({ ...s, pageSize: size }))}
											className={`py-1.5 px-2 rounded-md font-semibold text-xs border text-center transition-colors cursor-pointer ${
												settings.pageSize === size
													? "bg-emerald-600 text-white border-emerald-500"
													: "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
											}`}
											data-testid={`btn-select-size-${size}`}
										>
											{size === "14x17_film" ? "14x17\" Пленка" : size}
										</button>
									))}
								</div>
							</div>

							{/* 2. Orientation */}
							<div>
								<label className="font-bold text-zinc-300 mb-1.5 block">Ориентация:</label>
								<div className="grid grid-cols-2 gap-2">
									{(["portrait", "landscape"] as OrientationOption[]).map((orient) => (
										<button
											key={orient}
											type="button"
											onClick={() => setSettings((s) => ({ ...s, orientation: orient }))}
											className={`py-1.5 px-3 rounded-md font-semibold text-xs border text-center transition-colors cursor-pointer ${
												settings.orientation === orient
													? "bg-emerald-600 text-white border-emerald-500"
													: "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
											}`}
											data-testid={`btn-select-orient-${orient}`}
										>
											{orient === "portrait" ? "● Книжная" : "○ Альбомная"}
										</button>
									))}
								</div>
							</div>

							{/* 3. Image Information (Legend placement) */}
							<div>
								<label className="font-bold text-zinc-300 mb-1.5 block">Сведения об изображении:</label>
								<div className="flex flex-col gap-1.5">
									<label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
										<input
											type="radio"
											name="legendPlacement"
											checked={settings.legendPlacement === "below"}
											onChange={() => setSettings((s) => ({ ...s, legendPlacement: "below" }))}
											className="accent-emerald-500"
											data-testid="radio-legend-below"
										/>
										<span>Показывать сведения под изображением (рекомендовано)</span>
									</label>
									<label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
										<input
											type="radio"
											name="legendPlacement"
											checked={settings.legendPlacement === "above"}
											onChange={() => setSettings((s) => ({ ...s, legendPlacement: "above" }))}
											className="accent-emerald-500"
										/>
										<span>Показывать сведения над изображением</span>
									</label>
									<label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
										<input
											type="radio"
											name="legendPlacement"
											checked={settings.legendPlacement === "hidden"}
											onChange={() => setSettings((s) => ({ ...s, legendPlacement: "hidden" }))}
											className="accent-emerald-500"
										/>
										<span>Скрыть сведения об изображении</span>
									</label>
								</div>
							</div>

							{/* 4. Header Checkboxes */}
							<div className="border-t border-zinc-800 pt-3">
								<label className="font-bold text-zinc-300 mb-1.5 block">Заголовок (Шапка):</label>
								<div className="grid grid-cols-2 gap-2 text-zinc-300">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={settings.header.showDate}
											onChange={(e) =>
												setSettings((s) => ({
													...s,
													header: { ...s.header, showDate: e.target.checked },
												}))
											}
											className="accent-emerald-500 rounded"
											data-testid="cb-header-date"
										/>
										<span>Дата</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={settings.header.showPatientInfo}
											onChange={(e) =>
												setSettings((s) => ({
													...s,
													header: { ...s.header, showPatientInfo: e.target.checked },
												}))
											}
											className="accent-emerald-500 rounded"
											data-testid="cb-header-patient"
										/>
										<span>Пациент</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={settings.header.showClinicLogo}
											onChange={(e) =>
												setSettings((s) => ({
													...s,
													header: { ...s.header, showClinicLogo: e.target.checked },
												}))
											}
											className="accent-emerald-500 rounded"
											data-testid="cb-header-logo"
										/>
										<span>Логотип клиники</span>
									</label>
								</div>
							</div>

							{/* 5. Footer Checkboxes */}
							<div className="border-t border-zinc-800 pt-3">
								<label className="font-bold text-zinc-300 mb-1.5 block">Нижний колонтитул:</label>
								<div className="grid grid-cols-2 gap-2 text-zinc-300">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={settings.footer.showClinicName}
											onChange={(e) =>
												setSettings((s) => ({
													...s,
													footer: { ...s.footer, showClinicName: e.target.checked },
												}))
											}
											className="accent-emerald-500 rounded"
											data-testid="cb-footer-name"
										/>
										<span>Название клиники</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={settings.footer.showPhone}
											onChange={(e) =>
												setSettings((s) => ({
													...s,
													footer: { ...s.footer, showPhone: e.target.checked },
												}))
											}
											className="accent-emerald-500 rounded"
											data-testid="cb-footer-phone"
										/>
										<span>Телефон</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={settings.footer.showWebsite}
											onChange={(e) =>
												setSettings((s) => ({
													...s,
													footer: { ...s.footer, showWebsite: e.target.checked },
												}))
											}
											className="accent-emerald-500 rounded"
											data-testid="cb-footer-web"
										/>
										<span>Веб-сайт</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={settings.footer.showAddress}
											onChange={(e) =>
												setSettings((s) => ({
													...s,
													footer: { ...s.footer, showAddress: e.target.checked },
												}))
											}
											className="accent-emerald-500 rounded"
											data-testid="cb-footer-address"
										/>
										<span>Адрес</span>
									</label>
								</div>
							</div>
						</div>

						<div className="px-4 py-3 bg-zinc-800/80 border-t border-zinc-700 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setIsSettingsOpen(false)}
								className="h-7 px-4 rounded-md text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 cursor-pointer"
								data-testid="btn-cancel-print-settings"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={() => setIsSettingsOpen(false)}
								className="h-7 px-5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
								data-testid="btn-apply-print-settings"
							>
								OK
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
