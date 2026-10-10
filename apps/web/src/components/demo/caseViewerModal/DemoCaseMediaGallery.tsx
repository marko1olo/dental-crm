/**
 * @file DemoCaseMediaGallery.tsx
 * @description Галерея До/После: КТ срезы со сплиттером, фотопротокол, радиовизиограммы и 3D STL сканы.
 * Layer 4: Презентационный компонент мультимедиа (МАНДАТ 8y, МАНДАТ 8n).
 */

import React, { useState } from "react";
import {
	Camera,
	Columns,
	Eye,
	Layers,
	Maximize2,
	Sliders,
	Split,
	ZoomIn,
} from "lucide-react";
import type { DemoCaseMediaItem } from "./types.js";

export interface DemoCaseMediaGalleryProps {
	readonly media: DemoCaseMediaItem[];
}

export const DemoCaseMediaGallery: React.FC<DemoCaseMediaGalleryProps> = ({ media }) => {
	const [activeMediaId, setActiveMediaId] = useState<string>(media[0]?.id || "");
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const [currentSlice, setCurrentSlice] = useState<number>(32);
	const [viewMode, setViewMode] = useState<"split" | "side" | "toggle">("split");
	const [showAfterOnly, setShowAfterOnly] = useState<boolean>(false);
	const [contrastWindow, setContrastWindow] = useState<"bone" | "soft" | "implant">("bone");

	const activeItem = media.find((m) => m.id === activeMediaId) || media[0];

	if (!activeItem) {
		return (
			<div
				data-testid="demo-media-gallery"
				style={{
					padding: "24px",
					textAlign: "center",
					color: "var(--muted, #64748b)",
				}}
			>
				Медиа-материалы для данного кейса отсутствуют.
			</div>
		);
	}

	return (
		<div
			data-testid="demo-media-gallery"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			{/* Переключатель вкладок медиа-файлов кейса */}
			<div
				style={{
					display: "flex",
					gap: "8px",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
					{media.map((item) => {
						const isSelected = item.id === activeItem.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => {
									setActiveMediaId(item.id);
									if (item.currentSlice) {
										setCurrentSlice(item.currentSlice);
									}
								}}
								style={{
									padding: "6px 12px",
									borderRadius: "8px",
									fontSize: "12px",
									fontWeight: 600,
									border: isSelected
										? "1px solid var(--brand-accent, #6366f1)"
										: "1px solid var(--line, #e2e8f0)",
									background: isSelected
										? "var(--brand-accent-bg, rgba(99, 102, 241, 0.1))"
										: "var(--paper, #f8fafc)",
									color: isSelected ? "var(--brand-accent, #6366f1)" : "var(--ink, #0f172a)",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									transition: "all 0.15s ease",
								}}
							>
								{item.type === "ct_slice" && <Layers size={14} />}
								{item.type === "photo_before_after" && <Camera size={14} />}
								{item.type === "xray_visio" && <Eye size={14} />}
								{item.type === "stl_3d" && <Maximize2 size={14} />}
								{item.title}
							</button>
						);
					})}
				</div>

				{/* Панель режимов сравнения */}
				<div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => setViewMode("split")}
						title="Сплит-шторка"
						style={{
							padding: "4px 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: 600,
							border: "1px solid var(--line, #e2e8f0)",
							background: viewMode === "split" ? "var(--teal-soft, rgba(13, 148, 136, 0.15))" : "transparent",
							color: viewMode === "split" ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Split size={13} /> Сплит
					</button>

					<button
						type="button"
						onClick={() => setViewMode("side")}
						title="Бок о бок"
						style={{
							padding: "4px 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: 600,
							border: "1px solid var(--line, #e2e8f0)",
							background: viewMode === "side" ? "var(--teal-soft, rgba(13, 148, 136, 0.15))" : "transparent",
							color: viewMode === "side" ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Columns size={13} /> Бок о бок
					</button>

					<button
						type="button"
						onClick={() => {
							setViewMode("toggle");
							setShowAfterOnly(!showAfterOnly);
						}}
						title="Переключение До / После"
						style={{
							padding: "4px 8px",
							borderRadius: "6px",
							fontSize: "11px",
							fontWeight: 600,
							border: "1px solid var(--line, #e2e8f0)",
							background: viewMode === "toggle" ? "var(--teal-soft, rgba(13, 148, 136, 0.15))" : "transparent",
							color: viewMode === "toggle" ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
							cursor: "pointer",
						}}
					>
						{showAfterOnly ? "После ✓" : "До"}
					</button>
				</div>
			</div>

			{/* Интерактивный экран сравнения */}
			<div
				data-testid="demo-photo-compare"
				style={{
					background: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "10px",
					padding: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				{/* Режим 1: Сплит-шторка со слайдером */}
				{viewMode === "split" && (
					<div data-testid="demo-ct-split">
						<div
							style={{
								position: "relative",
								height: "260px",
								borderRadius: "8px",
								overflow: "hidden",
								background: "#0f172a",
								color: "#ffffff",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{/* Левая сторона (До) */}
							<div
								style={{
									position: "absolute",
									inset: 0,
									width: `${splitPercent}%`,
									overflow: "hidden",
									borderRight: "2px solid #38bdf8",
									background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
									padding: "16px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
									boxSizing: "border-box",
									zIndex: 1,
								}}
							>
								<div
									style={{
										background: "rgba(239, 68, 68, 0.2)",
										border: "1px solid #ef4444",
										color: "#fca5a5",
										padding: "3px 8px",
										borderRadius: "4px",
										fontSize: "11px",
										fontWeight: 700,
										alignSelf: "flex-start",
									}}
								>
									ДО: {activeItem.beforeLabel}
								</div>
								<div style={{ fontSize: "12px", color: "#94a3b8" }}>
									{activeItem.beforeDesc}
								</div>
							</div>

							{/* Правая сторона (После) */}
							<div
								style={{
									position: "absolute",
									inset: 0,
									background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
									padding: "16px",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
									boxSizing: "border-box",
									paddingLeft: `calc(${splitPercent}% + 16px)`,
								}}
							>
								<div
									style={{
										background: "rgba(16, 185, 129, 0.2)",
										border: "1px solid #10b981",
										color: "#6ee7b7",
										padding: "3px 8px",
										borderRadius: "4px",
										fontSize: "11px",
										fontWeight: 700,
										alignSelf: "flex-start",
									}}
								>
									ПОСЛЕ: {activeItem.afterLabel}
								</div>
								<div style={{ fontSize: "12px", color: "#a7f3d0" }}>
									{activeItem.afterDesc}
								</div>
							</div>

							{/* Интерактивная разделительная метка */}
							<div
								style={{
									position: "absolute",
									left: `${splitPercent}%`,
									top: "50%",
									transform: "translate(-50%, -50%)",
									width: "28px",
									height: "28px",
									borderRadius: "50%",
									background: "#38bdf8",
									color: "#0f172a",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									zIndex: 10,
									boxShadow: "0 0 12px rgba(56, 189, 248, 0.6)",
									pointerEvents: "none",
								}}
							>
								<Split size={14} />
							</div>
						</div>

						{/* Слайдер сплиттера */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								marginTop: "10px",
							}}
						>
							<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
								До (0%)
							</span>
							<input
								type="range"
								min="5"
								max="95"
								value={splitPercent}
								onChange={(e) => setSplitPercent(Number(e.target.value))}
								style={{
									flex: 1,
									accentColor: "var(--brand-accent, #6366f1)",
									cursor: "pointer",
								}}
							/>
							<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
								После (100%)
							</span>
						</div>
					</div>
				)}

				{/* Режим 2: Бок о бок (Side by side) */}
				{viewMode === "side" && (
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "12px",
						}}
					>
						<div
							style={{
								padding: "16px",
								borderRadius: "8px",
								background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
								color: "#ffffff",
								display: "flex",
								flexDirection: "column",
								gap: "10px",
								minHeight: "180px",
							}}
						>
							<div
								style={{
									background: "rgba(239, 68, 68, 0.2)",
									border: "1px solid #ef4444",
									color: "#fca5a5",
									padding: "2px 8px",
									borderRadius: "4px",
									fontSize: "11px",
									fontWeight: 700,
									alignSelf: "flex-start",
								}}
							>
								ДО: {activeItem.beforeLabel}
							</div>
							<div style={{ fontSize: "12px", color: "#94a3b8" }}>
								{activeItem.beforeDesc}
							</div>
						</div>

						<div
							style={{
								padding: "16px",
								borderRadius: "8px",
								background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
								color: "#ffffff",
								display: "flex",
								flexDirection: "column",
								gap: "10px",
								minHeight: "180px",
							}}
						>
							<div
								style={{
									background: "rgba(16, 185, 129, 0.2)",
									border: "1px solid #10b981",
									color: "#6ee7b7",
									padding: "2px 8px",
									borderRadius: "4px",
									fontSize: "11px",
									fontWeight: 700,
									alignSelf: "flex-start",
								}}
							>
								ПОСЛЕ: {activeItem.afterLabel}
							</div>
							<div style={{ fontSize: "12px", color: "#a7f3d0" }}>
								{activeItem.afterDesc}
							</div>
						</div>
					</div>
				)}

				{/* Режим 3: Быстрое переключение До / После */}
				{viewMode === "toggle" && (
					<div
						style={{
							padding: "20px",
							borderRadius: "8px",
							background: showAfterOnly
								? "linear-gradient(135deg, #064e3b 0%, #022c22 100%)"
								: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
							color: "#ffffff",
							minHeight: "180px",
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-between",
						}}
					>
						<div
							style={{
								background: showAfterOnly
									? "rgba(16, 185, 129, 0.2)"
									: "rgba(239, 68, 68, 0.2)",
								border: `1px solid ${showAfterOnly ? "#10b981" : "#ef4444"}`,
								color: showAfterOnly ? "#6ee7b7" : "#fca5a5",
								padding: "4px 10px",
								borderRadius: "4px",
								fontSize: "12px",
								fontWeight: 700,
								alignSelf: "flex-start",
							}}
						>
							{showAfterOnly ? `ПОСЛЕ: ${activeItem.afterLabel}` : `ДО: ${activeItem.beforeLabel}`}
						</div>
						<div style={{ fontSize: "13px", marginTop: "12px" }}>
							{showAfterOnly ? activeItem.afterDesc : activeItem.beforeDesc}
						</div>
					</div>
				)}

				{/* Контролы КТ срезов (если КЛКТ) */}
				{activeItem.type === "ct_slice" && (
					<div
						data-testid="demo-slice-slider"
						style={{
							padding: "10px 14px",
							background: "var(--paper, #f8fafc)",
							borderRadius: "8px",
							border: "1px solid var(--line, #e2e8f0)",
							display: "flex",
							flexDirection: "column",
							gap: "8px",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								fontSize: "12px",
							}}
						>
							<span style={{ fontWeight: 600 }}>
								КЛКТ навигация: Срез {currentSlice} из {activeItem.totalSlices || 64}
							</span>
							<div style={{ display: "flex", gap: "6px" }}>
								<span
									style={{
										fontSize: "11px",
										background: "rgba(13, 148, 136, 0.1)",
										color: "var(--teal, #0d9488)",
										padding: "2px 6px",
										borderRadius: "4px",
										fontWeight: 600,
									}}
								>
									Плотность: {activeItem.boneDensityHounsfield || 720} HU
								</span>
								<span
									style={{
										fontSize: "11px",
										background: "var(--line-subtle, #f1f5f9)",
										color: "var(--muted, #64748b)",
										padding: "2px 6px",
										borderRadius: "4px",
									}}
								>
									{activeItem.scanResolution || "0.15 мм"}
								</span>
							</div>
						</div>

						<input
							type="range"
							min="1"
							max={activeItem.totalSlices || 64}
							value={currentSlice}
							onChange={(e) => setCurrentSlice(Number(e.target.value))}
							style={{
								width: "100%",
								accentColor: "var(--teal, #0d9488)",
								cursor: "pointer",
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
