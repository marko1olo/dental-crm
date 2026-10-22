import React from "react";
import { CheckCircle } from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";

interface OrthoModalFooterProps {
	insertProtocolOnSave: boolean;
	setInsertProtocolOnSave: (insert: boolean) => void;
	onInsertProtocol043: () => void;
	onClose: () => void;
	onSave: () => void;
}

export const OrthoModalFooter: React.FC<OrthoModalFooterProps> = ({
	insertProtocolOnSave,
	setInsertProtocolOnSave,
	onInsertProtocol043,
	onClose,
	onSave,
}) => {
	return (
		<footer className="ortho-modal-footer">
			<div className="ortho-footer-left">
				<label className="ortho-insert-checkbox-label min-h-[44px] inline-flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						checked={insertProtocolOnSave}
						onChange={(e) => setInsertProtocolOnSave(e.target.checked)}
						className="ortho-checkbox w-5 h-5 cursor-pointer"
						data-testid="insert-protocol-on-save-checkbox"
					/>
					<span>Вносить в дневник приёма при сохранении</span>
				</label>
				<span className="ortho-footer-ref-hint">Клинический протокол</span>
			</div>

			<div className="flex items-center gap-2.5 flex-wrap">
				<button
					type="button"
					onClick={onInsertProtocol043}
					className="secondary-button ortho-btn-insert-043 min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 py-2 sm:py-1.5 inline-flex items-center gap-2 !rounded-xl text-xs font-bold"
					title="Вставить структурированный протокол ортодонтии в дневник приёма"
					data-testid="insert-ortho-protocol-043-btn"
				>
					<DentalForm043 size={16} />
					<span>Вставить протокол ортодонтии в дневник</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="secondary-button ortho-btn-secondary min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 py-2 sm:py-1.5 inline-flex items-center justify-center !rounded-xl text-xs font-semibold"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onSave}
					className="primary-button ortho-btn-primary min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 py-2 sm:py-1.5 inline-flex items-center gap-2 !rounded-xl text-xs font-bold"
					data-testid="save-ortho-protocol-btn"
				>
					<CheckCircle size={16} />
					<span>Сохранить фотопротокол</span>
				</button>
			</div>
		</footer>
	);
};
