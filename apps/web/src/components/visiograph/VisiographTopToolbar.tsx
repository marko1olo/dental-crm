/**
 * VisiographTopToolbar.tsx
 *
 * Strict 1-Row Compact 36px Toolbar for Visiograph & PACS Studio (Mandates 8d, 8e, 8n):
 * 1. Filter Presets: .secondary-button — «Канал», «Кость», «Эмаль», «Инверсия»
 * 2. Primary Tools: .icon-button (32x32px) — «Линейка», «Угол», «Лупа», «Поворот»
 * 3. Dominant Emerald CTA: .primary-button — «Прикрепить к визиту»
 * 4. Tooth FDI formula binder: «Привязать к зубу на формуле» (Зуб 16)
 * 5. 0px parasitic horizontal scroll, design tokens var(--teal), var(--paper), var(--ink), var(--line).
 */

import {
	Activity,
	AlertTriangle,
	Check,
	ChevronDown,
	Compass,
	Contrast,
	FileDown,
	Layers,
	MousePointer,
	Printer,
	RotateCcw,
	RotateCw,
	Ruler,
	Scale,
	Sliders,
	Sparkles,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import "./VisiographTopToolbar.css";
import {
	CLINICAL_VISIOGRAPH_FILTERS,
	type ClinicalVisiographFilterPreset,
} from "./VisiographWindowPresets";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";
import type { VisiographImageParams } from "./VisiographImageProcessor";
import type { DentalSensorPreset } from "./VisiographMeasurementMath";

export type SensorPresetItem = DentalSensorPreset;

export interface VisiographTopToolbarProps {
	activeTool: ActiveVisiographToolType;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
	onClearDrawing: () => void;
	params: VisiographImageParams;
	setParams: React.Dispatch<React.SetStateAction<VisiographImageParams>>;
	activeClinicalFilter: string | null;
	onApplyClinicalFilter: (filter: ClinicalVisiographFilterPreset) => void;
	canvasZoom: number;
	setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
	setCanvasRotationDeg: React.Dispatch<React.SetStateAction<number>>;
	sensorPresets: readonly SensorPresetItem[];
	activeSensorPresetId: string | null;
	isCalibrated: boolean;
	onApplySensorPreset: (preset: SensorPresetItem) => void;
	onResetAll: () => void;
	onPrintProtocol: () => void;
	onOpenExportModal: () => void;
	onClose?: (() => void) | undefined;
	toothCode?: string | null | undefined;
	onToothChange?: ((tooth: string) => void) | undefined;
	onAttachToVisit?: (() => void) | undefined;
	isAttachedToVisit?: boolean | undefined;
}

export function VisiographTopToolbar({
	activeTool,
	setActiveTool,
	onClearDrawing,
	params,
	setParams,
	activeClinicalFilter,
	onApplyClinicalFilter,
	canvasZoom,
	setCanvasZoom,
	setCanvasRotationDeg,
	sensorPresets,
	activeSensorPresetId,
	isCalibrated,
	onApplySensorPreset,
	onResetAll,
	onPrintProtocol,
	onOpenExportModal,
	onClose,
	toothCode = "16",
	onToothChange,
	onAttachToVisit,
	isAttachedToVisit = false,
}: VisiographTopToolbarProps) {
	const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
	const [isToothMenuOpen, setIsToothMenuOpen] = useState(false);
	const [isSensorMenuOpen, setIsSensorMenuOpen] = useState(false);
	const [isAttachedLocal, setIsAttachedLocal] = useState(false);

	const effectiveTooth = toothCode || "16";
	const isAttached = isAttachedToVisit || isAttachedLocal;

	// Quick 1-click filter preset helper
	const handleSelectFilterPreset = (presetId: "endodontics" | "bone_periodont" | "caries_enamel") => {
		const preset = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === presetId);
		if (preset) {
			onApplyClinicalFilter(preset);
		}
	};

	const handleToggleInvert = () => {
		setParams((prev) => ({ ...prev, invert: !prev.invert }));
	};

	const handleAttachClick = () => {
		if (onAttachToVisit) {
			onAttachToVisit();
		} else {
			onPrintProtocol();
		}
		setIsAttachedLocal(true);
	};

	return (
		<div className="visiograph-top-toolbar" role="toolbar" aria-label="Панель инструментов визиографа">
			{/* CLUSTER 1: 1-Click Clinical Filter Presets (.secondary-button) */}
			<div className="visiograph-toolbar-cluster">
				<button
					type="button"
					className={`secondary-button ${activeClinicalFilter === "endodontics" ? "is-active" : ""}`}
					data-testid="btn-filter-canal"
					onClick={() => handleSelectFilterPreset("endodontics")}
					title="Фильтр корневого канала и апекса (высокая резкость)"
					aria-pressed={activeClinicalFilter === "endodontics"}
				>
					<Activity size={13} aria-hidden="true" />
					<span>Канал</span>
				</button>

				<button
					type="button"
					className={`secondary-button ${activeClinicalFilter === "bone_periodont" ? "is-active" : ""}`}
					data-testid="btn-filter-bone"
					onClick={() => handleSelectFilterPreset("bone_periodont")}
					title="Фильтр кортикальной кости, балок и периодонта"
					aria-pressed={activeClinicalFilter === "bone_periodont"}
				>
					<Layers size={13} aria-hidden="true" />
					<span>Кость</span>
				</button>

				<button
					type="button"
					className={`secondary-button ${activeClinicalFilter === "caries_enamel" ? "is-active" : ""}`}
					data-testid="btn-filter-enamel"
					onClick={() => handleSelectFilterPreset("caries_enamel")}
					title="Контрастирование эмали и пришеечной зоны"
					aria-pressed={activeClinicalFilter === "caries_enamel"}
				>
					<Sparkles size={13} aria-hidden="true" />
					<span>Эмаль</span>
				</button>

				<button
					type="button"
					className={`secondary-button ${params.invert ? "is-active" : ""}`}
					data-testid="btn-tool-invert"
					onClick={handleToggleInvert}
					title="Инверсия (Негатив / Позитив) для выявления микротрещин"
					aria-pressed={Boolean(params.invert)}
				>
					<Contrast size={13} aria-hidden="true" />
					<span>Инверсия</span>
				</button>
			</div>

			<div className="visiograph-toolbar-divider" />

			{/* CLUSTER 2: Chairside Tools (.icon-button, 30x30px) */}
			<div className="visiograph-toolbar-cluster">
				<button
					type="button"
					className={`icon-button ${activeTool === "pointer" ? "is-active" : ""}`}
					data-testid="btn-tool-pointer"
					onClick={() => {
						setActiveTool("pointer");
						onClearDrawing();
					}}
					title="Указатель (Просмотр и навигация)"
					aria-pressed={activeTool === "pointer"}
					aria-label="Указатель"
				>
					<MousePointer size={14} />
				</button>

				<button
					type="button"
					className={`icon-button ${activeTool === "ruler" ? "is-active" : ""}`}
					data-testid="btn-tool-ruler"
					onClick={() => {
						setActiveTool("ruler");
						onClearDrawing();
					}}
					title="Линейка: замер длины канала и расстояний в мм"
					aria-pressed={activeTool === "ruler"}
					aria-label="Линейка в миллиметрах"
				>
					<Ruler size={14} />
				</button>

				<button
					type="button"
					className={`icon-button ${activeTool === "angle" ? "is-active" : ""}`}
					data-testid="btn-tool-angle"
					onClick={() => {
						setActiveTool("angle");
						onClearDrawing();
					}}
					title="Угломер: угол наклона оси корня или имплантата (°)"
					aria-pressed={activeTool === "angle"}
					aria-label="Угломер"
				>
					<Compass size={14} />
				</button>

				<button
					type="button"
					className={`icon-button ${canvasZoom !== 1.0 ? "is-active" : ""}`}
					data-testid="btn-tool-zoom"
					onClick={() => {
						setCanvasZoom((z) => (z >= 2.0 ? 1.0 : Number((z + 0.5).toFixed(1))));
					}}
					title={`Масштаб: ${Math.round(canvasZoom * 100)}% (клик для переключения)`}
					aria-label="Лупа / Масштаб"
				>
					<ZoomIn size={14} />
				</button>

				<button
					type="button"
					className="icon-button"
					data-testid="btn-tool-rotate"
					onClick={() => setCanvasRotationDeg((r) => (r + 90) % 360)}
					title="Повернуть снимок на 90° по часовой стрелке"
					aria-label="Повернуть снимок на 90 градусов"
				>
					<RotateCw size={14} />
				</button>
			</div>

			<div className="visiograph-toolbar-divider" />

			{/* CLUSTER 3: Tooth FDI Formula Binding & Dropdown */}
			<div className="visiograph-toolbar-cluster" style={{ position: "relative" }}>
				<button
					type="button"
					className="visiograph-tooth-badge"
					data-testid="btn-bind-tooth-formula"
					onClick={() => setIsToothMenuOpen((prev) => !prev)}
					title="Привязать снимок к зубу на зубной формуле (FDI 11..48)"
					aria-label="Привязать к зубу на формуле"
				>
					<span>Зуб #{effectiveTooth}</span>
					<ChevronDown size={11} />
				</button>

				{isToothMenuOpen && (
					<div
						className="visiograph-popout-menu"
						style={{ left: 0, width: "220px", padding: "6px" }}
						role="dialog"
						aria-label="Выбор зуба FDI"
					>
						<div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
							Зубная формула (FDI)
						</div>
						{/* Upper Jaw */}
						<div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", marginBottom: "3px" }}>
							{["18", "17", "16", "15", "14", "13", "12", "11"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onToothChange?.(t);
										setIsToothMenuOpen(false);
									}}
									className={`visiograph-popout-item ${effectiveTooth === t ? "is-active" : ""}`}
									style={{ height: "24px", justifyContent: "center", padding: "0", fontSize: "11px", fontWeight: 700 }}
								>
									{t}
								</button>
							))}
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", marginBottom: "6px" }}>
							{["21", "22", "23", "24", "25", "26", "27", "28"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onToothChange?.(t);
										setIsToothMenuOpen(false);
									}}
									className={`visiograph-popout-item ${effectiveTooth === t ? "is-active" : ""}`}
									style={{ height: "24px", justifyContent: "center", padding: "0", fontSize: "11px", fontWeight: 700 }}
								>
									{t}
								</button>
							))}
						</div>
						{/* Lower Jaw */}
						<div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", marginBottom: "3px" }}>
							{["48", "47", "46", "45", "44", "43", "42", "41"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onToothChange?.(t);
										setIsToothMenuOpen(false);
									}}
									className={`visiograph-popout-item ${effectiveTooth === t ? "is-active" : ""}`}
									style={{ height: "24px", justifyContent: "center", padding: "0", fontSize: "11px", fontWeight: 700 }}
								>
									{t}
								</button>
							))}
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px" }}>
							{["31", "32", "33", "34", "35", "36", "37", "38"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										onToothChange?.(t);
										setIsToothMenuOpen(false);
									}}
									className={`visiograph-popout-item ${effectiveTooth === t ? "is-active" : ""}`}
									style={{ height: "24px", justifyContent: "center", padding: "0", fontSize: "11px", fontWeight: 700 }}
								>
									{t}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* CLUSTER 4: Secondary Tools Dropdown & Dominant Emerald CTA */}
			<div className="visiograph-toolbar-cluster">
				{/* Secondary tools dropdown */}
				<div style={{ position: "relative" }}>
					<button
						type="button"
						className="secondary-button"
						data-testid="btn-tools-dropdown"
						onClick={() => setIsToolsMenuOpen((prev) => !prev)}
						title="Дополнительные инструменты анализа"
					>
						<Sliders size={13} />
						<span>Ещё ▾</span>
					</button>

					{isToolsMenuOpen && (
						<div
							className="visiograph-popout-menu"
							style={{ right: 0, minWidth: "220px" }}
							role="menu"
						>
							<button
								type="button"
								className="visiograph-popout-item"
								data-testid="btn-tool-apex"
								onClick={() => {
									setActiveTool("root_canal");
									onClearDrawing();
									setIsToolsMenuOpen(false);
								}}
							>
								<Activity size={14} className="text-emerald-500" />
								<span>Эндо-линейка (Апекс WL)</span>
							</button>

							<button
								type="button"
								className="visiograph-popout-item"
								data-testid="btn-tool-lesion"
								onClick={() => {
									setActiveTool("lesion");
									onClearDrawing();
									setIsToolsMenuOpen(false);
								}}
							>
								<AlertTriangle size={14} className="text-amber-500" />
								<span>Очаг деструкции (мм²)</span>
							</button>

							<button
								type="button"
								className="visiograph-popout-item"
								data-testid="btn-tool-calibrate"
								onClick={() => {
									setActiveTool("calibrate");
									onClearDrawing();
									setIsToolsMenuOpen(false);
								}}
							>
								<Scale size={14} className="text-teal-500" />
								<span>Калибровка по эталону</span>
							</button>

							<button
								type="button"
								className="visiograph-popout-item"
								data-testid="btn-visiograph-print-protocol"
								onClick={() => {
									onPrintProtocol();
									setIsToolsMenuOpen(false);
								}}
							>
								<Printer size={14} />
								<span>Печать протокола (A4)</span>
							</button>

							<button
								type="button"
								className="visiograph-popout-item"
								data-testid="btn-visiograph-export-modal"
								title="Экспорт снимка (JPEG, PNG, DICOM)"
								onClick={() => {
									onOpenExportModal();
									setIsToolsMenuOpen(false);
								}}
							>
								<FileDown size={14} />
								<span>Экспорт снимка (JPEG, PNG, DICOM)</span>
							</button>

							<div style={{ height: "1px", background: "var(--line)", margin: "2px 0" }} />

							<button
								type="button"
								className="visiograph-popout-item text-rose-400"
								onClick={() => {
									onResetAll();
									setIsToolsMenuOpen(false);
								}}
							>
								<RotateCcw size={14} />
								<span>Сбросить настройки</span>
							</button>
						</div>
					)}
				</div>

				{/* DOMINANT EMERALD CTA: «Прикрепить к визиту» (.primary-button) */}
				<button
					type="button"
					className={`primary-button ${isAttached ? "is-attached" : ""}`}
					data-testid="btn-attach-to-visit"
					onClick={handleAttachClick}
					title="Прикрепить снимок с измерениями к дневному протоколу визита"
				>
					<Check size={14} strokeWidth={2.5} />
					<span>{isAttached ? "В приёме" : "Прикрепить к визиту"}</span>
				</button>

				{onClose && (
					<button
						type="button"
						className="icon-button"
						onClick={onClose}
						title="Закрыть студию"
						aria-label="Закрыть"
					>
						<X size={15} />
					</button>
				)}
			</div>
		</div>
	);
}

export default VisiographTopToolbar;
