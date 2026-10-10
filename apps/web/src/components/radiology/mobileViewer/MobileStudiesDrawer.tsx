import React, { useMemo, useState } from "react";
import { Camera, Check, ChevronRight, UploadCloud, X } from "lucide-react";
import { formatShortDate } from "../../../AppHelpers.js";
import type { MobileStudiesDrawerProps } from "./types.js";

/**
 * MobileStudiesDrawer: Native iOS-style bottom sheet for browsing and switching
 * patient radiology studies (RVG, OPG, CBCT) with touch ergonomics and filters.
 */
export const MobileStudiesDrawer: React.FC<MobileStudiesDrawerProps> = ({
	isOpen,
	onClose,
	studies = [],
	selectedStudyId,
	activePatient,
	imagingKindLabels = {},
	onSelectStudy,
	onCaptureCamera,
	onPickFiles,
	triggerHaptic,
}) => {
	const [studiesSheetFilter, setStudiesSheetFilter] = useState<string>("all");

	// Filtered list of studies for bottom sheet
	const filteredStudies = useMemo(() => {
		if (studiesSheetFilter === "all") return studies;
		return studies.filter((s) => s.kind === studiesSheetFilter);
	}, [studies, studiesSheetFilter]);

	if (!isOpen) return null;

	return (
		<div
			className="mobile-radiology-drawer-overlay"
			data-testid="mobile-studies-drawer-overlay"
			onClick={onClose}
		>
			<div
				className="mobile-radiology-drawer"
				data-testid="mobile-studies-drawer"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Tactile Drag Handle */}
				<div className="mobile-radiology-drag-handle" />

				{/* Header */}
				<div className="mobile-radiology-drawer-header">
					<div>
						<h3 className="text-base font-bold text-[var(--ink)]">
							Снимки пациента ({studies.length})
						</h3>
						<p className="text-xs text-[var(--muted)] truncate max-w-[260px]">
							{activePatient?.fullName || activePatient?.name || "Пациент не выбран"}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform cursor-pointer"
						aria-label="Закрыть шторку"
					>
						<X size={18} />
					</button>
				</div>

				{/* Modality Filter Chips (Horizontal Segments) */}
				<div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-[var(--line-subtle)]">
					<button
						type="button"
						onClick={() => setStudiesSheetFilter("all")}
						className={`mobile-radiology-filter-chip ${studiesSheetFilter === "all" ? "active" : ""}`}
					>
						Все ({studies.length})
					</button>
					<button
						type="button"
						onClick={() => setStudiesSheetFilter("periapical")}
						className={`mobile-radiology-filter-chip ${studiesSheetFilter === "periapical" ? "active" : ""}`}
					>
						Прицельные
					</button>
					<button
						type="button"
						onClick={() => setStudiesSheetFilter("opg")}
						className={`mobile-radiology-filter-chip ${studiesSheetFilter === "opg" ? "active" : ""}`}
					>
						ОПТГ
					</button>
					<button
						type="button"
						onClick={() => setStudiesSheetFilter("cbct")}
						className={`mobile-radiology-filter-chip ${studiesSheetFilter === "cbct" ? "active" : ""}`}
					>
						КТ 3D
					</button>
				</div>

				{/* Studies Grouped List Cards */}
				<div className="mobile-radiology-drawer-body">
					{filteredStudies.length === 0 ? (
						<div className="py-12 text-center text-slate-400 text-xs">
							Снимков в этой категории нет
						</div>
					) : (
						filteredStudies.map((study) => {
							const isSelected = selectedStudyId === study.id;
							const sTooth = study.toothCode;
							const sRegion = study.region;
							const sBadge = sTooth ? `Зуб #${sTooth}` : sRegion || null;

							return (
								<div
									key={study.id}
									onClick={() => {
										triggerHaptic();
										onSelectStudy(study.id);
										onClose();
									}}
									className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
										isSelected
											? "bg-teal-500/15 border-teal-500 shadow-sm"
											: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40"
									}`}
									data-testid={`mobile-study-item-${study.id}`}
								>
									<div className="flex items-center gap-3 min-w-0 flex-1">
										{/* Study Thumbnail */}
										<div className="w-12 h-12 rounded-xl bg-slate-900 border border-[var(--line)] overflow-hidden shrink-0 flex items-center justify-center">
											{study.previewUrl ? (
												<img
													src={study.previewUrl}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<span className="text-[10px] font-bold text-teal-400 uppercase">
													{study.kind.slice(0, 3)}
												</span>
											)}
										</div>

										{/* Study Details */}
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<strong className="text-xs font-bold text-[var(--ink)] truncate">
													{study.title || "Исследование"}
												</strong>
												{sBadge && (
													<span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 shrink-0">
														{sBadge}
													</span>
												)}
											</div>
											<div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
												{formatShortDate(study.capturedAt)} ·{" "}
												{imagingKindLabels[study.kind] || study.kind}
											</div>
										</div>
									</div>

									{/* Trailing Selection Indicator */}
									<div className="shrink-0 pl-2">
										{isSelected ? (
											<span className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-xs">
												<Check size={14} />
											</span>
										) : (
											<ChevronRight size={18} className="text-[var(--muted)]" />
										)}
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Footer Actions */}
				<div className="mobile-radiology-drawer-footer">
					<button
						type="button"
						onClick={() => {
							onClose();
							onCaptureCamera();
						}}
						className="flex-1 min-h-[46px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
						data-testid="btn-mobile-sheet-camera"
					>
						<Camera size={16} className="text-teal-400" />
						<span>Камера</span>
					</button>

					<button
						type="button"
						onClick={() => {
							onClose();
							onPickFiles();
						}}
						className="mobile-radiology-btn-primary flex-1 min-h-[46px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
						data-testid="btn-mobile-sheet-upload"
					>
						<UploadCloud size={16} />
						<span>Загрузить</span>
					</button>
				</div>
			</div>
		</div>
	);
};
