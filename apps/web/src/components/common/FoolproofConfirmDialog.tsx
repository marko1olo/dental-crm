import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertOctagon, AlertTriangle, CheckCircle2, ShieldAlert, X } from "lucide-react";
import {
	type DangerousActionType,
	getDangerousActionDefinition,
} from "./foolproofDangerGuard";
import "./foolproofConfirm.css";

export interface FoolproofConfirmDialogProps {
	readonly isOpen: boolean;
	readonly actionType?: DangerousActionType | undefined;
	readonly customTitle?: string | undefined;
	readonly customMessage?: string | undefined;
	readonly customConsequences?: readonly string[] | undefined;
	readonly confirmLabel?: string | undefined;
	readonly cancelLabel?: string | undefined;
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
}

export function FoolproofConfirmDialog({
	isOpen,
	actionType = "cancel_appointment",
	customTitle,
	customMessage,
	customConsequences,
	confirmLabel,
	cancelLabel,
	onConfirm,
	onCancel,
}: FoolproofConfirmDialogProps) {
	const definition = getDangerousActionDefinition(actionType);
	const title = customTitle || definition.titleRu;
	const message = customMessage || definition.descriptionRu;
	const consequences = customConsequences || definition.consequencesRu;
	const resolvedConfirmLabel = confirmLabel || definition.confirmButtonLabelRu;
	const resolvedCancelLabel = cancelLabel || definition.cancelButtonLabelRu;

	const [isConfirmedCheckbox, setIsConfirmedCheckbox] = useState(false);
	const cancelButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (isOpen) {
			setIsConfirmedCheckbox(false);
			// Auto focus cancel button after animation
			setTimeout(() => {
				cancelButtonRef.current?.focus();
			}, 50);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const isConfirmDisabled = definition.requiresExplicitCheckbox && !isConfirmedCheckbox;

	const dialogContent = (
		<div
			className="foolproof-dialog-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="foolproof-title"
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					e.stopPropagation();
					onCancel();
				}
			}}
			data-testid="foolproof-confirm-dialog"
		>
			<div
				className={`foolproof-dialog-window severity-${definition.dangerSeverity}`}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="foolproof-title"
			>
				{/* Header */}
				<div className="foolproof-dialog-header">
					<div className={`foolproof-icon-box severity-${definition.dangerSeverity}`}>
						{definition.dangerSeverity === "critical" ? (
							<ShieldAlert size={28} />
						) : definition.dangerSeverity === "high" ? (
							<AlertTriangle size={28} />
						) : (
							<AlertOctagon size={28} />
						)}
					</div>
					<div>
						<h3 id="foolproof-title" className="foolproof-dialog-title">
							{title}
						</h3>
						<p className="foolproof-dialog-desc" style={{ marginTop: "4px" }}>
							{message}
						</p>
					</div>
				</div>

				{/* Consequences Checklist */}
				{consequences && consequences.length > 0 && (
					<div className="foolproof-consequences-box">
						<span className="foolproof-consequences-title">
							Последствия этого действия:
						</span>
						{consequences.map((c, idx) => (
							<div key={idx} className="foolproof-consequence-item">
								<span style={{ color: "#ef4444", fontWeight: "bold" }}>•</span>
								<span>{c}</span>
							</div>
						))}
					</div>
				)}

				{/* Explicit Checkbox if critical */}
				{definition.requiresExplicitCheckbox && (
					<label className="foolproof-checkbox-label">
						<input
							type="checkbox"
							checked={isConfirmedCheckbox}
							onChange={(e) => setIsConfirmedCheckbox(e.target.checked)}
							className="foolproof-checkbox-input"
						/>
						<span>Я подтверждаю выполнение этой операции</span>
					</label>
				)}

				{/* Action Buttons: Cancel is FIRST and Default Focused */}
				<div className="foolproof-actions-row">
					<button
						ref={cancelButtonRef}
						type="button"
						className="foolproof-btn-cancel"
						onClick={onCancel}
						data-testid="foolproof-cancel-btn"
					>
						<X size={18} />
						<span>{resolvedCancelLabel}</span>
					</button>

					<button
						type="button"
						className="foolproof-btn-danger"
						disabled={isConfirmDisabled}
						onClick={() => {
							onConfirm();
						}}
						data-testid="foolproof-confirm-danger-btn"
					>
						<CheckCircle2 size={18} />
						<span>{resolvedConfirmLabel}</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(dialogContent, document.body)
		: dialogContent;
}
