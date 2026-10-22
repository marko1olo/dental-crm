import React from "react";
import { UploadCloud, MoreVertical } from "lucide-react";
import type { OrthodonticAngleDefinition, OrthodonticPhotoSlot } from "@dental/shared";
import { OrthoSlotMenu } from "./OrthoSlotMenu";

interface OrthoPhotoSlotControlsProps {
	angle: OrthodonticAngleDefinition;
	slot?: OrthodonticPhotoSlot | undefined;
	hasPhoto: boolean;
	isMenuOpen: boolean;
	onToggleMenu: () => void;
	onTriggerUpload: () => void;
	onRotate: (e: React.MouseEvent) => void;
	onFlipHorizontal: (e: React.MouseEvent) => void;
	onZoomChange: (delta: number, e: React.MouseEvent) => void;
	onDelete: (e: React.MouseEvent) => void;
}

export const OrthoPhotoSlotControls: React.FC<OrthoPhotoSlotControlsProps> = ({
	angle,
	slot,
	hasPhoto,
	isMenuOpen,
	onToggleMenu,
	onTriggerUpload,
	onRotate,
	onFlipHorizontal,
	onZoomChange,
	onDelete,
}) => {
	return (
		<div className="ortho-slot-controls flex items-center justify-between gap-1.5 px-3 py-1.5 min-h-[38px] relative">
			<button
				type="button"
				onClick={onTriggerUpload}
				className="ortho-slot-btn ortho-slot-btn-text h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-all cursor-pointer shrink-0"
				title={hasPhoto ? "Заменить снимок" : "Загрузить снимок"}
				data-testid={`upload-btn-${angle.id}`}
			>
				<UploadCloud size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span>{hasPhoto ? "Заменить" : "Загрузить"}</span>
			</button>

			{hasPhoto ? (
				<div className="relative">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggleMenu();
						}}
						className={`ortho-slot-btn w-7 h-7 inline-flex items-center justify-center rounded-md border transition-all cursor-pointer ${
							isMenuOpen
								? "border-[var(--teal,#0d9488)] bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)]"
								: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:border-[var(--teal,#0d9488)]"
						}`}
						title="Действия со снимком"
						aria-label="Действия со снимком"
						aria-expanded={isMenuOpen}
						data-testid={`slot-menu-btn-${angle.id}`}
					>
						<MoreVertical size={14} />
					</button>

					{isMenuOpen && (
						<OrthoSlotMenu
							angle={angle}
							slot={slot}
							onRotate={onRotate}
							onFlipHorizontal={onFlipHorizontal}
							onZoomChange={onZoomChange}
							onDelete={onDelete}
						/>
					)}
				</div>
			) : (
				<span
					className="text-[10px] text-[var(--muted,#64748b)] truncate max-w-[140px]"
					title={angle.requiredEquipmentRu}
				>
					{angle.requiredEquipmentRu.slice(0, 24)}...
				</span>
			)}
		</div>
	);
};
