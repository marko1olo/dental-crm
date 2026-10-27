/**
 * DENTE Dental CRM — Shift Editor Header
 * Date, Doctor & Chair Info, Mobile Bottom Sheet Drag Handle, Close Button
 */

import React from "react";
import { X } from "lucide-react";
import type { WeekDayItem } from "../types";

export interface ShiftEditorHeaderProps {
	popoverDayInfo: WeekDayItem | null;
	dateIso: string;
	onClose: () => void;
}

export const ShiftEditorHeader: React.FC<ShiftEditorHeaderProps> = ({
	popoverDayInfo,
	dateIso,
	onClose,
}) => {
	return (
		<>
			{/* Mobile Bottom Sheet Drag Handle (Apple iOS HIG 36x5px) */}
			<div className="shift-editor-drag-handle" aria-hidden="true" />

			<div className="shift-editor-header">
				<div>
					<h4 className="shift-editor-title">
						<span>Назначение смены</span>
					</h4>
					<div className="shift-editor-subtitle">
						{popoverDayInfo?.dayName || ""}, {dateIso}
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="shift-editor-close-btn"
					style={{ minHeight: "44px", minWidth: "44px" }}
					title="Закрыть"
					aria-label="Закрыть окно смены"
				>
					<X size={18} />
				</button>
			</div>
		</>
	);
};
