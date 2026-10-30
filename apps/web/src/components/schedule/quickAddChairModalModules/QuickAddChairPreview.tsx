import React from "react";
import { DentalChairUnit } from "../../icons/DentalIcons";
import { CHAIR_COLOR_PRESETS } from "./chairPresets";

interface QuickAddChairPreviewProps {
	readonly chairName: string;
	readonly defaultChairName: string;
	readonly roomNumber: string;
	readonly defaultRoomName: string;
	readonly selectedColor: string;
	readonly defaultDoctorId: string;
	readonly doctors?:
		| Array<{
				id: string;
				fullName: string;
		  }>
		| undefined;
}

export function QuickAddChairPreview({
	chairName,
	defaultChairName,
	roomNumber,
	defaultRoomName,
	selectedColor,
	defaultDoctorId,
	doctors,
}: QuickAddChairPreviewProps): React.ReactElement {
	const displayName = chairName.trim() || defaultChairName;
	const displayRoom = roomNumber.trim() || defaultRoomName;
	const activePreset = CHAIR_COLOR_PRESETS.find(
		(c) => c.hex.toLowerCase() === selectedColor.toLowerCase(),
	);
	const assignedDoctor = doctors?.find((d) => d.id === defaultDoctorId);

	return (
		<div
			className="quick-add-chair-live-preview p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2"
			data-testid="quick-add-chair-live-preview"
		>
			<div
				className="h-1.5 w-full rounded-full mb-2.5"
				style={{ backgroundColor: selectedColor }}
				data-testid="quick-add-chair-preview-accent-strip"
			/>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<span
						className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
						style={{ backgroundColor: selectedColor }}
					/>
					<div>
						<div className="text-sm font-bold text-[var(--ink,#0f172a)] leading-tight">
							{displayName}
						</div>
						<div className="text-xs text-[var(--muted,#64748b)]">
							{displayRoom}
						</div>
					</div>
				</div>
				<span
					className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
					style={{
						backgroundColor: `${selectedColor}15`,
						color: selectedColor,
					}}
					data-testid="quick-add-chair-preview-color-name"
				>
					{activePreset?.label || "Цвет кресла"}
				</span>
			</div>
			<div
				className="pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs"
				data-testid="quick-add-chair-preview-doctor-block"
			>
				<span className="text-[var(--muted,#64748b)]">Основной врач установки:</span>
				<span className="font-bold text-[var(--ink,#0f172a)]" data-testid="quick-add-chair-preview-doctor">
					{assignedDoctor?.fullName || "По графику смен (без привязки)"}
				</span>
			</div>
		</div>
	);
}
