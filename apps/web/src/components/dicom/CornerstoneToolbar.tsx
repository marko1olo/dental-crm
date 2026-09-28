import React, { useState } from "react";
import {
	Activity,
	Camera,
	Download,
	Loader2,
	MoreHorizontal,
	Plus,
	Receipt,
	Save,
	X,
} from "lucide-react";
import * as cornerstoneTools from "@cornerstonejs/tools";
import {
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
	type VisiographPresetId,
} from "../visiograph/VisiographWindowPresets";

export interface CornerstoneToolbarProps {
	patientName?: string | undefined;
	studyDate?: string | undefined;
	voxelSpacing?: { readonly x: number; readonly y: number; readonly z: number } | undefined;
	studyInstanceUid?: string | null | undefined;
	activeTool: string;
	setTool: (toolName: string) => void;
	showPanorex: boolean;
	handleGeneratePanorex: () => void;
	activePresetId: VisiographPresetId;
	applyPreset: (presetId: VisiographPresetId) => void;
	isInverted: boolean;
	toggleInvert: () => void;
	blendMode: "mip" | "average";
	setBlendMode: (mode: "mip" | "average") => void;
	isExportingSnapshot: boolean;
	handleExportSnapshotTo043: () => void;
	setShowArchiveUploaderModal: (show: boolean) => void;
	handleDownloadActiveSlice: () => void;
	onSaveMarkup: () => void;
	onClose?: (() => void) | undefined;
	handleAddCbctToFinance?: (() => void) | undefined;
}

export const CornerstoneToolbar: React.FC<CornerstoneToolbarProps> = ({
	patientName,
	studyDate,
	voxelSpacing,
	studyInstanceUid,
	activeTool,
	setTool,
	showPanorex,
	handleGeneratePanorex,
	activePresetId,
	applyPreset,
	isInverted,
	toggleInvert,
	blendMode,
	setBlendMode,
	isExportingSnapshot,
	handleExportSnapshotTo043,
	setShowArchiveUploaderModal,
	handleDownloadActiveSlice,
	onSaveMarkup,
	onClose,
	handleAddCbctToFinance,
}) => {
	const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);

	return (
		<header
			role="toolbar"
			aria-label="Панель инструментов 3D КЛКТ томографа"
			style={{
				height: "36px",
				minHeight: "36px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "8px",
				padding: "0 12px 0 10px",
				backgroundColor: "var(--paper-strong, #121214)",
				borderBottom: "1px solid var(--line-strong, rgba(255,255,255,0.12))",
				zIndex: 20,
				flexShrink: 0,
			}}
		>
			{/* PATIENT INFO */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					minWidth: 0,
					flexShrink: 1,
					maxWidth: "280px",
				}}
			>
				<Activity className="w-3.5 h-3.5 text-teal-400 shrink-0" />
				<div
					className="min-w-0"
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: "6px",
						overflow: "hidden",
						lineHeight: 1.2,
					}}
				>
					<span
						className="truncate min-w-0"
						style={{
							fontSize: "12px",
							fontWeight: 600,
							color: "var(--ink, #fafafa)",
						}}
						title={patientName || "3D КЛКТ исследование"}
					>
						{patientName || "3D КЛКТ"}
					</span>
					{(studyDate || voxelSpacing || studyInstanceUid) && (
						<span
							className="truncate min-w-0 shrink-0"
							style={{
								fontSize: "11px",
								color: "var(--muted, #a1a1aa)",
							}}
							title={
								studyDate
									? `КТ: ${studyDate}${voxelSpacing ? ` (${voxelSpacing.x}x${voxelSpacing.y}x${voxelSpacing.z}мм)` : ""}`
									: studyInstanceUid
										? `UID: ${studyInstanceUid.slice(-8)}`
										: ""
							}
						>
							{studyDate || (studyInstanceUid ? `UID: ${studyInstanceUid.slice(-8)}` : "")}
							{voxelSpacing ? ` • ${voxelSpacing.x}x${voxelSpacing.y}мм` : ""}
						</span>
					)}
				</div>
			</div>

			{/* 1-ROW TOOLBAR */}
			<div
				className="no-scrollbar"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "4px",
					overflowX: "auto",
					scrollbarWidth: "none",
					flexShrink: 0,
				}}
			>
				{/* PLANES & MODES SEGMENT */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						flexShrink: 0,
						gap: "2px",
						backgroundColor: "rgba(0,0,0,0.35)",
						borderRadius: "8px",
						padding: "2px",
					}}
				>
					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 10px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.15s",
							whiteSpace: "nowrap",
							flexShrink: 0,
							backgroundColor:
								activeTool === cornerstoneTools.CrosshairsTool.toolName
									? "var(--brand-primary, #2563eb)"
									: "transparent",
							color:
								activeTool === cornerstoneTools.CrosshairsTool.toolName
									? "#fff"
									: "var(--ink, #d4d4d8)",
						}}
						onClick={() => setTool(cornerstoneTools.CrosshairsTool.toolName)}
						title="Мультипланарная реконструкция: аксиальный, сагиттальный, корональный срезы"
					>
						МПР
					</button>
					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 10px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 500,
							cursor: "pointer",
							border: "none",
							transition: "all 0.15s",
							whiteSpace: "nowrap",
							flexShrink: 0,
							backgroundColor:
								activeTool === cornerstoneTools.SplineROITool.toolName
									? "var(--brand-primary, #2563eb)"
									: "transparent",
							color:
								activeTool === cornerstoneTools.SplineROITool.toolName
									? "#fff"
									: "var(--ink, #d4d4d8)",
						}}
						onClick={() => setTool(cornerstoneTools.SplineROITool.toolName)}
						title="Разметка зубной дуги для развертки панорамы"
					>
						Дуга
					</button>
					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 10px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							border: "none",
							transition: "all 0.15s",
							whiteSpace: "nowrap",
							flexShrink: 0,
							backgroundColor: showPanorex
								? "var(--brand-primary, #2563eb)"
								: "transparent",
							color: showPanorex ? "#fff" : "var(--ink, #d4d4d8)",
						}}
						onClick={handleGeneratePanorex}
						title="Развернуть ортопантомограмму (ОПТГ) по вокселям КТ"
					>
						Панорама
					</button>
				</div>

				<div style={{ width: "1px", height: "16px", backgroundColor: "var(--line-strong, rgba(255,255,255,0.12))", margin: "0 2px" }} />

				{/* HU WINDOWING PRESETS */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						flexShrink: 0,
						gap: "2px",
						backgroundColor: "rgba(0,0,0,0.35)",
						borderRadius: "8px",
						padding: "2px",
					}}
				>
					{VISIOGRAPH_PRESETS_LIST.map((preset) => (
						<button
							key={preset.id}
							type="button"
							style={{
								height: "28px",
								padding: "0 8px",
								borderRadius: "6px",
								fontSize: "11px",
								fontWeight: activePresetId === preset.id ? 600 : 400,
								cursor: "pointer",
								border: "none",
								transition: "all 0.15s",
								whiteSpace: "nowrap",
								flexShrink: 0,
								backgroundColor:
									activePresetId === preset.id
										? "rgba(255,255,255,0.15)"
										: "transparent",
								color:
									activePresetId === preset.id
										? "var(--brand-primary, #60a5fa)"
										: "var(--ink, #d4d4d8)",
							}}
							onClick={() => applyPreset(preset.id)}
							title={`Пресет ${preset.label} (Ш:${preset.windowWidth}, У:${preset.windowCenter})`}
						>
							{preset.label}
						</button>
					))}

					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 7px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: isInverted ? 600 : 400,
							cursor: "pointer",
							border: "none",
							transition: "all 0.15s",
							backgroundColor: isInverted
								? "rgba(255,255,255,0.2)"
								: "transparent",
							color: isInverted
								? "var(--amber-300, #fcd34d)"
								: "var(--ink, #a1a1aa)",
						}}
						onClick={toggleInvert}
						title="Инвертировать яркость (Негатив / Позитив)"
					>
						Инв.
					</button>
				</div>

				<div style={{ width: "1px", height: "16px", backgroundColor: "var(--line-strong, rgba(255,255,255,0.12))", margin: "0 2px" }} />

				{/* NAVIGATION & CAD TOOLS */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "2px",
						flexShrink: 0,
					}}
				>
					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: activeTool === cornerstoneTools.PanTool.toolName ? 600 : 400,
							cursor: "pointer",
							border: "none",
							backgroundColor:
								activeTool === cornerstoneTools.PanTool.toolName
									? "rgba(255,255,255,0.18)"
									: "transparent",
							color:
								activeTool === cornerstoneTools.PanTool.toolName
									? "var(--brand-primary, #60a5fa)"
									: "var(--ink, #d4d4d8)",
						}}
						onClick={() => setTool(cornerstoneTools.PanTool.toolName)}
						title="Панорамирование (Сдвиг среза мышью)"
					>
						Панорама
					</button>
					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: activeTool === cornerstoneTools.ZoomTool.toolName ? 600 : 400,
							cursor: "pointer",
							border: "none",
							backgroundColor:
								activeTool === cornerstoneTools.ZoomTool.toolName
									? "rgba(255,255,255,0.18)"
									: "transparent",
							color:
								activeTool === cornerstoneTools.ZoomTool.toolName
									? "var(--brand-primary, #60a5fa)"
									: "var(--ink, #d4d4d8)",
						}}
						onClick={() => setTool(cornerstoneTools.ZoomTool.toolName)}
						title="Масштабирование (Увеличение / уменьшение)"
					>
						Зум
					</button>
					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: activeTool === cornerstoneTools.LengthTool.toolName ? 600 : 400,
							cursor: "pointer",
							border: "none",
							backgroundColor:
								activeTool === cornerstoneTools.LengthTool.toolName
									? "rgba(255,255,255,0.18)"
									: "transparent",
							color:
								activeTool === cornerstoneTools.LengthTool.toolName
									? "var(--brand-primary, #60a5fa)"
									: "var(--ink, #d4d4d8)",
						}}
						onClick={() => setTool(cornerstoneTools.LengthTool.toolName)}
						title="Калибровочная линейка (Измерение дистанции в мм)"
					>
						Линейка
					</button>
					<button
						type="button"
						style={{
							height: "28px",
							padding: "0 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: activeTool === cornerstoneTools.ProbeTool.toolName ? 600 : 400,
							cursor: "pointer",
							border: "none",
							backgroundColor:
								activeTool === cornerstoneTools.ProbeTool.toolName
									? "rgba(255,255,255,0.18)"
									: "transparent",
							color:
								activeTool === cornerstoneTools.ProbeTool.toolName
									? "var(--brand-primary, #60a5fa)"
									: "var(--ink, #d4d4d8)",
						}}
						onClick={() => setTool(cornerstoneTools.ProbeTool.toolName)}
						title="HU Денситометр (Плотность кости по Хаунсфилду)"
					>
						HU Зонд
					</button>
				</div>

				<div style={{ width: "1px", height: "16px", backgroundColor: "var(--line-strong, rgba(255,255,255,0.12))", margin: "0 2px" }} />

				{/* SECONDARY MENU */}
				<div style={{ position: "relative" }}>
					<button
						type="button"
						style={{
							height: "28px",
							width: "28px",
							borderRadius: "6px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							border: "none",
							backgroundColor: isSecondaryMenuOpen
								? "rgba(255,255,255,0.2)"
								: "transparent",
							color: "var(--ink, #d4d4d8)",
							cursor: "pointer",
						}}
						onClick={() => setIsSecondaryMenuOpen((prev) => !prev)}
						title="Дополнительные функции и экспорт"
					>
						<MoreHorizontal className="w-4 h-4" />
					</button>

					{isSecondaryMenuOpen && (
						<div
							style={{
								position: "absolute",
								top: "34px",
								right: 0,
								zIndex: 50,
								minWidth: "210px",
								backgroundColor: "var(--paper-strong, #18181b)",
								border: "1px solid var(--line-strong, rgba(255,255,255,0.15))",
								borderRadius: "8px",
								boxShadow: "0 10px 25px -5px rgba(0,0,0,0.6)",
								padding: "4px",
								display: "flex",
								flexDirection: "column",
								gap: "2px",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									padding: "4px 10px",
									fontSize: "12px",
									borderBottom: "1px solid rgba(255,255,255,0.08)",
									marginBottom: "2px",
								}}
							>
								<span style={{ color: "var(--muted, #a1a1aa)" }}>Проекция:</span>
								<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
									<button
										type="button"
										onClick={() => setBlendMode("mip")}
										style={{
											padding: "2px 6px",
											fontSize: "11px",
											fontWeight: blendMode === "mip" ? 600 : 400,
											borderRadius: "4px",
											border: "1px solid " + (blendMode === "mip" ? "var(--brand-primary, #06b6d4)" : "rgba(255,255,255,0.15)"),
											backgroundColor: blendMode === "mip" ? "rgba(6,182,212,0.25)" : "transparent",
											color: blendMode === "mip" ? "var(--cyan-400, #22d3ee)" : "var(--muted, #a1a1aa)",
											cursor: "pointer",
										}}
									>
										MIP
									</button>
									<button
										type="button"
										onClick={() => setBlendMode("average")}
										style={{
											padding: "2px 6px",
											fontSize: "11px",
											fontWeight: blendMode === "average" ? 600 : 400,
											borderRadius: "4px",
											border: "1px solid " + (blendMode === "average" ? "var(--brand-primary, #06b6d4)" : "rgba(255,255,255,0.15)"),
											backgroundColor: blendMode === "average" ? "rgba(6,182,212,0.25)" : "transparent",
											color: blendMode === "average" ? "var(--cyan-400, #22d3ee)" : "var(--muted, #a1a1aa)",
											cursor: "pointer",
										}}
									>
										Ср.
									</button>
								</div>
							</div>

							<button
								type="button"
								style={{
									height: "30px",
									padding: "0 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									cursor: isExportingSnapshot ? "wait" : "pointer",
									border: "none",
									textAlign: "left",
									backgroundColor: "transparent",
									color: "var(--emerald-400, #34d399)",
									display: "flex",
									alignItems: "center",
									gap: "6px",
									opacity: isExportingSnapshot ? 0.7 : 1,
								}}
								onClick={() => {
									if (isExportingSnapshot) return;
									setIsSecondaryMenuOpen(false);
									handleExportSnapshotTo043();
								}}
								title="Сохранить текущий 3D MPR срез и протокол в электронную карту 043/у"
							>
								{isExportingSnapshot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
								<span>В карту 043/у</span>
							</button>

							{handleAddCbctToFinance && (
								<button
									type="button"
									style={{
										height: "30px",
										padding: "0 10px",
										borderRadius: "6px",
										fontSize: "12px",
										fontWeight: 500,
										cursor: "pointer",
										border: "none",
										textAlign: "left",
										backgroundColor: "transparent",
										color: "var(--teal-400, #2dd4bf)",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
									onClick={() => {
										setIsSecondaryMenuOpen(false);
										handleAddCbctToFinance();
									}}
									data-testid="cbct-toolbar-add-finance-btn"
									title="В 1 клик добавить услугу КЛКТ (A06.07.012, 3 800 ₽) в финансовый акт визита и план лечения"
								>
									<Receipt className="w-3.5 h-3.5" />
									<span>+ КТ в акт (804н)</span>
								</button>
							)}

							<button
								type="button"
								style={{
									height: "30px",
									padding: "0 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									cursor: "pointer",
									border: "none",
									textAlign: "left",
									backgroundColor: "transparent",
									color: "var(--brand-primary, #60a5fa)",
									display: "flex",
									alignItems: "center",
									gap: "6px",
								}}
								onClick={() => {
									setIsSecondaryMenuOpen(false);
									setShowArchiveUploaderModal(true);
								}}
								title="Загрузить новый DICOM-архив (.zip)"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>Загрузить КЛКТ архив</span>
							</button>

							<button
								type="button"
								style={{
									height: "30px",
									padding: "0 10px",
									borderRadius: "6px",
									fontSize: "12px",
									fontWeight: 500,
									cursor: "pointer",
									border: "none",
									textAlign: "left",
									backgroundColor: "transparent",
									color: "var(--ink, #d4d4d8)",
									display: "flex",
									alignItems: "center",
									gap: "6px",
								}}
								onClick={() => {
									setIsSecondaryMenuOpen(false);
									handleDownloadActiveSlice();
								}}
								title="Скачать снимок на диск"
							>
								<Download className="w-3.5 h-3.5" />
								<span>Скачать срез</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* ACTIONS */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					flexShrink: 0,
				}}
			>
				<button
					type="button"
					data-testid="ct-planning-save"
					style={{
						height: "28px",
						padding: "0 10px",
						borderRadius: "6px",
						fontSize: "12px",
						fontWeight: 600,
						cursor: "pointer",
						border: "1px solid var(--brand-primary, #2563eb)",
						backgroundColor: "var(--brand-primary, #2563eb)",
						color: "var(--ink, #fff)",
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
						whiteSpace: "nowrap",
						transition: "all 0.15s",
					}}
					onClick={onSaveMarkup}
					title="Сохранить векторы разметки в карточку пациента"
				>
					<Save className="w-3.5 h-3.5" />
					<span>Сохранить в план</span>
				</button>

				{onClose && (
					<button
						type="button"
						data-testid="cbct-mpr-close-btn"
						aria-label="Закрыть 3D MPR"
						style={{
							height: "28px",
							width: "28px",
							flexShrink: 0,
							backgroundColor: "rgba(239,68,68,0.15)",
							color: "var(--rose-300, #fca5a5)",
							padding: 0,
							borderRadius: "6px",
							border: "1px solid rgba(239,68,68,0.3)",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							transition: "all 0.15s",
						}}
						onClick={onClose}
						title="Закрыть 3D просмотрщик"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>
		</header>
	);
};
