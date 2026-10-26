/**
 * ScannerDocumentPresets.tsx
 *
 * Fast 1-tap document type selector chips (Passport RF, OMS, SNILS, Referral)
 * and hardware video device selector.
 */

import React from "react";
import { Camera, ClipboardList, CreditCard, FileSpreadsheet, FileText, Paperclip, Shield } from "lucide-react";
import { DOCUMENT_PRESETS_LIST, type DocumentPresetIcon, type DocumentType } from "../documentScannerEngine";

export interface ScannerDocumentPresetsProps {
	readonly selectedDocType: DocumentType;
	readonly onSelectDocType: (type: DocumentType) => void;
	readonly availableCameras: MediaDeviceInfo[];
	readonly selectedCameraId: string;
	readonly onSelectCameraId: (deviceId: string) => void;
}

export const renderPresetIcon = (iconName: DocumentPresetIcon, size = 16, className?: string) => {
	switch (iconName) {
		case "CreditCard": return <CreditCard size={size} className={className} />;
		case "Shield": return <Shield size={size} className={className} />;
		case "FileSpreadsheet": return <FileSpreadsheet size={size} className={className} />;
		case "FileText": return <FileText size={size} className={className} />;
		case "ClipboardList": return <ClipboardList size={size} className={className} />;
		case "Paperclip": default: return <Paperclip size={size} className={className} />;
	}
};

export const ScannerDocumentPresets: React.FC<ScannerDocumentPresetsProps> = ({
	selectedDocType,
	onSelectDocType,
	availableCameras,
	selectedCameraId,
	onSelectCameraId,
}) => {
	return (
		<div className="flex items-center justify-between gap-1.5 overflow-x-auto border-b border-[var(--line)] p-2 bg-[var(--paper)]">
			<div className="flex gap-1.5 overflow-x-auto">
				{DOCUMENT_PRESETS_LIST.map((p) => (
					<button
						key={p.id}
						type="button"
						onClick={() => onSelectDocType(p.id)}
						className={`inline-flex items-center gap-1.5 min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
							selectedDocType === p.id
								? "bg-[var(--teal)] text-white shadow-sm"
								: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
						}`}
					>
						{renderPresetIcon(p.icon, 14, "shrink-0")}
						<span>{p.shortTitle}</span>
					</button>
				))}
			</div>

			{availableCameras.length > 1 && (
				<div className="flex items-center gap-1.5 pl-2 border-l border-[var(--line)] shrink-0">
					<Camera size={14} className="text-[var(--muted)]" />
					<select
						value={selectedCameraId}
						onChange={(e) => onSelectCameraId(e.target.value)}
						className="min-h-[36px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-2 py-1 text-xs text-[var(--ink)] cursor-pointer"
						title="Выбор камеры оборудования"
						aria-label="Выбор камеры оборудования"
					>
						{availableCameras.map((cam, idx) => (
							<option key={cam.deviceId || idx} value={cam.deviceId}>
								{cam.label || `Камера ${idx + 1}`}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	);
};
export default ScannerDocumentPresets;
