import React, { useState } from "react";
import {
	Check,
	ChevronRight,
	FileText,
	Layers,
	Sparkles,
	X,
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import type { MobilePatientShowcaseOverlayProps } from "./types.js";

/**
 * MobilePatientShowcaseOverlay: Chairside presentation mode for patient education.
 * Provides 1-click 'Before/After' comparison, large readable labels, hides confusing
 * technical sensor parameters, and links findings directly to Form 043/u clinical protocol.
 */
export const MobilePatientShowcaseOverlay: React.FC<MobilePatientShowcaseOverlayProps> = ({
	isOpen,
	onClose,
	selectedStudy,
	activePatient,
	effectivePreviewUrl,
	computedFilter,
	modalityTitle,
	toothBadge,
	studyDateStr,
	comparisonStudy,
	allStudies = [],
	onSelectComparisonStudy,
	isProtocol043Attached = false,
	onToggleProtocol043Attach,
	triggerHaptic,
}) => {
	const [comparisonMode, setComparisonMode] = useState<"single" | "split">("single");
	const [attachedTo043, setAttachedTo043] = useState<boolean>(isProtocol043Attached);

	if (!isOpen) return null;

	const handleToggleAttach043 = () => {
		triggerHaptic();
		setAttachedTo043((prev) => {
			const next = !prev;
			if (onToggleProtocol043Attach) {
				onToggleProtocol043Attach();
			} else {
				showToast(
					next
						? "Снимок прикреплен к протоколу 043/у (Осмотр и диагностика)"
						: "Привязка к 043/у снята",
					next ? "success" : "info"
				);
			}
			return next;
		});
	};

	return (
		<div
			className="fixed inset-0 z-[100060] bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in"
			data-testid="mobile-patient-showcase-overlay"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. SHOWCASE HEADER (Large Readable Clinical Badges)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex items-center justify-between pb-3 border-b border-white/15">
				<div>
					<div className="flex items-center gap-2">
						<span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/25 text-teal-300 border border-teal-500/40 font-mono">
							{toothBadge}
						</span>
						<span className="text-xs text-slate-300 font-medium">
							{studyDateStr}
						</span>
					</div>
					<h2 className="text-lg font-bold text-white mt-1">
						{activePatient?.fullName || activePatient?.name || "Презентация пациенту"}
					</h2>
					<p className="text-xs text-slate-400">
						{modalityTitle} · Наглядная демонстрация состояния
					</p>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
					data-testid="btn-close-patient-showcase"
					aria-label="Закрыть режим презентации"
				>
					<X size={20} />
				</button>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. COMPARISON CANVAS (Single / Split Before-After)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex-1 flex flex-col items-center justify-center my-3 relative overflow-hidden">
				{comparisonMode === "single" || !comparisonStudy ? (
					<div className="w-full h-full max-h-[60vh] flex flex-col items-center justify-center relative">
						{effectivePreviewUrl ? (
							<img
								src={effectivePreviewUrl}
								alt="Снимок для пациента"
								className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
								style={{ filter: computedFilter }}
							/>
						) : (
							<div className="w-64 h-64 rounded-2xl bg-slate-900 border border-teal-500/30 flex items-center justify-center text-teal-400 text-sm font-semibold text-center p-4">
								Интраоральный снимок готов к объяснению плана лечения
							</div>
						)}

						{/* Highlight Badge */}
						<div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-sm border border-teal-500/40 text-xs font-bold text-teal-300 flex items-center gap-1.5">
							<Sparkles size={14} />
							<span>Фокус внимания врача</span>
						</div>
					</div>
				) : (
					/* Split Before / After Mode */
					<div className="w-full h-full max-h-[60vh] grid grid-cols-2 gap-2">
						{/* Left: Previous / Reference */}
						<div className="relative flex flex-col items-center justify-center bg-slate-950 rounded-2xl overflow-hidden border border-white/10">
							<div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-slate-300 font-mono">
								ДО ЛЕЧЕНИЯ
							</div>
							{comparisonStudy.previewUrl ? (
								<img
									src={comparisonStudy.previewUrl}
									alt="До лечения"
									className="w-full h-full object-contain"
								/>
							) : (
								<span className="text-xs text-slate-500">Архивный снимок</span>
							)}
						</div>

						{/* Right: Current Study */}
						<div className="relative flex flex-col items-center justify-center bg-slate-950 rounded-2xl overflow-hidden border border-teal-500/40">
							<div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-teal-600/90 text-[10px] font-bold text-white font-mono">
								СЕГОДНЯ
							</div>
							{effectivePreviewUrl ? (
								<img
									src={effectivePreviewUrl}
									alt="Текущий снимок"
									className="w-full h-full object-contain"
									style={{ filter: computedFilter }}
								/>
							) : (
								<span className="text-xs text-slate-500">Текущий снимок</span>
							)}
						</div>
					</div>
				)}
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. BOTTOM CHAIRSIDE ACTIONS (Thumb Zone >=44px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="space-y-2.5 pt-2 border-t border-white/10">
				{/* 1-Click Comparison Switcher */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							triggerHaptic();
							setComparisonMode((prev) => (prev === "single" ? "split" : "single"));
						}}
						className={`flex-1 min-h-[46px] rounded-xl px-3 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
							comparisonMode === "split"
								? "bg-teal-600 text-white shadow-md border border-teal-400"
								: "bg-white/10 text-slate-200 border border-white/15 hover:bg-white/15"
						}`}
						data-testid="btn-toggle-showcase-split"
					>
						<Layers size={16} />
						<span>{comparisonMode === "split" ? "Одиночный вид" : "Сравнение 'До/После'"}</span>
					</button>

					{/* Protocol 043/u Attachment Toggle */}
					<button
						type="button"
						onClick={handleToggleAttach043}
						className={`flex-1 min-h-[46px] rounded-xl px-3 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
							attachedTo043
								? "bg-emerald-600 text-white shadow-md border border-emerald-400"
								: "bg-white/10 text-slate-200 border border-white/15 hover:bg-white/15"
						}`}
						data-testid="btn-toggle-attach-protocol-043"
					>
						{attachedTo043 ? <Check size={16} /> : <FileText size={16} />}
						<span>{attachedTo043 ? "В протоколе 043/у" : "+ В протокол 043/у"}</span>
					</button>
				</div>
			</div>
		</div>
	);
};
