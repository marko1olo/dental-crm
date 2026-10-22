import { Camera, UploadCloud } from "lucide-react";
import React from "react";

export const MobileStudiesDrawerFooter: React.FC<{
	onClose: () => void;
	onCaptureCamera?: (() => void) | undefined;
	onPickFiles?: (() => void) | undefined;
}> = ({ onClose, onCaptureCamera, onPickFiles }) => {
	return (
		<div className="mobile-radiology-drawer-footer">
			<button
				type="button"
				onClick={() => {
					onClose();
					onCaptureCamera?.();
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
					onPickFiles?.();
				}}
				className="mobile-radiology-btn-primary flex-1 min-h-[46px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
				data-testid="btn-mobile-sheet-upload"
			>
				<UploadCloud size={16} />
				<span>Загрузить</span>
			</button>
		</div>
	);
};
