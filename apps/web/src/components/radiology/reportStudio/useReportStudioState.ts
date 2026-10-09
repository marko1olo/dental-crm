/**
 * DENTE CRM — Radiology Report Studio State & Controller Hook (Layer 3)
 * Manages layout presets, sheet frames, drag/resize math, print settings and hotkeys.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	DEFAULT_PRINT_SETTINGS,
	type DragState,
	type PatientStudyThumbnail,
	type RadiologyReportLayoutPreset,
	type RadiologyReportStudioModalProps,
	type ReportFrameItem,
	type ReportPrintSettings,
} from "./types";

export function useReportStudioState({
	isOpen,
	onClose,
	initialImages = [],
}: Pick<RadiologyReportStudioModalProps, "isOpen" | "onClose" | "initialImages">) {
	// Print & Page Settings
	const [settings, setSettings] = useState<ReportPrintSettings>(DEFAULT_PRINT_SETTINGS);
	const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
	const [viewZoom, setViewZoom] = useState<number>(100);
	const [activeLayout, setActiveLayout] = useState<RadiologyReportLayoutPreset>("two_vertical");

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
	const availableStudies: PatientStudyThumbnail[] =
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

	const handleSelectStudyFromFilmstrip = useCallback((index: number) => {
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
	}, [availableStudies, selectedFrameId]);

	// Dragging & Resizing State
	const sheetRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<DragState | null>(null);

	// Apply Pre-configured Template Layouts
	const handleApplyLayout = useCallback((type: RadiologyReportLayoutPreset) => {
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
	}, [availableStudies]);

	const handleAddImageFrame = useCallback(() => {
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
	}, []);

	const handleAddTextFrame = useCallback(() => {
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
	}, []);

	const handleDeleteSelected = useCallback(() => {
		if (!selectedFrameId) return;
		setFrames((prev) => prev.filter((f) => f.id !== selectedFrameId));
		setSelectedFrameId(null);
	}, [selectedFrameId]);

	const handleResetFrames = useCallback(() => {
		handleApplyLayout("two_vertical");
	}, [handleApplyLayout]);

	// Mouse Drag & Resize Handlers
	const startMove = useCallback((e: React.MouseEvent, frameId: string) => {
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
	}, [frames]);

	const startResize = useCallback((e: React.MouseEvent, frameId: string, handle: string) => {
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
	}, [frames]);

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

	const handleExportPdf = useCallback(() => {
		showToast('Отправка на печать: выберите "Сохранить как PDF" в системном диалоге', "info");
		window.print();
	}, []);

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

	return {
		settings,
		setSettings,
		isSettingsOpen,
		setIsSettingsOpen,
		viewZoom,
		setViewZoom,
		activeLayout,
		conclusionText,
		setConclusionText,
		frames,
		selectedFrameId,
		setSelectedFrameId,
		availableStudies,
		selectedStudyIndex,
		setSelectedStudyIndex,
		sheetRef,
		handleSelectStudyFromFilmstrip,
		handleApplyLayout,
		handleAddImageFrame,
		handleAddTextFrame,
		handleDeleteSelected,
		handleResetFrames,
		startMove,
		startResize,
		handleMouseMove,
		handleMouseUp,
		handlePrint,
		handleExportPdf,
	};
}
