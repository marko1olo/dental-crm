import React from "react";
import { Box, Camera } from "lucide-react";
import { LabAttachPresetList } from "./LabAttachPresetList";
import { is3DScanUrl } from "./labScanUrlUtils";

export interface LabAttachScanPresetsProps {
	readonly attachType: "stl" | "ply" | "photo";
	readonly setAttachType: (t: "stl" | "ply" | "photo") => void;
	readonly filePath: string;
	readonly setFilePath: (p: string) => void;
	readonly patientTag: string;
	readonly toothTag: string | number;
	readonly onPresetSelect?: () => void;
}

export function LabAttachScanPresets({
	attachType,
	setAttachType,
	filePath,
	setFilePath,
	patientTag,
	toothTag,
	onPresetSelect,
}: LabAttachScanPresetsProps) {
	const presets = [
		{
			label: "В/Ч Верхняя челюсть (STL)",
			path: `scans/${patientTag}_upper_${toothTag}.stl`,
			type: "stl" as const,
		},
		{
			label: "Н/Ч Нижняя челюсть (STL)",
			path: `scans/${patientTag}_lower_${toothTag}.stl`,
			type: "stl" as const,
		},
		{
			label: "Цветной скан прикуса (PLY)",
			path: `scans/${patientTag}_occlusion_bite.ply`,
			type: "ply" as const,
		},
		{
			label: "Клиническое фото улыбки (JPG)",
			path: `photos/${patientTag}_clinical_view.jpg`,
			type: "photo" as const,
		},
	];

	return (
		<div className="space-y-3.5">
			<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)]">
				<button
					type="button"
					onClick={() => {
						setAttachType("stl");
						if (!filePath.toLowerCase().endsWith(".stl"))
							setFilePath(`scans/${patientTag}_upper.stl`);
					}}
					className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						attachType === "stl"
							? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-300 shadow-2xs border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<Box className="w-3.5 h-3.5 text-teal-500" />
					<span>STL 3D-скан</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setAttachType("ply");
						if (!filePath.toLowerCase().endsWith(".ply"))
							setFilePath(`scans/${patientTag}_bite.ply`);
					}}
					className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						attachType === "ply"
							? "bg-[var(--paper,#ffffff)] text-purple-700 dark:text-purple-300 shadow-2xs border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<Box className="w-3.5 h-3.5 text-purple-500" />
					<span>PLY (Цветной 3D)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						setAttachType("photo");
						if (is3DScanUrl(filePath))
							setFilePath(`photos/${patientTag}_bite.jpg`);
					}}
					className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						attachType === "photo"
							? "bg-[var(--paper,#ffffff)] text-sky-700 dark:text-sky-300 shadow-2xs border border-[var(--line,#cbd5e1)]"
							: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
				>
					<Camera className="w-3.5 h-3.5 text-sky-500" />
					<span>Фото прикуса</span>
				</button>
			</div>

			<LabAttachPresetList
				presets={presets}
				filePath={filePath}
				onSelect={(pr) => {
					setFilePath(pr.path);
					setAttachType(pr.type);
					onPresetSelect?.();
				}}
			/>
		</div>
	);
}
