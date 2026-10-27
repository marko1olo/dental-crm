/**
 * DENTE Dental CRM — Shift Editor Action Buttons
 * 1 Primary CTA (Mandate 8am), Full Edit & Cancel (Mandates 8e, 8n)
 */

import React from "react";
import { Check, Clock, Trash2 } from "lucide-react";

export interface ShiftEditorActionButtonsProps {
	onSaveShift: () => void;
	onFullEdit: () => void;
	onClose: () => void;
	onClearShift: () => void;
}

export const ShiftEditorActionButtons: React.FC<ShiftEditorActionButtonsProps> = ({
	onSaveShift,
	onFullEdit,
	onClose,
	onClearShift,
}) => {
	return (
		<div className="shift-editor-footer">
			<div className="flex items-center gap-2">
				<button
					type="button"
					data-testid="popover-full-edit-btn"
					className="roster-btn roster-btn-secondary"
					onClick={onFullEdit}
					style={{ minHeight: "44px" }}
				>
					<Clock size={16} />
					<span>Подробно</span>
				</button>
				<button
					type="button"
					data-testid="shift-editor-delete-btn"
					className="roster-btn roster-btn-danger text-rose-600"
					onClick={onClearShift}
					style={{ minHeight: "44px" }}
					title="Очистить смену"
				>
					<Trash2 size={16} />
					<span>Очистить</span>
				</button>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					data-testid="shift-editor-cancel-btn"
					className="roster-btn roster-btn-secondary"
					onClick={onClose}
					style={{ minHeight: "44px" }}
				>
					Отмена
				</button>
				{/* Mandate 8e & 8am: Exactly 1 Primary CTA, NEVER disabled */}
				<button
					type="button"
					data-testid="shift-editor-save-btn"
					className="roster-btn roster-btn-primary shift-editor-action-btn-primary"
					onClick={onSaveShift}
					disabled={false}
					style={{ minHeight: "44px" }}
				>
					<Check size={16} />
					<span>Сохранить смену</span>
				</button>
			</div>
		</div>
	);
};
