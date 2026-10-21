/**
 * apps/web/src/components/treatment-plans/curator/CuratorModalFooter.tsx
 *
 * Подвал модального окна курации с кнопками сохранения и отмены (>= 44px).
 */

import React from "react";
import { Check } from "lucide-react";

export interface CuratorModalFooterProps {
	readonly isSaving: boolean;
	readonly isDoctorSelf: boolean;
	readonly onClose: () => void;
	readonly onSave: () => void;
}

export const CuratorModalFooter: React.FC<CuratorModalFooterProps> = ({
	isSaving,
	isDoctorSelf,
	onClose,
	onSave,
}) => {
	return (
		<div className="curator-modal-footer">
			<button
				type="button"
				onClick={onClose}
				className="curator-action-btn curator-action-secondary"
				style={{ minHeight: "44px", minWidth: "100px" }}
				disabled={isSaving}
			>
				Отмена
			</button>

			<button
				type="button"
				data-testid="curator-save-btn"
				onClick={onSave}
				disabled={isSaving}
				className="curator-action-btn curator-action-primary"
				style={{ minHeight: "44px", minWidth: "180px" }}
			>
				<Check className="w-4 h-4" />
				{isSaving
					? "Сохранение..."
					: isDoctorSelf
						? "Сохранить (самокурация врачом)"
						: "Закрепить куратора"}
			</button>
		</div>
	);
};
