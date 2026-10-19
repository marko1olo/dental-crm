import { CheckCircle2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export interface ActionPromptState {
	order: DentalLabWorkflowOrder;
	type: "bite_photo" | "technician_comment";
	title: string;
	label: string;
	placeholder: string;
}

export interface DentalLabOrderActionPromptProps {
	readonly actionPrompt: ActionPromptState | null;
	readonly onClose: () => void;
	readonly onSubmit: (
		order: DentalLabWorkflowOrder,
		type: "bite_photo" | "technician_comment",
		value: string,
	) => void;
}

export function DentalLabOrderActionPrompt({
	actionPrompt,
	onClose,
	onSubmit,
}: DentalLabOrderActionPromptProps) {
	const [value, setValue] = useState<string>("");

	if (!actionPrompt) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!value.trim()) return;
		onSubmit(actionPrompt.order, actionPrompt.type, value.trim());
		setValue("");
	};

	return (
		<div className="ztl-detail-overlay" data-testid="ztl-action-prompt-modal">
			<div className="ztl-detail-card" style={{ maxWidth: "480px" }}>
				<header className="ztl-detail-header">
					<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
						{actionPrompt.title}
					</h3>
					<button
						type="button"
						className="ztl-btn-icon"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={16} />
					</button>
				</header>

				<form onSubmit={handleSubmit}>
					<div className="ztl-detail-body">
						<div className="ztl-form-group">
							<label
								htmlFor="ztl-action-prompt-input"
								className="ztl-form-label"
							>
								{actionPrompt.label}
							</label>
							{actionPrompt.type === "bite_photo" ? (
								<input
									id="ztl-action-prompt-input"
									type="text"
									className="ztl-form-input"
									placeholder={actionPrompt.placeholder}
									value={value}
									onChange={(e) => setValue(e.target.value)}
									data-testid="ztl-action-prompt-input"
									required
								/>
							) : (
								<textarea
									id="ztl-action-prompt-input"
									className="ztl-form-input"
									style={{
										height: "80px",
										padding: "8px 10px",
										resize: "none",
									}}
									placeholder={actionPrompt.placeholder}
									value={value}
									onChange={(e) => setValue(e.target.value)}
									data-testid="ztl-action-prompt-input"
									required
								/>
							)}
						</div>
					</div>

					<footer className="ztl-detail-footer">
						<button
							type="button"
							className="ztl-btn-secondary"
							onClick={onClose}
							data-testid="ztl-action-prompt-cancel"
						>
							Отмена
						</button>
						<button
							type="submit"
							className="ztl-btn-primary"
							data-testid="ztl-action-prompt-submit"
						>
							<CheckCircle2 size={14} />
							<span>Сохранить</span>
						</button>
					</footer>
				</form>
			</div>
		</div>
	);
}
