import React from "react";

export interface SanpinRegistryFooterProps {
	onClose: () => void;
}

export const SanpinRegistryFooter: React.FC<SanpinRegistryFooterProps> = ({ onClose }) => {
	return (
		<div className="document-package-modal-footer">
			<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
				Соответствует санитарным и клиническим стандартам
			</div>
			<button
				type="button"
				className="secondary-button"
				onClick={onClose}
			>
				Закрыть
			</button>
		</div>
	);
};
