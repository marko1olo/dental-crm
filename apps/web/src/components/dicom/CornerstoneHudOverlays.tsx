import React, { Suspense, lazy } from "react";
import {
	Ruler,
	ShieldAlert,
	ShieldCheck,
	X,
} from "lucide-react";
import type { ImplantData } from "./cornerstoneTypes";
import type { CtPlanningMarkup } from "./ctPlanningPersistence";
import type { AlveolarRidgeCaliperMeasurement } from "../radiology/radiologyMath";
import type { PanoramicVolumeInput } from "./PanoramicRendererWindow";
import type { Point2D } from "../../utils/math/mprMath";

const PanoramicRendererWindow = lazy(() =>
	import("./PanoramicRendererWindow").then((m) => ({
		default: m.PanoramicRendererWindow,
	})),
);

const DicomArchiveUploader = lazy(() =>
	import("./DicomArchiveUploader").then((m) => ({
		default: m.DicomArchiveUploader,
	})),
);

export interface CornerstoneHudOverlaysProps {
	isNerveTracingActive: boolean;
	activeTool: string;
	restoredMarkup: CtPlanningMarkup | null;
	addNervePointFromCurrentSlice: () => void;
	completeNerveSpline: () => void;
	clearNervePoints: () => void;
	setIsNerveTracingActive: (active: boolean) => void;
	setActiveTool: (tool: string) => void;
	panorexBanner: { tone: "issue" | "ready"; text: string } | null;
	markupStatus: { tone: "saving" | "saved" | "issue"; text: string } | null;
	latestImplant: ImplantData | null;
	activeCaliper: AlveolarRidgeCaliperMeasurement | null;
	isNerveCollisionDanger: boolean;
	isNerveUnmapped: boolean;
	showPanorex: boolean;
	volumeId: string | null;
	panorexVolume: PanoramicVolumeInput | null;
	splinePoints: Point2D[];
	panorexThickness: number;
	blendMode: "mip" | "average";
	patientId?: string | null | undefined;
	authHeaders?: Record<string, string> | undefined;
	setShowPanorex: (show: boolean) => void;
	setPanorexVolume: (v: PanoramicVolumeInput | null) => void;
	setSplinePoints: (pts: Point2D[]) => void;
	setArchSummary: (s: { points: number; lengthMm: number } | null) => void;
	showArchiveUploaderModal: boolean;
	setShowArchiveUploaderModal: (show: boolean) => void;
	setLocalImageIds: (ids: string[]) => void;
}

export const CornerstoneHudOverlays: React.FC<CornerstoneHudOverlaysProps> = ({
	isNerveTracingActive,
	activeTool,
	restoredMarkup,
	addNervePointFromCurrentSlice,
	completeNerveSpline,
	clearNervePoints,
	setIsNerveTracingActive,
	setActiveTool,
	panorexBanner,
	markupStatus,
	latestImplant,
	activeCaliper,
	isNerveCollisionDanger,
	isNerveUnmapped,
	showPanorex,
	volumeId,
	panorexVolume,
	splinePoints,
	panorexThickness,
	blendMode,
	patientId,
	authHeaders,
	setShowPanorex,
	setPanorexVolume,
	setSplinePoints,
	setArchSummary,
	showArchiveUploaderModal,
	setShowArchiveUploaderModal,
	setLocalImageIds,
}) => {
	return (
		<>
			{/* MANDIBULAR NERVE TRACING HUD BAR */}
			{(isNerveTracingActive || activeTool === "NerveTracer") && (
				<div
					role="toolbar"
					aria-label="Панель разметки нижнечелюстного канала"
					style={{
						position: "absolute",
						top: "44px",
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 25,
						display: "flex",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "8px",
						maxWidth: "min(94%, 56rem)",
						backgroundColor: "rgba(18, 18, 18, 0.94)",
						backdropFilter: "blur(16px)",
						WebkitBackdropFilter: "blur(16px)",
						border: "1px solid rgba(217, 119, 6, 0.5)",
						boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.75)",
						padding: "6px 12px",
						borderRadius: "10px",
						color: "var(--ink, #f4f4f5)",
						fontSize: "12px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							flex: "1 1 auto",
							minWidth: "260px",
						}}
					>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								minWidth: "22px",
								height: "22px",
								padding: "0 6px",
								borderRadius: "6px",
								backgroundColor:
									(restoredMarkup?.nervePoints?.length ?? 0) > 0
										? "rgba(16, 185, 129, 0.2)"
										: "rgba(217, 119, 6, 0.2)",
								color:
									(restoredMarkup?.nervePoints?.length ?? 0) > 0
										? "var(--emerald-400, #34d399)"
										: "var(--amber-400, #fbbf24)",
								fontWeight: "bold",
								fontSize: "11px",
							}}
						>
							{restoredMarkup?.nervePoints?.length ?? 0}
						</span>
						<span style={{ fontWeight: 500, lineHeight: 1.3 }}>
							{(restoredMarkup?.nervePoints?.length ?? 0) === 0
								? "Трассировка нижнечелюстного канала: 0 точек. Кликните по КТ-срезу для установки контрольной точки"
								: `Трассировка нижнечелюстного канала: ${restoredMarkup?.nervePoints?.length} ${
										(restoredMarkup?.nervePoints?.length ?? 0) === 1
											? "точка"
											: (restoredMarkup?.nervePoints?.length ?? 0) < 5
												? "точки"
												: "точек"
								  } (коридор безопасности 2.0 мм)`}
						</span>
					</div>

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
							style={{
								height: "28px",
								minHeight: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "1px solid rgba(255,255,255,0.15)",
								backgroundColor: "rgba(255,255,255,0.08)",
								color: "var(--ink-muted, #e4e4e7)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={addNervePointFromCurrentSlice}
							title="Добавить контрольную точку по текущему фокусу среза"
						>
							+ Точка
						</button>

						<button
							type="button"
							style={{
								height: "28px",
								minHeight: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								backgroundColor:
									(restoredMarkup?.nervePoints?.length ?? 0) >= 2
										? "#059669"
										: "rgba(255,255,255,0.06)",
								color:
									(restoredMarkup?.nervePoints?.length ?? 0) >= 2
										? "var(--ink, #fff)"
										: "var(--muted, #71717a)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={completeNerveSpline}
							title="Замкнуть сплайн канала (требуется от 2 точек)"
						>
							Замкнуть сплайн
						</button>

						<button
							type="button"
							style={{
								height: "28px",
								minHeight: "28px",
								padding: "0 10px",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "1px solid rgba(239,68,68,0.3)",
								backgroundColor: "rgba(239,68,68,0.12)",
								color: "var(--rose-300, #fca5a5)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
							onClick={clearNervePoints}
							title="Очистить все точки трассировки канала"
						>
							Очистить
						</button>

						<button
							type="button"
							style={{
								height: "28px",
								minHeight: "28px",
								width: "28px",
								padding: "0",
								borderRadius: "6px",
								fontSize: "12px",
								fontWeight: 500,
								cursor: "pointer",
								border: "none",
								backgroundColor: "rgba(255,255,255,0.06)",
								color: "var(--muted, #a1a1aa)",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							onClick={() => {
								setIsNerveTracingActive(false);
								setActiveTool("Crosshairs");
							}}
							title="Закрыть панель трассировки"
							aria-label="Закрыть панель трассировки"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			)}

			{/* PANOREX REFUSAL / READY BANNER */}
			{panorexBanner && (
				<div
					role={panorexBanner.tone === "issue" ? "alert" : "status"}
					aria-live="polite"
					data-testid="panorex-arch-state"
					className={`absolute left-1/2 ${isNerveTracingActive || activeTool === "NerveTracer" ? "top-28" : "top-12"} z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
						panorexBanner.tone === "issue"
							? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
							: "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
					}`}
				>
					{panorexBanner.text}
				</div>
			)}

			{/* STORAGE STATUS */}
			{markupStatus && (
				<div
					role={markupStatus.tone === "issue" ? "alert" : "status"}
					aria-live="polite"
					data-testid="ct-planning-storage-state"
					className={`absolute left-1/2 ${isNerveTracingActive || activeTool === "NerveTracer" ? "top-44" : "top-28"} z-30 -translate-x-1/2 max-w-[min(92%,34rem)] rounded-2xl border border-[var(--line-strong)] px-4 py-3 text-xs leading-relaxed break-words hyphens-auto sm:text-sm ${
						markupStatus.tone === "issue"
							? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
							: "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
					}`}
				>
					{markupStatus.text}
				</div>
			)}

			{/* FLOATING SAFETY BADGE (INFERIOR ALVEOLAR NERVE & BONE DENSITY & CALIPER) */}
			{(latestImplant || activeCaliper) && (
				<div
					style={{
						position: "absolute",
						bottom: "20px",
						left: "20px",
						zIndex: 25,
						display: "flex",
						flexDirection: "column",
						gap: "6px",
						maxWidth: "360px",
						backgroundColor: "var(--paper-strong, rgba(15,15,15,0.9))",
						backdropFilter: "blur(12px)",
						WebkitBackdropFilter: "blur(12px)",
						borderRadius: "14px",
						padding: "10px 14px",
						border: `1.5px solid ${isNerveCollisionDanger ? "var(--rose-500, #ef4444)" : isNerveUnmapped ? "var(--amber-500, #f59e0b)" : "var(--emerald-500, #10b981)"}`,
						boxShadow: isNerveCollisionDanger
							? "0 0 20px rgba(239,68,68,0.4)"
							: isNerveUnmapped
								? "0 0 15px rgba(245,158,11,0.25)"
								: "0 0 15px rgba(16,185,129,0.2)",
					}}
				>
					{/* Nerve Clearance Badge */}
					{latestImplant && (
						<>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									color: isNerveCollisionDanger
										? "var(--rose-300, #fca5a5)"
										: isNerveUnmapped
											? "var(--amber-300, #fcd34d)"
											: "var(--emerald-300, #6ee7b7)",
									fontSize: "12px",
									fontWeight: "bold",
								}}
							>
								{isNerveCollisionDanger ? (
									<ShieldAlert className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
								) : isNerveUnmapped ? (
									<ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
								) : (
									<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
								)}
								<span>
									{isNerveCollisionDanger && typeof latestImplant.distanceToNerve === "number"
										? `[ОПАСНО] Нижнечелюстной канал ${latestImplant.distanceToNerve.toFixed(1)} мм (< 2.0 мм)!`
										: isNerveUnmapped || typeof latestImplant.distanceToNerve !== "number"
											? "[ВНИМАНИЕ] Нижнечелюстной нерв не размечен"
											: `[НОРМА] Нижнечелюстной канал: ${latestImplant.distanceToNerve.toFixed(1)} мм (норма)`}
								</span>
							</div>

							{/* Bone Density Badge */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "11px",
									color: "var(--ink, #d4d4d8)",
									borderTop: "1px solid var(--line, rgba(255,255,255,0.1))",
									paddingTop: "6px",
								}}
							>
								<span
									style={{
										backgroundColor: "var(--brand-primary, #3b82f6)",
										color: "var(--ink, #fff)",
										padding: "2px 6px",
										borderRadius: "4px",
										fontWeight: "bold",
									}}
								>
									{latestImplant.boneDensity.classification}
								</span>
								<span>
									Кость: {Math.round(latestImplant.boneDensity.averageHU)} HU | Зуб FDI:{" "}
									{latestImplant.fdiCode}
								</span>
							</div>
						</>
					)}

					{/* Caliper Alveolar Ridge Telemetry */}
					{activeCaliper && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								fontSize: "11px",
								color: "var(--ink, #d4d4d8)",
								borderTop: latestImplant ? "1px solid var(--line, rgba(255,255,255,0.1))" : "none",
								paddingTop: latestImplant ? "6px" : 0,
							}}
						>
							<Ruler className="w-3.5 h-3.5 text-teal-400 shrink-0" />
							<span>
								Гребень: H={activeCaliper.heightMm} мм, W={activeCaliper.crestWidthMm} мм ({activeCaliper.implantFeasibility.isAdequate ? "норма" : "дефицит"})
							</span>
						</div>
					)}
				</div>
			)}

			{/* PANOREX RENDERER WINDOW */}
			{showPanorex && volumeId && (
				<Suspense fallback={null}>
					<PanoramicRendererWindow
						volume={panorexVolume}
						splinePoints={splinePoints}
						onClose={() => {
							setShowPanorex(false);
							setPanorexVolume(null);
							setSplinePoints([]);
							setArchSummary(null);
						}}
						thickness={panorexThickness}
						blendMode={blendMode}
						patientId={patientId}
						authHeaders={authHeaders}
					/>
				</Suspense>
			)}

			{/* MODAL: LOCAL ARCHIVE / FOLDER INTAKE (MANUAL TRIGGER FROM MENU) */}
			{showArchiveUploaderModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowArchiveUploaderModal(false);
					}}
				>
					<div
						style={{
							backgroundColor: "var(--paper-strong, #18181b)",
							border: "1px solid var(--line-strong, rgba(255,255,255,0.2))",
							borderRadius: "16px",
							padding: "24px",
							maxWidth: "560px",
							width: "100%",
							position: "relative",
						}}
					>
						<button
							type="button"
							style={{
								position: "absolute",
								top: "16px",
								right: "16px",
								backgroundColor: "transparent",
								border: "none",
								color: "var(--muted, #a1a1aa)",
								cursor: "pointer",
							}}
							onClick={() => setShowArchiveUploaderModal(false)}
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
						<h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
							Загрузка КТ/КЛКТ исследования
						</h3>
						<p style={{ fontSize: "12px", color: "var(--muted, #a1a1aa)", marginBottom: "16px" }}>
							Выберите папку со срезами томографии или ZIP-архив DICOM (.zip) для построения воксельного объема.
						</p>
						<Suspense fallback={null}>
							<DicomArchiveUploader
								onImagesLoaded={(ids) => {
									setLocalImageIds(ids);
									setShowArchiveUploaderModal(false);
								}}
							/>
						</Suspense>
					</div>
				</div>
			)}
		</>
	);
};
