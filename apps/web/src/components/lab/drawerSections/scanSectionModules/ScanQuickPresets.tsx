import React from "react";
import { Box, Camera } from "lucide-react";

export interface ScanQuickPresetsProps {
	setFormAttachedScanUrl: (val: string) => void;
	setAttachedFileName: (val: string) => void;
	setAttachedFileSize: (val: string) => void;
}

export function ScanQuickPresets({
	setFormAttachedScanUrl, setAttachedFileName, setAttachedFileSize,
}: ScanQuickPresetsProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Быстрые сканы:</span>
			<button
				type="button"
				onClick={() => {
					setFormAttachedScanUrl("/scans/patient_jaw_scan_maxilla.stl");
					setAttachedFileName("jaw_scan_upper_maxilla.stl");
					setAttachedFileSize("18.4 МБ");
				}}
				className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:border-teal-500 transition cursor-pointer inline-flex items-center gap-1"
				data-testid="btn-demo-stl-attach"
			>
				<Box size={11} className="text-teal-600" />
				<span>+ В/Ч STL скан</span>
			</button>
			<button
				type="button"
				onClick={() => {
					setFormAttachedScanUrl("/scans/patient_jaw_scan_mandible.stl");
					setAttachedFileName("jaw_scan_lower_mandible.stl");
					setAttachedFileSize("21.2 МБ");
				}}
				className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:border-teal-500 transition cursor-pointer inline-flex items-center gap-1"
			>
				<Box size={11} className="text-teal-600" />
				<span>+ Н/Ч STL скан</span>
			</button>
			<button
				type="button"
				onClick={() => {
					setFormAttachedScanUrl("/photos/bite_registration_occlusion.jpg");
					setAttachedFileName("bite_registration_front.jpg");
					setAttachedFileSize("4.6 МБ");
				}}
				className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[11px] font-semibold text-[var(--ink,#0f172a)] hover:border-teal-500 transition cursor-pointer inline-flex items-center gap-1"
			>
				<Camera size={11} className="text-amber-600" />
				<span>+ Фото прикуса</span>
			</button>
		</div>
	);
}
