import { LabAttachFooter } from "./attachScanModules/LabAttachFooter";
import { LabAttachHeader } from "./attachScanModules/LabAttachHeader";
import { LabAttachPathInput } from "./attachScanModules/LabAttachPathInput";
import { LabAttachScanPresets } from "./attachScanModules/LabAttachScanPresets";
import { is3DScanUrl } from "./attachScanModules/labScanUrlUtils";
import { useLabAttachScanState } from "./attachScanModules/useLabAttachScanState";
import type { DentalLabOrderData } from "./DentalLabOrderModal";

export { is3DScanUrl };

export interface LabAttachScanModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly initialType?: "stl" | "ply" | "photo";
	readonly onSave: (url: string) => Promise<void>;
}

export function LabAttachScanModal({
	isOpen,
	onClose,
	order,
	initialType = "stl",
	onSave,
}: LabAttachScanModalProps) {
	const state = useLabAttachScanState(isOpen, order, initialType, onSave);

	if (!isOpen || !order) return null;

	const patientTag = order.patientName
		? order.patientName.replace(/\s+/g, "_")
		: "patient";
	const toothTag = order.toothFdi || "arch";

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lab-attach-modal-title"
			tabIndex={-1}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className="w-full max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
				<LabAttachHeader order={order} onClose={onClose} />
				<form onSubmit={state.handleSubmit} className="flex flex-col m-0">
					<div className="p-4 space-y-3.5">
						<LabAttachScanPresets
							attachType={state.attachType}
							setAttachType={state.setAttachType}
							filePath={state.filePath}
							setFilePath={state.setFilePath}
							patientTag={patientTag}
							toothTag={toothTag}
							onPresetSelect={() => state.inputRef.current?.focus()}
						/>
						<LabAttachPathInput
							inputRef={state.inputRef}
							fileInputRef={state.fileInputRef}
							filePath={state.filePath}
							setFilePath={state.setFilePath}
							fileSizeInfo={state.fileSizeInfo}
							onFileSelect={state.handleFileSelect}
						/>
					</div>
					<LabAttachFooter
						onClose={onClose}
						isSubmitting={state.isSubmitting}
						canSubmit={Boolean(state.filePath.trim())}
					/>
				</form>
			</div>
		</div>
	);
}
