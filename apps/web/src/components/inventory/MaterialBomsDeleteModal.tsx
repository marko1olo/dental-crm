import { X } from "lucide-react";
import type React from "react";

export interface MaterialBomsDeleteModalProps {
	readonly confirmDeleteId: string | null;
	readonly onClose: () => void;
	readonly onConfirm: (id: string) => void;
}

export const MaterialBomsDeleteModal: React.FC<
	MaterialBomsDeleteModalProps
> = ({ confirmDeleteId, onClose, onConfirm }) => {
	if (!confirmDeleteId) return null;

	return (
		<div className="material-boms-modal-backdrop">
			<div className="material-boms-modal" style={{ maxWidth: 420 }}>
				<div className="material-boms-modal-header">
					<h3 className="material-boms-modal-title">
						Удалить норму расхода?
					</h3>
					<button
						type="button"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
						}}
						onClick={onClose}
					>
						<X size={20} />
					</button>
				</div>
				<div className="material-boms-modal-body">
					<p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
						Вы уверены, что хотите удалить эту норму списания? При
						закрытии приёма данный материал больше не будет
						автоматически списываться со склада.
					</p>
				</div>
				<div className="material-boms-modal-footer">
					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						onClick={onClose}
					>
						Отмена
					</button>
					<button
						type="button"
						className="material-boms-btn material-boms-btn-primary"
						style={{ background: "var(--bad-fg, #dc2626)" }}
						onClick={() => onConfirm(confirmDeleteId)}
					>
						Удалить
					</button>
				</div>
			</div>
		</div>
	);
};
