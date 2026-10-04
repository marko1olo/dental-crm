/**
 * DENTE CRM — Mobile Patient Studies (Галерея снимков) Drawer
 * Standards: Apple HIG Native Bottom Sheet, Grouped Inset Cards, Zero Bird Language.
 */

import React, { useEffect, useRef } from "react";
import { CheckCircle2, Layers, Scan, UploadCloud, X } from "lucide-react";
import { formatHumanStudyDate } from "./dentalViewerMath.js";
import type { RadiologyFilmstripItem } from "./RadiologyFilmstripDock.js";
import type { RadiologyStudy } from "./types.js";

export interface SensorStudyMobileStudiesDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly studies: readonly (RadiologyStudy | RadiologyFilmstripItem)[];
	readonly activeStudyId: string | null;
	readonly onSelectStudy: (study: RadiologyStudy | RadiologyFilmstripItem) => void;
	readonly onUploadFile: (file: File) => void;
}

export const SensorStudyMobileStudiesDrawer: React.FC<SensorStudyMobileStudiesDrawerProps> = ({
	isOpen,
	onClose,
	studies,
	activeStudyId,
	onSelectStudy,
	onUploadFile,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			onUploadFile(file);
			onClose();
		}
		e.target.value = "";
	};

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end"
			data-testid="mobile-filmstrip-drawer"
		>
			<input
				type="file"
				ref={fileInputRef}
				accept="image/*,.dcm,.rvg,.png,.jpg,.jpeg,.tiff"
				style={{ display: "none" }}
				onChange={handleFileInputChange}
			/>

			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Drawer Surface */}
			<div
				className="relative z-10 w-full max-h-[82dvh] flex flex-col rounded-t-[24px] bg-[#0f172a] border-t border-[#334155] shadow-2xl animate-in slide-in-from-bottom duration-250 p-4 pb-[max(20px,env(safe-area-inset-bottom))]"
				role="dialog"
				aria-modal="true"
				aria-label="Галерея рентгеновских снимков пациента"
			>
				{/* Tactile Drag Handle */}
				<div className="flex justify-center pb-2 cursor-grab">
					<div className="w-10 h-1.5 rounded-full bg-slate-500/50" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
					<div className="flex items-center gap-2">
						<Layers size={17} className="text-teal-400" />
						<h3 className="text-sm font-bold text-white tracking-tight">
							Снимки пациента ({studies.length})
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
						aria-label="Закрыть шторку"
					>
						<X size={16} />
					</button>
				</div>

				{/* List of studies (Grouped Cards) */}
				<div className="flex-1 overflow-y-auto py-3 space-y-2.5 overscroll-contain">
					{studies.length === 0 ? (
						<div className="py-8 text-center text-slate-400 text-xs">
							У пациента пока нет сохранённых снимков
						</div>
					) : (
						studies.map((item) => {
							const isSelected = item.id === activeStudyId;
							const toothBadge = item.teethFdi?.[0] ? `#${item.teethFdi[0]}` : null;
							const itemTitle = (item as any).title || (item as any).studyDescription || "Исследование";
							return (
								<div
									key={item.id}
									onClick={() => {
										onSelectStudy(item);
										onClose();
									}}
									className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 active:scale-[0.99] ${
										isSelected
											? "bg-teal-950/50 border-teal-500 shadow-md ring-1 ring-teal-500/60"
											: "bg-slate-800/70 hover:bg-slate-800 border-slate-700/80"
									}`}
									data-testid={`mobile-study-item-${item.id}`}
									role="button"
									tabIndex={0}
									aria-selected={isSelected}
								>
									{/* Thumbnail / Icon */}
									<div className="w-14 h-14 rounded-xl overflow-hidden bg-black/80 border border-slate-700 shrink-0 flex items-center justify-center relative">
										{item.imageUrl ? (
											<img
												src={item.imageUrl}
												alt={itemTitle}
												className="w-full h-full object-cover"
												onError={(e) => {
													(e.target as HTMLElement).style.display = "none";
												}}
											/>
										) : (
											<Scan size={24} className="text-slate-500" />
										)}
										{toothBadge && (
											<span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-black bg-[#00C853] text-[#022c15]">
												{toothBadge}
											</span>
										)}
									</div>

									{/* Metadata */}
									<div className="flex-1 min-w-0">
										<h4 className="text-xs font-bold text-white truncate">
											{itemTitle}
										</h4>
										<p className="text-[11px] text-teal-400 font-semibold truncate mt-0.5">
											{item.modalityLabel || "Прицельный снимок"}
										</p>
										<span className="text-[10px] text-slate-400 block mt-0.5">
											{formatHumanStudyDate(item.studyDate || "")}
										</span>
									</div>

									{/* Status indicator */}
									{isSelected && (
										<div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
											<CheckCircle2 size={16} />
										</div>
									)}
								</div>
							);
						})
					)}
				</div>

				{/* Quick Upload CTA Button */}
				<div className="pt-2 border-t border-slate-700/60">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
						data-testid="mobile-btn-upload-dicom"
					>
						<UploadCloud size={17} />
						<span>+ Загрузить снимок / DICOM</span>
					</button>
				</div>
			</div>
		</div>
	);
};
