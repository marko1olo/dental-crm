import type React from "react";
import { createPortal } from "react-dom";

export interface MdlpModalContainerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly children: React.ReactNode;
}

export const MdlpModalContainer: React.FC<MdlpModalContainerProps> = ({
	isOpen,
	onClose,
	children,
}) => {
	if (!isOpen) return null;

	const modalContent = (
		<div
			className="mdlp-scanning-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="mdlp-modal-title"
			data-testid="mdlp-scanning-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="mdlp-scanning-modal" data-testid="mdlp-scanning-modal-container">
				{children}
			</div>
		</div>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(modalContent, document.body);
	}

	return modalContent;
};
