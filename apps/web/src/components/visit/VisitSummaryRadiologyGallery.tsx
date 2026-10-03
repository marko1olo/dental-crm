import type React from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Scan,
	X,
	ZoomIn,
} from "lucide-react";

export interface RadiologySnapshotItem {
	id?: string | undefined;
	imageDataUri: string;
	thumbnailDataUri?: string | null | undefined;
	title?: string | null | undefined;
	kind?: string | null | undefined;
	toothCode?: string | null | undefined;
	capturedAt?: string | null | undefined;
	exposureTimeSec?: number | null | undefined;
	exposureParameters?:
		| {
				exposureTimeSec?: number | null | undefined;
				mAs?: number | null | undefined;
				kVp?: number | null | undefined;
				sensorType?: string | null | undefined;
		  }
		| null
		| undefined;
	radiologicalFinding?: string | null | undefined;
	protocolText?: string | null | undefined;
	boneDensity?:
		| {
				classification: string;
				averageHU: number;
		  }
		| null
		| undefined;
	nerveDistanceMm?: number | null | undefined;
	clinicalNote?: string | null | undefined;
}

export interface VisitSummaryRadiologyGalleryProps {
	radiologySnapshots?: readonly RadiologySnapshotItem[];
	onZoomImage: (image: { url: string; title?: string }) => void;
}

export const VisitSummaryRadiologyGallery: React.FC<
	VisitSummaryRadiologyGalleryProps
> = ({ radiologySnapshots, onZoomImage }) => {
	if (!radiologySnapshots || radiologySnapshots.length === 0) return null;

	return (
		<div
			className="space-y-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] page-break-avoid"
			data-testid="summary-radiology-section"
		>
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
				<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
					<Scan className="w-4 h-4" />
					<span>
						Рентгенологическое обследование и 3D-снимки
					</span>
				</h4>
				<span className="text-xs font-semibold text-[var(--muted)]">
					{radiologySnapshots.length}{" "}
					{radiologySnapshots.length === 1
						? "снимок"
						: radiologySnapshots.length < 5
							? "снимка"
							: "снимков"}
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{radiologySnapshots.map((snap, idx) => (
					<div
						key={snap.id || idx}
						className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs overflow-hidden page-break-avoid"
						data-testid={`radiology-snapshot-card-${idx}`}
					>
						<div className="relative w-full sm:w-28 h-28 shrink-0 rounded-lg overflow-hidden border border-[var(--line)] bg-black flex items-center justify-center group">
							<img
								src={snap.thumbnailDataUri || snap.imageDataUri}
								alt={snap.title || (snap.toothCode ? `Снимок зуба ${snap.toothCode}` : "Рентгенологический снимок")}
								loading="lazy"
								decoding="async"
								className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
								style={{
									printColorAdjust: "exact",
									WebkitPrintColorAdjust: "exact",
								}}
							/>
							<button
								type="button"
								onClick={() =>
									onZoomImage({
										url: snap.imageDataUri,
										title: snap.toothCode
											? `Снимок зуба ${snap.toothCode}`
											: snap.title || "Рентгенологический снимок",
									})
								}
								className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity no-print cursor-pointer"
								title="Увеличить снимок"
								aria-label="Увеличить снимок"
							>
								<ZoomIn className="w-5 h-5" />
							</button>
						</div>

						<div className="flex-1 flex flex-col justify-between gap-1.5 min-w-0">
							<div>
								<div className="flex items-center justify-between gap-1">
									<span className="font-bold text-[var(--ink)] truncate">
										{snap.toothCode
											? `Зуб ${snap.toothCode}`
											: snap.title || "3D снимок"}
									</span>
									{snap.boneDensity && (
										<span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 min-w-0 break-words">
											{snap.boneDensity.classification} (
											{Math.round(snap.boneDensity.averageHU)} HU)
										</span>
									)}
								</div>

								<div className="text-xs text-[var(--muted)] flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
									{snap.capturedAt && (
										<span className="flex items-center gap-1">
											<Clock className="w-3.5 h-3.5" />
											{new Date(snap.capturedAt).toLocaleString("ru-RU")}
										</span>
									)}
									{snap.exposureTimeSec !== undefined &&
										snap.exposureTimeSec !== null && (
											<span className="flex items-center gap-1">
												<Clock className="w-3.5 h-3.5" />
												<span>
													{snap.exposureTimeSec.toFixed(2)} с
												</span>
											</span>
										)}
								</div>

								{snap.radiologicalFinding && (
									<p className="text-xs text-[var(--ink)] mt-1 line-clamp-2 leading-relaxed">
										{snap.radiologicalFinding}
									</p>
								)}
							</div>

							{snap.nerveDistanceMm !== undefined &&
								snap.nerveDistanceMm !== null && (
									<div
										className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold w-fit min-w-0 break-words ${
											snap.nerveDistanceMm < 2.0
												? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
												: "bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30"
										}`}
									>
										{snap.nerveDistanceMm < 2.0 ? (
											<>
												<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
												<span className="min-w-0 break-words">
													Опасная зона ({snap.nerveDistanceMm.toFixed(1)} мм)
												</span>
											</>
										) : (
											<>
												<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
												<span className="min-w-0 break-words">
													Канал: {snap.nerveDistanceMm.toFixed(1)} мм
												</span>
											</>
										)}
									</div>
								)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export interface RadiologyZoomLightboxProps {
	zoomImage: { url: string; title?: string } | null;
	onClose: () => void;
}

export const RadiologyZoomLightbox: React.FC<RadiologyZoomLightboxProps> = ({
	zoomImage,
	onClose,
}) => {
	if (!zoomImage) return null;

	return (
		<div
			className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150 no-print"
			role="region"
			aria-label="Просмотр снимка"
			onClick={onClose}
		>
			<div
				className="relative w-full h-full max-h-full bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950 text-white shrink-0">
					<span className="text-sm font-bold truncate">
						{zoomImage.title ||
							"Рентгенологический снимок (Высокое разрешение)"}
					</span>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center cursor-pointer"
						aria-label="Закрыть просмотр снимка"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="flex-1 overflow-auto p-2 bg-black flex items-center justify-center min-h-0">
					<img
						src={zoomImage.url}
						alt={zoomImage.title || "Снимок"}
						decoding="async"
						className="max-w-full max-h-full object-contain rounded"
					/>
				</div>
			</div>
		</div>
	);
};
