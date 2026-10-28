import React from "react";

export interface DocumentVoidModalFooterProps {
	saving: boolean;
	ready: boolean;
	guidanceId: string;
	onClose: () => void;
	onConfirm: () => Promise<void> | void;
}

export const DocumentVoidModalFooter: React.FC<DocumentVoidModalFooterProps> = ({
	saving,
	ready,
	guidanceId,
	onClose,
	onConfirm,
}) => {
	return (
		<div className="document-issue-confirmation-actions">
			<button
				className="secondary-button"
				type="button"
				disabled={saving}
				aria-busy={saving || undefined}
				style={{ minHeight: "44px" }}
				onClick={onClose}
			>
				Вернуться
			</button>
			<button
				className="primary-button"
				type="button"
				disabled={saving}
				aria-busy={saving || undefined}
				aria-describedby={!ready ? guidanceId : undefined}
				style={{ minHeight: "44px" }}
				onClick={() => void onConfirm()}
			>
				{saving ? "Аннулирую документ" : "Аннулировать с причиной"}
			</button>
		</div>
	);
};
