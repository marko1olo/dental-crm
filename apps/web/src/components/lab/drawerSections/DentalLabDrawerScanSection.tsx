import React from "react";
import { Box, Upload } from "lucide-react";
import { is3DScanUrl } from "../dentalLabOrderEngine";

export interface DentalLabDrawerScanSectionProps {
	readonly formAttachedScanUrl: string;
	readonly setFormAttachedScanUrl: (val: string) => void;
}

export function DentalLabDrawerScanSection({
	formAttachedScanUrl,
	setFormAttachedScanUrl,
}: DentalLabDrawerScanSectionProps) {
	return (
		<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2">
			<div className="flex items-center justify-between">
				<label className="font-semibold block text-xs text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Box size={14} className="text-teal-600 dark:text-teal-400" />
					<span>3D-скан челюсти (STL / PLY) или фото:</span>
				</label>
				{formAttachedScanUrl && (
					<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
						{is3DScanUrl(formAttachedScanUrl) ? "3D модель прикреплена" : "Фото прикреплено"}
					</span>
				)}
			</div>
			<div className="flex items-center gap-1.5">
				<input
					type="text"
					placeholder="URL или имя файла: /scans/jaw_upper_scan.stl или фото..."
					value={formAttachedScanUrl}
					onChange={(e) => setFormAttachedScanUrl(e.target.value)}
					className="flex-1 h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
					data-testid="form-attached-scan-input"
				/>
				<button
					type="button"
					onClick={() => setFormAttachedScanUrl("/scans/patient_jaw_scan_mandible.stl")}
					className="h-9 px-2.5 rounded-lg bg-[var(--paper,#ffffff)] hover:bg-teal-500/10 border border-[var(--line,#cbd5e1)] text-[11px] font-semibold flex items-center gap-1 text-[var(--ink,#0f172a)] transition-colors shrink-0 cursor-pointer"
					title="Прикрепить тестовый интраоральный 3D-скан STL"
					data-testid="btn-demo-stl-attach"
				>
					<Upload size={12} className="text-teal-600" />
					<span>+ STL скан</span>
				</button>
			</div>
		</div>
	);
}
