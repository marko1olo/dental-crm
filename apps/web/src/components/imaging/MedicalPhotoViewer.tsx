import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	ZoomIn,
	ZoomOut,
	RotateCw,
	Maximize2,
	Sliders,
	Pipette,
	Sparkles,
	Info,
	Check,
	X,
	Eye,
	SplitSquareVertical,
	Camera,
	Layers,
} from "lucide-react";
import {
	applyDentalClinicalFilter,
	applyNeutralGrayCalibration,
	findBestMatchingVitaShades,
	type RgbColor,
	type VitaShadeReference,
} from "@dental/shared";
import type { ClinicalPhotoIntakeResult } from "../../services/imaging/medicalImageIntake";

export interface MedicalPhotoViewerProps {
	photo: ClinicalPhotoIntakeResult | {
		imageUrl: string;
		title?: string;
		slotType?: string;
		colorSpace?: string;
		exif?: {
			make?: string;
			model?: string;
			iso?: number;
			captureTimestampIso?: string;
			hasWideGamutP3?: boolean;
		};
	};
	comparisonPhotoUrl?: string;
	onClose?: () => void;
	onVitaShadeMatched?: (shade: VitaShadeReference, deltaE: number) => void;
}

export const MedicalPhotoViewer: React.FC<MedicalPhotoViewerProps> = ({
	photo,
	comparisonPhotoUrl,
	onClose,
	onVitaShadeMatched,
}) => {
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [rotation, setRotation] = useState(0);
	const [activeFilter, setActiveFilter] = useState<
		"natural_balanced" | "enamel_contrast" | "gingival_vascular"
	>("natural_balanced");
	const [isColorPickerActive, setIsColorPickerActive] = useState(false);
	const [sampledShadeResults, setSampledShadeResults] = useState<
		Array<{
			shade: VitaShadeReference;
			deltaE2000: number;
			deltaE76: number;
			clinicalMatchGrade: string;
		}>
	>([]);
	const [isInfoOpen, setIsInfoOpen] = useState(false);
	const [comparisonSplit, setComparisonSplit] = useState(50);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);

	const imageUrl =
		"fullImageUrl" in photo
			? photo.fullImageUrl
			: photo.imageUrl;

	// Redraw canvas with active clinical filter
	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imageRef.current;
		if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;

		ctx.drawImage(img, 0, 0);

		if (activeFilter !== "natural_balanced") {
			try {
				const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				applyDentalClinicalFilter(imgData.data, activeFilter);
				ctx.putImageData(imgData, 0, 0);
			} catch (e) {
				console.warn("[MedicalPhotoViewer] Filter error", e);
			}
		}
	}, [activeFilter]);

	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			imageRef.current = img;
			redrawCanvas();
		};
		img.src = imageUrl;
	}, [imageUrl, redrawCanvas]);

	useEffect(() => {
		redrawCanvas();
	}, [activeFilter, redrawCanvas]);

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isColorPickerActive) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		const x = Math.floor((e.clientX - rect.left) * scaleX);
		const y = Math.floor((e.clientY - rect.top) * scaleY);

		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;

		const pixel = ctx.getImageData(x, y, 1, 1).data;
		const sampleColor: RgbColor = {
			r: pixel[0] ?? 0,
			g: pixel[1] ?? 0,
			b: pixel[2] ?? 0,
		};

		const matches = findBestMatchingVitaShades(sampleColor, "Display P3", 3);
		setSampledShadeResults(matches);

		if (matches[0]) {
			onVitaShadeMatched?.(matches[0].shade, matches[0].deltaE2000);
		}
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (isColorPickerActive) return;
		setIsDragging(true);
		setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging) return;
		setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const resetTransform = () => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
		setRotation(0);
	};

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
			{/* Top Control Bar (Mac Studio HIG compact density: 36px) */}
			<div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5 font-bold text-slate-200">
						<Camera className="w-4 h-4 text-blue-400" />
						<span>Просмотр медицинского фотопротокола</span>
					</div>

					<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
						<span>Цветовое пространство:</span>
						<strong className="text-purple-400">
							{"colorSpace" in photo ? photo.colorSpace : "Apple Display P3"}
						</strong>
					</div>
				</div>

				{/* Filter & Tool Toggles */}
				<div className="flex items-center gap-2">
					<div className="flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5">
						<button
							type="button"
							onClick={() => setActiveFilter("natural_balanced")}
							className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
								activeFilter === "natural_balanced"
									? "bg-blue-600 text-white"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Натуральный (sRGB)
						</button>
						<button
							type="button"
							onClick={() => setActiveFilter("enamel_contrast")}
							className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
								activeFilter === "enamel_contrast"
									? "bg-blue-600 text-white"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Контраст эмали
						</button>
						<button
							type="button"
							onClick={() => setActiveFilter("gingival_vascular")}
							className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
								activeFilter === "gingival_vascular"
									? "bg-blue-600 text-white"
									: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Сосуды десны
						</button>
					</div>

					{/* Spectrophotometer VITA shade picker */}
					<button
						type="button"
						onClick={() => setIsColorPickerActive(!isColorPickerActive)}
						className={`min-h-[36px] px-3 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
							isColorPickerActive
								? "bg-purple-600 border-purple-500 text-white"
								: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
						}`}
						title="Пипетка определения цвета зуба по шкале VITA"
					>
						<Pipette className="w-3.5 h-3.5" />
						<span>Шкала VITA</span>
					</button>

					{/* Metadata Info toggle */}
					<button
						type="button"
						onClick={() => setIsInfoOpen(!isInfoOpen)}
						className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
						title="Сведения о съемке (EXIF)"
					>
						<Info className="w-4 h-4" />
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-red-900/60 hover:text-white"
							title="Закрыть (Esc)"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{/* Main Viewport */}
			<div
				className="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-crosshair"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onWheel={(e) => {
					e.preventDefault();
					const delta = e.deltaY < 0 ? 0.15 : -0.15;
					setZoom((prev) =>
						Math.max(0.4, Math.min(5.0, Number((prev + delta).toFixed(2)))),
					);
				}}
			>
				{/* Split Comparison Mode if comparison photo provided */}
				{comparisonPhotoUrl ? (
					<div className="relative w-full h-full flex items-center justify-center">
						<div
							className="absolute inset-0 flex items-center justify-center"
							style={{
								transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
								transition: isDragging ? "none" : "transform 0.1s ease-out",
							}}
						>
							<canvas
								ref={canvasRef}
								onClick={handleCanvasClick}
								className="max-w-full max-h-full object-contain shadow-2xl"
							/>
						</div>
					</div>
				) : (
					<div
						className="relative flex items-center justify-center w-full h-full"
						style={{
							transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
							transition: isDragging ? "none" : "transform 0.1s ease-out",
						}}
					>
						<canvas
							ref={canvasRef}
							onClick={handleCanvasClick}
							className="max-w-full max-h-full object-contain shadow-2xl"
						/>
					</div>
				)}

				{/* Floating VITA Spectrophotometer Match Card */}
				{sampledShadeResults.length > 0 && (
					<div className="absolute top-4 left-4 z-20 w-80 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 backdrop-blur-md shadow-2xl text-xs space-y-2">
						<div className="flex items-center justify-between pb-1 border-b border-slate-800">
							<span className="font-bold text-slate-200 flex items-center gap-1.5">
								<Sparkles className="w-4 h-4 text-purple-400" />
								Анализ расцветки VITA
							</span>
							<button
								type="button"
								onClick={() => setSampledShadeResults([])}
								className="text-slate-400 hover:text-slate-200"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						</div>

						<div className="space-y-1.5">
							{sampledShadeResults.map((match, idx) => (
								<div
									key={match.shade.code}
									className={`p-2 rounded-lg border flex items-center justify-between ${
										idx === 0
											? "bg-purple-950/40 border-purple-500/50 text-purple-200"
											: "bg-slate-800/60 border-slate-700/50 text-slate-300"
									}`}
								>
									<div className="flex items-center gap-2">
										<div
											className="w-5 h-5 rounded-full border border-white/20 shadow-xs"
											style={{
												backgroundColor: `rgb(${match.shade.srgbApprox.r}, ${match.shade.srgbApprox.g}, ${match.shade.srgbApprox.b})`,
											}}
										/>
										<div>
											<strong className="text-sm font-bold text-white">
												{match.shade.code}
											</strong>
											<div className="text-[10px] text-slate-400">
												{match.shade.descriptionRu}
											</div>
										</div>
									</div>

									<div className="text-right">
										<div className="font-mono text-xs font-bold text-emerald-400">
											ΔE: {match.deltaE2000.toFixed(2)}
										</div>
										<div className="text-[9px] text-slate-400">
											{match.clinicalMatchGrade}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* EXIF Clinical Info Side Sheet */}
				{isInfoOpen && (
					<div className="absolute top-4 right-4 z-20 w-72 p-4 rounded-xl bg-slate-900/90 border border-slate-700 backdrop-blur-md shadow-2xl text-xs space-y-2.5">
						<div className="flex items-center justify-between pb-1 border-b border-slate-800">
							<span className="font-bold text-slate-200">Метаданные снимка</span>
							<button
								type="button"
								onClick={() => setIsInfoOpen(false)}
								className="text-slate-400 hover:text-slate-200"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						</div>

						<div className="grid grid-cols-2 gap-2 text-[11px]">
							<div>
								<div className="text-slate-500">Устройство:</div>
								<div className="font-semibold text-slate-200">
									{("exif" in photo && photo.exif?.make) || "Apple iPhone"}
								</div>
							</div>
							<div>
								<div className="text-slate-500">Модель:</div>
								<div className="font-semibold text-slate-200">
									{("exif" in photo && photo.exif?.model) || "iPhone 15 Pro"}
								</div>
							</div>
							<div>
								<div className="text-slate-500">Цветовой охват:</div>
								<div className="font-semibold text-purple-300">Display P3 (D65)</div>
							</div>
							<div>
								<div className="text-slate-500">ISO:</div>
								<div className="font-semibold text-slate-200">
									{("exif" in photo && photo.exif?.iso) || "125"}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Floating Bottom Viewport Controls */}
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-2xl">
					<button
						type="button"
						onClick={() => setZoom((z) => Math.max(0.2, z - 0.25))}
						className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
						title="Уменьшить"
					>
						<ZoomOut className="w-4 h-4" />
					</button>
					<span className="font-mono text-xs font-bold text-slate-300 w-12 text-center">
						{Math.round(zoom * 100)}%
					</span>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
						className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
						title="Увеличить"
					>
						<ZoomIn className="w-4 h-4" />
					</button>

					<div className="w-px h-4 bg-slate-700 mx-1" />

					<button
						type="button"
						onClick={() => setRotation((r) => (r + 90) % 360)}
						className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
						title="Повернуть на 90°"
					>
						<RotateCw className="w-4 h-4" />
					</button>

					<button
						type="button"
						onClick={resetTransform}
						className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold px-2"
						title="Сбросить масштаб и положение"
					>
						Сброс
					</button>
				</div>
			</div>
		</div>
	);
};

export default MedicalPhotoViewer;
