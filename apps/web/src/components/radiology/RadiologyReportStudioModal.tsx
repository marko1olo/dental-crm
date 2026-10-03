/**
 * DENTE CRM — Canonical EzDent-i Radiology Report & Print Studio (RadiologyReportStudioModal)
 * Window #5: Interactive Layout Sheet & Quiet Radiation Dosimetry.
 *
 * Standards:
 * - EzDent-i Screenshots 27, 28, 29: Virtual sheet (A4 / 14x17" film), draggable frames with 8 resize handles.
 * - Quiet Dosimetry: DAP dGy*cm^2, tooth FDI, and date strictly under images, zero screaming alerts.
 * - User Directive: Zero physics kV/mA clutter on screen (we are not physicists).
 * - Print Settings Modal (Screenshot 29): Page size, orientation, legend placement, header/footer checkboxes.
 * - Mandate 8b (<=800 lines), Mandate 8e (Doctor Autonomy).
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
	Activity,
	Check,
	ChevronDown,
	Columns,
	Download,
	FileText,
	Grid,
	Image as ImageIcon,
	Layers,
	Maximize2,
	Move,
	Plus,
	Printer,
	RotateCw,
	Settings,
	Sliders,
	Trash2,
	Type,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode.js";
import { showToast } from "../GlobalToast.js";

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
	x: number; // in percentage 0..100
	y: number; // in percentage 0..100
	width: number; // in percentage 10..100
	height: number; // in percentage 10..100
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
	patientName = "Чухрова Лариса",
	patientCardNumber = "20190621_101042",
	patientAge = "58Y",
	patientGender = "Жен.",
	clinicName = "Стоматологическая клиника DENTE",
	clinicPhone = "+7 (495) 123-45-67",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10",
	clinicWebsite = "www.dente-clinic.ru",
	initialImages = [],
}) => {
	// Print & Page Settings
	const [settings, setSettings] = useState<ReportPrintSettings>(DEFAULT_PRINT_SETTINGS);
	const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
	const [viewZoom, setViewZoom] = useState<number>(100);

	// Layout frames state (Default: 2 stacked frames matching EzDent-i Screenshots 27 & 28)
	const [frames, setFrames] = useState<ReportFrameItem[]>(() => {
		const defaultDate = "16.05.2024";
		const sample1 = initialImages[0]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";
		const sample2 = initialImages[1]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";

		return [
			{
				id: "frame-1",
				type: "image",
				x: 5,
				y: 10,
				width: 90,
				height: 38,
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
				y: 53,
				width: 90,
				height: 38,
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

	// Available Patient Studies for Bottom Filmstrip (EzDent-i Screenshots 27 & 28)
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
					y: 10,
					width: 80,
					height: 40,
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
		const sample = frames[0]?.imageUrl || "/radiology/sample_rvg_tooth16.jpg";
		if (type === "single") {
			setFrames([
				{
					id: "frame-1",
					type: "image",
					x: 8,
					y: 12,
					width: 84,
					height: 75,
					imageUrl: sample,
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
					y: 10,
					width: 90,
					height: 38,
					imageUrl: sample,
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
					y: 53,
					width: 90,
					height: 38,
					imageUrl: sample,
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
					x: 4,
					y: 15,
					width: 44,
					height: 65,
					imageUrl: sample,
					toothFdi: "16",
					modalityLabel: "IO-сенсор",
					dapDoseDgyCm2: 0.024,
					capturedAt: "16.05.2024",
					zoomRatioPercent: 100.0,
				},
				{
					id: "frame-2",
					type: "image",
					x: 52,
					y: 15,
					width: 44,
					height: 65,
					imageUrl: sample,
					toothFdi: "26",
					modalityLabel: "IO-сенсор",
					dapDoseDgyCm2: 0.024,
					capturedAt: "16.05.2024",
					zoomRatioPercent: 100.0,
				},
			]);
		} else if (type === "grid_four") {
			setFrames([
				{ id: "f-1", type: "image", x: 4, y: 10, width: 44, height: 38, imageUrl: sample, toothFdi: "16", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "16.05.2024", zoomRatioPercent: 100.0 },
				{ id: "f-2", type: "image", x: 52, y: 10, width: 44, height: 38, imageUrl: sample, toothFdi: "13", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "16.05.2024", zoomRatioPercent: 100.0 },
				{ id: "f-3", type: "image", x: 4, y: 52, width: 44, height: 38, imageUrl: sample, toothFdi: "36", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "16.05.2024", zoomRatioPercent: 100.0 },
				{ id: "f-4", type: "image", x: 52, y: 52, width: 44, height: 38, imageUrl: sample, toothFdi: "46", modalityLabel: "IO-сенсор", dapDoseDgyCm2: 0.024, capturedAt: "16.05.2024", zoomRatioPercent: 100.0 },
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
			x: 20,
			y: 25,
			width: 60,
			height: 40,
			imageUrl: "/radiology/sample_rvg_tooth16.jpg",
			toothFdi: "14",
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
			x: 10,
			y: 80,
			width: 80,
			height: 12,
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

					// Dynamic zoom ratio calculation relative to base 40% width
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

	const handlePrint = () => {
		window.print();
	};

	if (!isOpen) return null;

	// Calculate aspect ratio style
	const getSheetAspectRatio = () => {
		if (settings.pageSize === "14x17_film") {
			return settings.orientation === "portrait" ? "14 / 17" : "17 / 14";
		}
		if (settings.pageSize === "A3") {
			return settings.orientation === "portrait" ? "297 / 420" : "420 / 297";
		}
		// A4 default
		return settings.orientation === "portrait" ? "210 / 297" : "297 / 210";
	};

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white select-none overflow-hidden"
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			data-testid="radiology-report-studio-modal"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP TOOLBAR (EzDent-i Screenshot 27 Style, Height 36px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
						<FileText className="w-4 h-4" />
					</div>
					<div className="flex items-baseline gap-2">
						<h2 className="text-sm font-bold text-zinc-100">
							Конструктор радиологического отчета
						</h2>
						<span className="text-xs text-zinc-400">
							({settings.pageSize === "14x17_film" ? "Пленка 14x17\"" : settings.pageSize}, {settings.orientation === "portrait" ? "Книжная" : "Альбомная"})
						</span>
					</div>
				</div>

				{/* Center Toolbar Tools */}
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handleAddImageFrame}
						className="h-7 px-2.5 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
						data-testid="btn-add-image-frame"
						title="Вставить рамку рентгеновского снимка"
					>
						<ImageIcon className="w-3.5 h-3.5 text-teal-400" />
						<span>Вставить снимок</span>
					</button>

					<button
						type="button"
						onClick={handleAddTextFrame}
						className="h-7 px-2.5 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
						data-testid="btn-add-text-frame"
						title="Вставить текстовый блок описания"
					>
						<Type className="w-3.5 h-3.5 text-blue-400" />
						<span>Текст</span>
					</button>

					<div className="h-4 w-px bg-zinc-800 mx-1" />

					{/* Template Presets */}
					<button
						type="button"
						onClick={() => handleApplyLayout("single")}
						className="h-7 px-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
						title="1 снимок (полный лист)"
					>
						1 снимок
					</button>
					<button
						type="button"
						onClick={() => handleApplyLayout("two_vertical")}
						className="h-7 px-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
						title="2 снимка вертикально (EzDent-i 27)"
						data-testid="btn-layout-two-vert"
					>
						2 вертикально
					</button>
					<button
						type="button"
						onClick={() => handleApplyLayout("two_horizontal")}
						className="h-7 px-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
						title="2 снимка рядом (сплит)"
					>
						2 рядом
					</button>
					<button
						type="button"
						onClick={() => handleApplyLayout("grid_four")}
						className="h-7 px-2 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
						title="Сетка 4 снимка"
					>
						4 снимка
					</button>

					{selectedFrameId && (
						<button
							type="button"
							onClick={handleDeleteSelected}
							className="h-7 px-2 rounded-md text-xs font-medium bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/40 transition-colors ml-1 cursor-pointer inline-flex items-center gap-1"
							data-testid="btn-delete-frame"
							title="Удалить выбранную рамку"
						>
							<Trash2 className="w-3 h-3" />
							<span>Удалить</span>
						</button>
					)}
				</div>

				{/* Right: Patient badge, Settings & Print Actions */}
				<div className="flex items-center gap-2">
					<span className="text-xs font-mono text-zinc-300 font-semibold px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 hidden xl:inline-block">
						{patientCardNumber} {patientName} {patientAge}
					</span>

					<div className="flex items-center gap-1 bg-zinc-800 rounded-md p-0.5 border border-zinc-700">
						<button
							type="button"
							onClick={() => setViewZoom((z) => Math.max(50, z - 10))}
							className="p-1 text-zinc-400 hover:text-zinc-100 rounded"
							title="Уменьшить масштаб"
						>
							<ZoomOut className="w-3.5 h-3.5" />
						</button>
						<span className="text-[11px] font-mono px-1 text-zinc-300">{viewZoom}%</span>
						<button
							type="button"
							onClick={() => setViewZoom((z) => Math.min(150, z + 10))}
							className="p-1 text-zinc-400 hover:text-zinc-100 rounded"
							title="Увеличить масштаб"
						>
							<ZoomIn className="w-3.5 h-3.5" />
						</button>
					</div>

					<button
						type="button"
						onClick={() => setIsSettingsOpen(true)}
						className="h-7 px-2.5 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-open-print-settings"
						title="Настройки листа и колонтитулов (EzDent-i 29)"
					>
						<Settings className="w-3.5 h-3.5 text-zinc-400" />
						<span>Настройки печати</span>
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="h-7 px-3.5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
						data-testid="btn-execute-print"
						title="Отправить лист на печать"
					>
						<Printer className="w-3.5 h-3.5" />
						<span>Печать</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
						data-testid="btn-close-report-studio"
						title="Закрыть конструктор отчетов"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. VIRTUAL SHEET WORKSPACE CANVAS
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex-1 bg-slate-600/90 dark:bg-zinc-950 p-6 overflow-auto flex items-center justify-center relative">
				<div
					ref={sheetRef}
					data-testid="radiology-virtual-sheet"
					style={{
						aspectRatio: getSheetAspectRatio(),
						width: `${Math.round(580 * (viewZoom / 100))}px`,
						maxWidth: "92vw",
						backgroundColor: "#ffffff",
						color: "#0f172a",
						boxShadow: "0 14px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.12)",
					}}
					className="relative rounded-sm flex flex-col p-6 font-sans transition-all duration-75 overflow-hidden print:w-full print:h-full print:shadow-none print:m-0 print:p-8"
					onClick={() => setSelectedFrameId(null)}
				>
					{/* Virtual Sheet Header (Controlled by Print Settings) */}
					{settings.header.showPatientInfo && (
						<div className="flex items-center justify-between border-b border-neutral-300 pb-2 mb-3 text-[11px] leading-tight shrink-0">
							<div>
								<div className="font-bold text-neutral-900 text-xs">
									{patientName}
								</div>
								<div className="text-neutral-600 flex gap-2 font-mono text-[10px] mt-0.5">
									<span>Карта: {patientCardNumber}</span>
									<span>Пол: {patientGender}</span>
									<span>Возраст: {patientAge}</span>
								</div>
							</div>
							<div className="text-right">
								{settings.header.showClinicLogo && (
									<div className="font-black text-neutral-900 text-xs tracking-wider uppercase text-emerald-700">
										{clinicName.split(" ")[0]} <span className="text-neutral-800">DENTE</span>
									</div>
								)}
								{settings.header.showDate && (
									<div className="text-[10px] text-neutral-500 font-mono mt-0.5">
										{new Date().toLocaleDateString("ru-RU")}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Center Work Area with Interactive Frames */}
					<div className="flex-1 relative w-full h-full">
						{frames.map((frame) => {
							const isSelected = frame.id === selectedFrameId;

							return (
								<div
									key={frame.id}
									style={{
										position: "absolute",
										left: `${frame.x}%`,
										top: `${frame.y}%`,
										width: `${frame.width}%`,
										height: `${frame.height}%`,
										border: isSelected
											? "2px solid #00C853"
											: "1px solid #cbd5e1",
										boxShadow: isSelected
											? "0 4px 16px rgba(0,200,83,0.3)"
											: "0 1px 3px rgba(0,0,0,0.1)",
									}}
									className="group flex flex-col bg-black rounded-xs overflow-visible cursor-move transition-shadow"
									onMouseDown={(e) => startMove(e, frame.id)}
									data-testid={`report-frame-${frame.id}`}
								>
									{/* Above Legend Option */}
									{settings.legendPlacement === "above" && frame.type === "image" && (
										<div className="text-[9px] font-mono text-neutral-700 py-0.5 px-1 truncate bg-white border-b border-neutral-200">
											Ratio: {frame.zoomRatioPercent?.toFixed(2) || "100.00"}% · {frame.dapDoseDgyCm2?.toFixed(3) || "0.024"} dGy*cm²[DAP] · {frame.modalityLabel} · Зуб #{frame.toothFdi} · {frame.capturedAt}
										</div>
									)}

									{/* Frame Content */}
									<div className="flex-1 w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
										{frame.type === "image" ? (
											<img
												src={frame.imageUrl}
												alt="Рентгенограмма"
												className="w-full h-full object-contain pointer-events-none"
												onError={(e) => {
													// Fallback to stylized SVG placeholder if local image missing
													(e.target as HTMLImageElement).src =
														"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23050505'/><text x='50%25' y='50%25' fill='%2322c55e' font-family='sans-serif' font-size='14' text-anchor='middle'>Дентальная радиовизиограмма</text></svg>";
												}}
											/>
										) : (
											<div className="w-full h-full p-2 bg-neutral-50 text-neutral-900 text-xs leading-relaxed font-sans overflow-auto">
												{frame.textContent}
											</div>
										)}
									</div>

									{/* Below Legend (EzDent-i Screenshot 28 default: Ratio %, DAP dose, Modality, Tooth, Date) */}
									{settings.legendPlacement === "below" && frame.type === "image" && (
										<div
											className="text-[9px] font-mono text-neutral-800 bg-white px-1.5 py-1 border-t border-neutral-300 flex items-center justify-between shrink-0"
											data-testid="frame-telemetry-legend"
										>
											<span className="font-semibold">
												Ratio: {frame.zoomRatioPercent?.toFixed(2) || "100.00"}%
											</span>
											<span>
												{frame.dapDoseDgyCm2?.toFixed(3) || "0.024"} dGy*cm² [DAP]
											</span>
											<span className="truncate max-w-[140px]">
												{frame.modalityLabel}
											</span>
											<span className="font-bold text-emerald-800">
												#{frame.toothFdi}
											</span>
											<span className="text-neutral-500">
												{frame.capturedAt}
											</span>
										</div>
									)}

									{/* 8 Resize Handles (Rendered strictly when frame is selected) */}
									{isSelected && (
										<>
											{/* Top-Left */}
											<div
												className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#00C853] border border-white cursor-nw-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "nw")}
												data-testid="resize-handle-nw"
											/>
											{/* Top */}
											<div
												className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00C853] border border-white cursor-n-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "n")}
											/>
											{/* Top-Right */}
											<div
												className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#00C853] border border-white cursor-ne-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "ne")}
											/>
											{/* Right */}
											<div
												className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-[#00C853] border border-white cursor-e-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "e")}
											/>
											{/* Bottom-Right */}
											<div
												className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#00C853] border border-white cursor-se-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "se")}
												data-testid="resize-handle-se"
											/>
											{/* Bottom */}
											<div
												className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00C853] border border-white cursor-s-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "s")}
											/>
											{/* Bottom-Left */}
											<div
												className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#00C853] border border-white cursor-sw-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "sw")}
											/>
											{/* Left */}
											<div
												className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-[#00C853] border border-white cursor-w-resize z-20 shadow-xs"
												onMouseDown={(e) => startResize(e, frame.id, "w")}
											/>
										</>
									)}
								</div>
							);
						})}
					</div>

					{/* Virtual Sheet Footer (Controlled by Print Settings) */}
					{(settings.footer.showClinicName || settings.footer.showPhone || settings.footer.showAddress) && (
						<div className="border-t border-neutral-300 pt-2 mt-3 text-[10px] text-neutral-500 flex items-center justify-between shrink-0">
							<div className="flex gap-3">
								{settings.footer.showClinicName && (
									<span className="font-semibold text-neutral-800">{clinicName}</span>
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
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. BOTTOM FILMSTRIP (EzDent-i Screenshots 27 & 28)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div
				className="bg-zinc-900 border-t border-zinc-800 px-3 py-2 shrink-0 flex flex-col gap-1.5 select-none print:hidden"
				data-testid="radiology-bottom-filmstrip"
			>
				{/* Pagination Controls */}
				<div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
					<button
						type="button"
						className="p-0.5 rounded hover:bg-zinc-800 hover:text-white cursor-pointer"
						title="Предыдущая страница"
					>
						‹
					</button>
					<span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
						1 / 1
					</span>
					<button
						type="button"
						className="p-0.5 rounded hover:bg-zinc-800 hover:text-white cursor-pointer"
						title="Следующая страница"
					>
						›
					</button>
				</div>

				{/* Horizontal Study Strip */}
				<div className="flex items-center gap-3 overflow-x-auto pb-1">
					<button
						type="button"
						onClick={() => handleSelectStudyFromFilmstrip(selectedStudyIndex)}
						className="h-14 px-3 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shrink-0 flex flex-col items-center justify-center gap-1 cursor-pointer"
						title="Поместить снимок в активную рамку отчета"
						data-testid="btn-filmstrip-insert"
					>
						<ImageIcon className="w-4 h-4 text-emerald-400" />
						<span className="text-[10px]">Вставить в макет</span>
					</button>

					<div className="flex items-center gap-2 overflow-x-auto py-0.5">
						{availableStudies.map((study, idx) => {
							const isActive = idx === selectedStudyIndex;
							return (
								<div
									key={study.id}
									onClick={() => handleSelectStudyFromFilmstrip(idx)}
									className={`group relative flex flex-col items-center shrink-0 w-24 h-16 rounded cursor-pointer overflow-hidden transition-all bg-black ${
										isActive
											? "border-2 border-[#00C853] ring-1 ring-[#00C853]"
											: "border border-zinc-700 hover:border-zinc-500 opacity-80 hover:opacity-100"
									}`}
									title={`Зуб #${study.toothFdi} · ${study.capturedAt}`}
									data-testid={`filmstrip-thumb-${idx}`}
								>
									<img
										src={study.imageUrl}
										alt={`Зуб #${study.toothFdi}`}
										className="w-full h-full object-cover pointer-events-none"
										onError={(e) => {
											(e.target as HTMLImageElement).src =
												"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='70' viewBox='0 0 100 70'><rect width='100' height='70' fill='%23111'/><text x='50%25' y='50%25' fill='%2322c55e' font-family='sans-serif' font-size='10' text-anchor='middle'>RVG #16</text></svg>";
										}}
									/>
									<div className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-mono text-zinc-300 px-1 py-0.5 truncate text-center border-t border-zinc-800/60">
										{study.capturedAt}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    4. PRINT SETTINGS DIALOG (EzDent-i Screenshot 29 Style)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isSettingsOpen && (
				<div
					className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
					data-testid="print-settings-modal"
				>
					<div className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
						<div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/60">
							<h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
								НАСТРОЙКИ ПЕЧАТИ
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

							{/* 4. Header Checkboxes (Screenshot 29) */}
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

							{/* 5. Footer Checkboxes (Screenshot 29) */}
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
