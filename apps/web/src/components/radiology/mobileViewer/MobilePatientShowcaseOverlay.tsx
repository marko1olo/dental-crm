import { X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { MobileShowcaseBottomActions } from "./MobileShowcaseBottomActions.js";
import { MobileShowcaseCanvas } from "./MobileShowcaseCanvas.js";
import type { MobilePatientShowcaseOverlayProps } from "./types.js";

export * from "./MobileShowcaseBottomActions.js";

export const MobilePatientShowcaseOverlay: React.FC<
	MobilePatientShowcaseOverlayProps
> = ({
	isOpen,
	onClose,
	activePatient,
	effectivePreviewUrl,
	computedFilter,
	modalityTitle,
	toothBadge,
	studyDateStr,
	comparisonStudy,
	isProtocol043Attached = false,
	onToggleProtocol043Attach,
	triggerHaptic,
}) => {
	const [comparisonMode, setComparisonMode] = useState<"single" | "split">(
		"single",
	);
	const [attachedTo043, setAttachedTo043] = useState<boolean>(
		isProtocol043Attached,
	);

	if (!isOpen) return null;

	const handleToggleAttach043 = () => {
		triggerHaptic();
		setAttachedTo043((prev) => {
			const next = !prev;
			if (onToggleProtocol043Attach) onToggleProtocol043Attach();
			else
				showToast(
					next
						? "Снимок прикреплен к медицинской карте приёма"
						: "Привязка к медицинской карте снята",
					next ? "success" : "info",
				);
			return next;
		});
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Демонстрация снимка пациенту"
			className="fixed inset-0 z-[100060] bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in"
			data-testid="mobile-patient-showcase-overlay"
		>
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
						{activePatient?.fullName || "Презентация пациенту"}
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

			<MobileShowcaseCanvas
				comparisonMode={comparisonMode}
				effectivePreviewUrl={effectivePreviewUrl}
				computedFilter={computedFilter}
				comparisonStudy={comparisonStudy}
			/>

			<MobileShowcaseBottomActions
				comparisonMode={comparisonMode}
				onToggleMode={() => {
					triggerHaptic();
					setComparisonMode((prev) => (prev === "single" ? "split" : "single"));
				}}
				attachedTo043={attachedTo043}
				onToggleAttach={handleToggleAttach043}
			/>
		</div>
	);
};
